"""
Kyle Corp — All Consumers
Subscribes to all Kyle Corp Kafka topics and materialises events into ClickHouse.
Runs until KeyboardInterrupt.
"""

import sys
import os
import time
import logging
import argparse
import threading
from datetime import datetime, timezone

import clickhouse_connect

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../platform/sdks/python'))

from datamesh import DataMeshConsumer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger('all_consumers')

# ─── DDL ────────────────────────────────────────────────────────────────────

DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS kc_crude_throughput (
        batchId      String,
        refineryId   String,
        inputBarrels Float64,
        dieselYield  Float64,
        petrolYield  Float64,
        lpgYield     Float64,
        keroseneYield Float64,
        processedAt  DateTime64(3,'UTC')
    ) ENGINE = ReplacingMergeTree(processedAt)
    ORDER BY batchId
    """,
    """
    CREATE TABLE IF NOT EXISTS kc_pipeline_status (
        pipelineId  String,
        segmentId   String,
        flowRateBph Float64,
        pressurePsi Float64,
        status      String,
        recordedAt  DateTime64(3,'UTC')
    ) ENGINE = ReplacingMergeTree(recordedAt)
    ORDER BY (pipelineId, segmentId)
    """,
    """
    CREATE TABLE IF NOT EXISTS kc_deals (
        dealId       String,
        traderId     String,
        product      String,
        side         String,
        quantity     Float64,
        priceUsd     Float64,
        counterparty String,
        executedAt   DateTime64(3,'UTC')
    ) ENGINE = MergeTree()
    ORDER BY executedAt
    """,
    """
    CREATE TABLE IF NOT EXISTS kc_deliveries (
        deliveryId   String,
        orderId      String,
        customerId   String,
        product      String,
        quantityLtrs Float64,
        deliveredAt  DateTime64(3,'UTC')
    ) ENGINE = MergeTree()
    ORDER BY deliveredAt
    """,
    """
    CREATE TABLE IF NOT EXISTS kc_incidents (
        incidentId    String,
        type          String,
        severity      String,
        location      String,
        description   String,
        barrelsSpilled Nullable(Float64),
        injuredCount   Nullable(Int32),
        reportedAt    DateTime64(3,'UTC')
    ) ENGINE = MergeTree()
    ORDER BY reportedAt
    """,
    """
    CREATE TABLE IF NOT EXISTS kc_invoices (
        invoiceId  String,
        orderId    String,
        customerId String,
        product    String,
        amountUsd  Float64,
        totalUsd   Float64,
        raisedAt   DateTime64(3,'UTC')
    ) ENGINE = MergeTree()
    ORDER BY raisedAt
    """,
]

# ─── Helpers ─────────────────────────────────────────────────────────────────

def avro_ts_to_datetime(value):
    """
    Convert Avro timestamp-millis value to a timezone-aware datetime.
    The Avro Python library may return:
      - an int (epoch milliseconds)
      - a datetime.datetime (already converted by the library)
    Always return a UTC-aware datetime.datetime.
    """
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000.0, tz=timezone.utc)
    raise TypeError(f'Cannot convert timestamp value of type {type(value)}: {value!r}')


# ─── Materialisers ────────────────────────────────────────────────────────────

def materialise_crude_batch(ch_client, msg):
    """kc_crude_throughput <- CrudeBatchProcessed"""
    processed_at = avro_ts_to_datetime(msg['processedAt'])
    ch_client.insert(
        'kc_crude_throughput',
        [[
            msg['batchId'],
            msg['refineryId'],
            float(msg['inputBarrels']),
            float(msg['dieselYield']),
            float(msg['petrolYield']),
            float(msg['lpgYield']),
            float(msg['keroseneYield']),
            processed_at,
        ]],
        column_names=[
            'batchId', 'refineryId', 'inputBarrels',
            'dieselYield', 'petrolYield', 'lpgYield', 'keroseneYield',
            'processedAt',
        ],
    )
    logger.info('[CH] kc_crude_throughput <- batchId=%s refinery=%s input=%.1f bbl',
                msg['batchId'], msg['refineryId'], msg['inputBarrels'])


def materialise_pipeline_status(ch_client, msg):
    """kc_pipeline_status <- PipelineFlowUpdated"""
    recorded_at = avro_ts_to_datetime(msg['recordedAt'])
    ch_client.insert(
        'kc_pipeline_status',
        [[
            msg['pipelineId'],
            msg['segmentId'],
            float(msg['flowRateBph']),
            float(msg['pressurePsi']),
            str(msg['status']),
            recorded_at,
        ]],
        column_names=['pipelineId', 'segmentId', 'flowRateBph', 'pressurePsi', 'status', 'recordedAt'],
    )
    logger.info('[CH] kc_pipeline_status <- %s/%s status=%s flow=%.1f bph',
                msg['pipelineId'], msg['segmentId'], msg['status'], msg['flowRateBph'])


def materialise_deal(ch_client, msg):
    """kc_deals <- TradingDealExecuted"""
    executed_at = avro_ts_to_datetime(msg['executedAt'])
    ch_client.insert(
        'kc_deals',
        [[
            msg['dealId'],
            msg['traderId'],
            str(msg['product']),
            str(msg['side']),
            float(msg['quantity']),
            float(msg['priceUsd']),
            msg['counterparty'],
            executed_at,
        ]],
        column_names=['dealId', 'traderId', 'product', 'side', 'quantity', 'priceUsd', 'counterparty', 'executedAt'],
    )
    logger.info('[CH] kc_deals <- dealId=%s %s %s qty=%.0f @ %.4f USD',
                msg['dealId'], msg['side'], msg['product'], msg['quantity'], msg['priceUsd'])


def materialise_delivery(ch_client, msg):
    """kc_deliveries <- LogisticsDeliveryConfirmed"""
    delivered_at = avro_ts_to_datetime(msg['deliveredAt'])
    ch_client.insert(
        'kc_deliveries',
        [[
            msg['deliveryId'],
            msg['orderId'],
            msg['customerId'],
            msg['product'],
            float(msg['quantityLtrs']),
            delivered_at,
        ]],
        column_names=['deliveryId', 'orderId', 'customerId', 'product', 'quantityLtrs', 'deliveredAt'],
    )
    logger.info('[CH] kc_deliveries <- deliveryId=%s customer=%s product=%s qty=%.0f L',
                msg['deliveryId'], msg['customerId'], msg['product'], msg['quantityLtrs'])


def materialise_incident(ch_client, msg):
    """kc_incidents <- SafetyIncidentReported"""
    reported_at = avro_ts_to_datetime(msg['reportedAt'])
    barrels = msg.get('barrelsSpilled')
    injured = msg.get('injuredCount')
    # Avro union fields may be wrapped: {"double": 12.3} or just None
    if isinstance(barrels, dict):
        barrels = list(barrels.values())[0]
    if isinstance(injured, dict):
        injured = list(injured.values())[0]

    ch_client.insert(
        'kc_incidents',
        [[
            msg['incidentId'],
            str(msg['type']),
            str(msg['severity']),
            msg['location'],
            msg['description'],
            float(barrels) if barrels is not None else None,
            int(injured) if injured is not None else None,
            reported_at,
        ]],
        column_names=[
            'incidentId', 'type', 'severity', 'location', 'description',
            'barrelsSpilled', 'injuredCount', 'reportedAt',
        ],
    )
    logger.warning('[CH] kc_incidents <- incidentId=%s type=%s severity=%s location="%s"',
                   msg['incidentId'], msg['type'], msg['severity'], msg['location'])


def materialise_invoice(ch_client, msg):
    """kc_invoices <- FinanceInvoiceRaised"""
    raised_at = avro_ts_to_datetime(msg['raisedAt'])
    ch_client.insert(
        'kc_invoices',
        [[
            msg['invoiceId'],
            msg['orderId'],
            msg['customerId'],
            msg['product'],
            float(msg['amountUsd']),
            float(msg['totalUsd']),
            raised_at,
        ]],
        column_names=['invoiceId', 'orderId', 'customerId', 'product', 'amountUsd', 'totalUsd', 'raisedAt'],
    )
    logger.info('[CH] kc_invoices <- invoiceId=%s customer=%s total=%.2f USD',
                msg['invoiceId'], msg['customerId'], msg['totalUsd'])


# ─── Topic config ─────────────────────────────────────────────────────────────

def build_topic_config(ch_client):
    """Return list of (topic, group_id, handler_fn) tuples."""
    return [
        ('crude.batch-processed.critical',         'kc-consumer-crude',     lambda m: materialise_crude_batch(ch_client, m)),
        ('pipeline.flow-updated.standard',          'kc-consumer-pipeline',  lambda m: materialise_pipeline_status(ch_client, m)),
        ('trading.deal-executed.critical',          'kc-consumer-trading',   lambda m: materialise_deal(ch_client, m)),
        ('logistics.delivery-confirmed.critical',   'kc-consumer-logistics', lambda m: materialise_delivery(ch_client, m)),
        ('safety.incident-reported.critical',       'kc-consumer-safety',    lambda m: materialise_incident(ch_client, m)),
        ('finance.invoice-raised.standard',         'kc-consumer-finance',   lambda m: materialise_invoice(ch_client, m)),
    ]


# ─── Consumer worker ──────────────────────────────────────────────────────────

def consume_topic(topic, group_id, handler, bootstrap_servers, schema_registry_url, stop_event):
    logger.info('Consumer thread starting: topic=%s group=%s', topic, group_id)
    consumer = DataMeshConsumer(
        bootstrap_servers=bootstrap_servers,
        schema_registry_url=schema_registry_url,
        group_id=group_id,
        topics=[topic],
        auto_offset_reset='latest',
    )
    try:
        while not stop_event.is_set():
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            try:
                handler(msg)
            except Exception as exc:
                logger.error('Handler error for topic %s: %s', topic, exc, exc_info=True)
    except Exception as exc:
        logger.error('Consumer thread error for topic %s: %s', topic, exc, exc_info=True)
    finally:
        consumer.close()
        logger.info('Consumer thread stopped: topic=%s', topic)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Kyle Corp All Consumers')
    parser.add_argument('--bootstrap-servers', default='localhost:9092')
    parser.add_argument('--schema-registry-url', default='http://localhost:8081')
    parser.add_argument('--clickhouse-host', default='localhost')
    parser.add_argument('--clickhouse-port', type=int, default=8123)
    parser.add_argument('--clickhouse-database', default='datamesh')
    parser.add_argument('--clickhouse-user', default='default')
    parser.add_argument('--clickhouse-password', default='')
    args = parser.parse_args()

    # Connect to ClickHouse
    logger.info('Connecting to ClickHouse at %s:%d/%s', args.clickhouse_host, args.clickhouse_port, args.clickhouse_database)
    ch_client = clickhouse_connect.get_client(
        host=args.clickhouse_host,
        port=args.clickhouse_port,
        database=args.clickhouse_database,
        username=args.clickhouse_user,
        password=args.clickhouse_password,
    )

    # Create tables
    for ddl in DDL_STATEMENTS:
        ch_client.command(ddl.strip())
    logger.info('ClickHouse tables verified/created.')

    topic_configs = build_topic_config(ch_client)
    stop_event = threading.Event()
    threads = []

    for topic, group_id, handler in topic_configs:
        t = threading.Thread(
            target=consume_topic,
            args=(topic, group_id, handler, args.bootstrap_servers, args.schema_registry_url, stop_event),
            name=f'consumer-{topic}',
            daemon=True,
        )
        t.start()
        threads.append(t)

    logger.info('All %d consumer threads started. Press Ctrl+C to stop.', len(threads))

    try:
        while True:
            time.sleep(1)
            alive = sum(1 for t in threads if t.is_alive())
            if alive == 0:
                logger.warning('All consumer threads have exited. Shutting down.')
                break
    except KeyboardInterrupt:
        logger.info('KeyboardInterrupt received. Stopping consumers...')
        stop_event.set()

    for t in threads:
        t.join(timeout=10)
    logger.info('All consumers stopped. Goodbye.')


if __name__ == '__main__':
    main()
