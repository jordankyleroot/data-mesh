"""
Sample orders producer — publishes synthetic OrderPlaced events.

Usage:
  pip install datamesh-sdk
  python orders_producer.py --count 100 --interval 0.1
"""

import argparse
import json
import logging
import random
import time
import uuid
from pathlib import Path

from datamesh import DataMeshProducer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SCHEMA_PATH = Path(__file__).parent.parent.parent / "schemas" / "order_placed_v1.avsc"
TOPIC = "orders.order-placed.critical"

SKUS = ["SKU-001", "SKU-002", "SKU-003", "SKU-004", "SKU-005", "SKU-006"]
CHANNELS = ["WEB", "MOBILE", "POS", "API"]


def make_order() -> dict:
    items = [
        {
            "sku": random.choice(SKUS),
            "qty": random.randint(1, 5),
            "unitPrice": round(random.uniform(5.0, 500.0), 2),
        }
        for _ in range(random.randint(1, 4))
    ]
    total = sum(i["qty"] * i["unitPrice"] for i in items)
    return {
        "orderId": str(uuid.uuid4()),
        "userId": str(uuid.uuid4()),
        "items": items,
        "total": round(total, 2),
        "currency": "USD",
        "channel": random.choice(CHANNELS),
        "status": "PLACED",
        "createdAt": int(time.time() * 1000),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bootstrap-servers", default="localhost:9092")
    parser.add_argument("--schema-registry-url", default="http://localhost:8081")
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--interval", type=float, default=1.0, help="Seconds between events")
    args = parser.parse_args()

    schema_str = SCHEMA_PATH.read_text()

    with DataMeshProducer(
        bootstrap_servers=args.bootstrap_servers,
        schema_registry_url=args.schema_registry_url,
        domain="orders",
    ) as producer:
        for i in range(args.count):
            order = make_order()
            producer.produce(
                topic=TOPIC,
                event_type="order-placed",
                payload=order,
                schema_str=schema_str,
                key=order["orderId"],
            )
            logger.info("Published orderId=%s total=%.2f", order["orderId"], order["total"])
            if args.interval > 0:
                time.sleep(args.interval)

        logger.info("Flushing...")
    logger.info("Done — published %d events.", args.count)


if __name__ == "__main__":
    main()
