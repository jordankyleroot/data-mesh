"""
Kyle Corp — Crude Oil Producer
Publishes CrudeBarrelReceived and CrudeBatchProcessed events to Redpanda.
"""

import sys
import os
import time
import random
import logging
import argparse
import uuid
from datetime import datetime, timezone

# Allow importing the shared DataMesh SDK
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../platform/sdks/python'))

from datamesh import DataMeshProducer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger('crude_producer')

SCHEMA_DIR = os.path.join(os.path.dirname(__file__), '../schemas')

TANKER_IDS = [f'MT-KYLE-{i:03d}' for i in range(1, 11)]
CRUDE_GRADES = ['BRENT', 'WTI', 'BONNY_LIGHT', 'FORCADOS', 'QUA_IBOE']
ORIGIN_PORTS = [
    'Bonny Terminal, NG',
    'Forcados Terminal, NG',
    'Warri Port, NG',
    'Rotterdam, NL',
    'Sullom Voe, UK',
    'Ras Tanura, SA',
    'Houston, US',
]
DESTINATION_TANKS = [f'TANK-{chr(65+i)}{n:02d}' for i in range(4) for n in range(1, 6)]
REFINERY_IDS = ['REF-WARRI-01', 'REF-LAGOS-02', 'REF-PH-03', 'REF-KADUNA-04']

# Yield fractions per grade (approximate industry ratios)
YIELD_PROFILES = {
    'BRENT':       {'diesel': 0.38, 'petrol': 0.28, 'lpg': 0.08, 'kerosene': 0.12},
    'WTI':         {'diesel': 0.36, 'petrol': 0.32, 'lpg': 0.07, 'kerosene': 0.11},
    'BONNY_LIGHT': {'diesel': 0.40, 'petrol': 0.26, 'lpg': 0.09, 'kerosene': 0.13},
    'FORCADOS':    {'diesel': 0.39, 'petrol': 0.27, 'lpg': 0.08, 'kerosene': 0.12},
    'QUA_IBOE':    {'diesel': 0.41, 'petrol': 0.25, 'lpg': 0.10, 'kerosene': 0.14},
}


def load_schema(filename):
    path = os.path.join(SCHEMA_DIR, filename)
    with open(path, 'r') as f:
        return f.read()


def now_ms():
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def make_barrel_received_event(grade=None):
    grade = grade or random.choice(CRUDE_GRADES)
    barrels = round(random.uniform(30000, 80000), 2)
    # API gravity: light crude 35-45, medium 25-35, heavy <25
    api_gravity = round(random.uniform(28.0, 45.0), 2)
    sulfur = round(random.uniform(0.05, 2.5), 4)   # % wt; sweet <0.5, sour >0.5
    price_per_barrel = round(random.uniform(72.0, 95.0), 2)

    return {
        'batchId': f'BATCH-{uuid.uuid4().hex[:12].upper()}',
        'tankerId': random.choice(TANKER_IDS),
        'crudGrade': grade,
        'barrels': barrels,
        'apiGravity': api_gravity,
        'sulfurContent': sulfur,
        'originPort': random.choice(ORIGIN_PORTS),
        'destinationTank': random.choice(DESTINATION_TANKS),
        'pricePerBarrel': price_per_barrel,
        'receivedAt': now_ms(),
    }


def make_batch_processed_event(input_barrels=None, grade=None):
    grade = grade or random.choice(CRUDE_GRADES)
    input_barrels = input_barrels or round(random.uniform(20000, 60000), 2)
    profile = YIELD_PROFILES[grade]
    noise = lambda: random.uniform(-0.02, 0.02)

    diesel   = round(input_barrels * (profile['diesel']   + noise()), 2)
    petrol   = round(input_barrels * (profile['petrol']   + noise()), 2)
    lpg      = round(input_barrels * (profile['lpg']      + noise()), 2)
    kerosene = round(input_barrels * (profile['kerosene'] + noise()), 2)

    return {
        'batchId': f'PROC-{uuid.uuid4().hex[:12].upper()}',
        'refineryId': random.choice(REFINERY_IDS),
        'inputBarrels': input_barrels,
        'dieselYield': diesel,
        'petrolYield': petrol,
        'lpgYield': lpg,
        'keroseneYield': kerosene,
        'processedAt': now_ms(),
    }


def main():
    parser = argparse.ArgumentParser(description='Kyle Corp Crude Oil Producer')
    parser.add_argument('--bootstrap-servers', default='localhost:9092',
                        help='Kafka bootstrap servers (default: localhost:9092)')
    parser.add_argument('--schema-registry-url', default='http://localhost:8081',
                        help='Schema Registry URL (default: http://localhost:8081)')
    args = parser.parse_args()

    barrel_schema_str = load_schema('crude_barrel_received_v1.avsc')
    batch_schema_str  = load_schema('crude_batch_processed_v1.avsc')

    producer = DataMeshProducer(
        bootstrap_servers=args.bootstrap_servers,
        schema_registry_url=args.schema_registry_url,
        domain="crude",
    )

    logger.info('Crude producer started. Publishing to crude.barrel-received.critical and crude.batch-processed.critical')

    event_count = 0
    try:
        while True:
            # Decide which event to publish (roughly 50/50)
            if random.random() < 0.5:
                event = make_barrel_received_event()
                topic = 'crude.barrel-received.critical'
                schema_str = barrel_schema_str
                subject = 'crude.barrel-received-value'
            else:
                event = make_batch_processed_event()
                topic = 'crude.batch-processed.critical'
                schema_str = batch_schema_str
                subject = 'crude.batch-processed-value'

            # event_type drives the subject: domain.event_type-value
            event_type = 'barrel-received' if topic == 'crude.barrel-received.critical' else 'batch-processed'
            producer.produce(
                topic=topic,
                event_type=event_type,
                payload=event,
                schema_str=schema_str,
            )
            event_count += 1
            logger.info(
                '[%s] event #%d published to %s — batchId=%s',
                event.get('crudGrade', event.get('refineryId', 'N/A')),
                event_count,
                topic,
                event['batchId'],
            )

            sleep_secs = random.uniform(3, 8)
            time.sleep(sleep_secs)

    except KeyboardInterrupt:
        logger.info('Crude producer stopped after %d events.', event_count)
    finally:
        producer.flush()


if __name__ == '__main__':
    main()
