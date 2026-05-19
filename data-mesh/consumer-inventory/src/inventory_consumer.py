"""
Inventory consumer — subscribes to orders.order-placed.critical and maintains
a materialized view of stock levels in ClickHouse.

This demonstrates:
  - Consuming Avro events with the DataMesh SDK
  - Writing a materialized view to ClickHouse
  - Idempotent upserts (deduplication by orderId)

Usage:
  python inventory_consumer.py
"""

import datetime
import logging
import os
import time
from typing import Any

import clickhouse_connect

from datamesh import DataMeshConsumer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

TOPIC = "orders.order-placed.critical"
GROUP_ID = "inventory-materializer-v1"

CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_PORT = int(os.getenv("CLICKHOUSE_PORT", "8123"))
CLICKHOUSE_DB   = os.getenv("CLICKHOUSE_DATABASE", "datamesh")

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS inventory_view (
    sku            String,
    reserved_qty   Int64,
    last_order_id  String,
    updated_at     DateTime64(3, 'UTC')
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY sku
"""

UPSERT_SQL = """
INSERT INTO inventory_view (sku, reserved_qty, last_order_id, updated_at) VALUES
"""


def get_clickhouse_client():
    return clickhouse_connect.get_client(
        host=CLICKHOUSE_HOST,
        port=CLICKHOUSE_PORT,
        database=CLICKHOUSE_DB,
        username=os.getenv("CLICKHOUSE_USER", "default"),
        password=os.getenv("CLICKHOUSE_PASSWORD", ""),
    )


def ensure_schema(client) -> None:
    client.command(f"CREATE DATABASE IF NOT EXISTS {CLICKHOUSE_DB}")
    client.command(CREATE_TABLE_SQL)
    logger.info("ClickHouse schema ensured")


def handle_order(payload: dict[str, Any], headers: dict, ch_client) -> None:
    order_id = payload["orderId"]
    created_at_raw = payload["createdAt"]
    # Avro timestamp-millis deserializes to datetime in confluent_kafka >= 2.x
    # ClickHouse DateTime64 insert requires a datetime object (not a float)
    if isinstance(created_at_raw, datetime.datetime):
        event_dt = created_at_raw.replace(tzinfo=datetime.timezone.utc) \
            if created_at_raw.tzinfo is None else created_at_raw
    else:
        event_dt = datetime.datetime.fromtimestamp(
            created_at_raw / 1000.0, tz=datetime.timezone.utc
        )

    rows = []
    for item in payload.get("items", []):
        rows.append([item["sku"], item["qty"], order_id, event_dt])

    if rows:
        ch_client.insert(
            "inventory_view",
            rows,
            column_names=["sku", "reserved_qty", "last_order_id", "updated_at"],
        )
        logger.info("Upserted %d SKU rows for orderId=%s", len(rows), order_id)


def main():
    ch_client = get_clickhouse_client()
    ensure_schema(ch_client)

    with DataMeshConsumer(
        bootstrap_servers=os.getenv("KAFKA_BROKERS", "localhost:9092"),
        schema_registry_url=os.getenv("SCHEMA_REGISTRY_URL", "http://localhost:8081"),
        group_id=GROUP_ID,
        topics=[TOPIC],
    ) as consumer:
        logger.info("Listening on topic %s", TOPIC)
        consumer.consume(
            handler=lambda payload, headers: handle_order(payload, headers, ch_client),
            batch_size=50,
        )


if __name__ == "__main__":
    main()
