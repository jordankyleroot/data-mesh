"""
Kyle Corp — Logistics Producer
Publishes LogisticsShipmentDispatched every 10s,
then LogisticsDeliveryConfirmed 30s later for the same shipment.
"""

import sys
import os
import time
import random
import logging
import argparse
import uuid
import threading
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../platform/sdks/python'))

from datamesh import DataMeshProducer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger('logistics_producer')

SCHEMA_DIR = os.path.join(os.path.dirname(__file__), '../schemas')

DEPOTS = ['LAGOS-DEPOT', 'WARRI-DEPOT', 'PH-DEPOT', 'ABUJA-DEPOT']
PRODUCTS = ['DIESEL', 'PETROL', 'LPG', 'KEROSENE']
VEHICLE_IDS = [f'TRK-{i:04d}' for i in range(1, 21)]

DESTINATIONS = [
    'Plot 14 Apapa Industrial Estate, Lagos',
    'KM 5 Warri-Sapele Road, Delta',
    'Trans-Amadi Industrial Layout, Port Harcourt',
    'Kubwa District, Abuja',
    'Festac Town Distribution Centre, Lagos',
    'Onne Port Complex, Rivers State',
    'Kaduna Refinery Road, Kaduna',
    'Aba Industrial Zone, Abia State',
    'Tin Can Island Port, Lagos',
    'Onitsha Head Bridge, Anambra',
]

CUSTOMER_IDS = [f'CUST-{i:04d}' for i in range(1001, 1021)]

_stop_event = threading.Event()


def load_schema(filename):
    path = os.path.join(SCHEMA_DIR, filename)
    with open(path, 'r') as f:
        return f.read()


def now_ms():
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def make_shipment():
    product = random.choice(PRODUCTS)
    # Quantities in litres
    if product == 'LPG':
        qty = round(random.uniform(5000, 30000), 2)
    else:
        qty = round(random.uniform(10000, 60000), 2)

    shipment_id = f'SHIP-{uuid.uuid4().hex[:10].upper()}'
    order_id = f'ORD-{uuid.uuid4().hex[:8].upper()}'
    customer_id = random.choice(CUSTOMER_IDS)
    depot = random.choice(DEPOTS)
    destination = random.choice(DESTINATIONS)
    eta_hours = round(random.uniform(1.5, 12.0), 1)
    vehicle_id = random.choice(VEHICLE_IDS)

    dispatch_event = {
        'shipmentId': shipment_id,
        'orderId': order_id,
        'product': product,
        'quantityLtrs': qty,
        'vehicleId': vehicle_id,
        'originDepot': depot,
        'destination': destination,
        'customerId': customer_id,
        'etaHours': eta_hours,
        'dispatchedAt': now_ms(),
    }

    delivery_event = {
        'deliveryId': f'DEL-{uuid.uuid4().hex[:10].upper()}',
        'shipmentId': shipment_id,
        'orderId': order_id,
        'customerId': customer_id,
        'product': product,
        'quantityLtrs': qty,
        'deliveredAt': 0,  # set at delivery time
    }

    return dispatch_event, delivery_event


def schedule_delivery(producer, delivery_event, delivery_schema_str, delay_secs=30):
    """Wait delay_secs then publish the delivery confirmation."""
    def _deliver():
        if not _stop_event.is_set():
            time.sleep(delay_secs)
        if not _stop_event.is_set():
            delivery_event['deliveredAt'] = now_ms()
            producer.produce(
                topic='logistics.delivery-confirmed.critical',
                event_type='delivery-confirmed',
                payload=delivery_event,
                schema_str=delivery_schema_str,
            )
            logger.info(
                '[DELIVERY] shipmentId=%s customer=%s product=%s qty=%.0f L',
                delivery_event['shipmentId'],
                delivery_event['customerId'],
                delivery_event['product'],
                delivery_event['quantityLtrs'],
            )

    t = threading.Thread(target=_deliver, daemon=True)
    t.start()


def main():
    parser = argparse.ArgumentParser(description='Kyle Corp Logistics Producer')
    parser.add_argument('--bootstrap-servers', default='localhost:9092')
    parser.add_argument('--schema-registry-url', default='http://localhost:8081')
    parser.add_argument('--delivery-delay', type=int, default=30,
                        help='Seconds between dispatch and delivery confirmation (default: 30)')
    args = parser.parse_args()

    dispatch_schema_str  = load_schema('logistics_shipment_dispatched_v1.avsc')
    delivery_schema_str  = load_schema('logistics_delivery_confirmed_v1.avsc')

    producer = DataMeshProducer(
        bootstrap_servers=args.bootstrap_servers,
        schema_registry_url=args.schema_registry_url,
        domain="logistics",
    )

    logger.info(
        'Logistics producer started. Dispatch every 10s, delivery confirmation after %ds.',
        args.delivery_delay,
    )

    shipment_count = 0
    try:
        while True:
            dispatch_event, delivery_event = make_shipment()

            producer.produce(
                topic='logistics.shipment-dispatched.standard',
                event_type='shipment-dispatched',
                payload=dispatch_event,
                schema_str=dispatch_schema_str,
            )
            shipment_count += 1
            logger.info(
                '[DISPATCH #%d] shipmentId=%s %s from %s to %s — %.0f L, ETA=%.1fh',
                shipment_count,
                dispatch_event['shipmentId'],
                dispatch_event['product'],
                dispatch_event['originDepot'],
                dispatch_event['destination'][:40],
                dispatch_event['quantityLtrs'],
                dispatch_event['etaHours'],
            )

            # Schedule delivery confirmation after delay
            schedule_delivery(producer, delivery_event, delivery_schema_str, args.delivery_delay)

            time.sleep(10)

    except KeyboardInterrupt:
        _stop_event.set()
        logger.info('Logistics producer stopped after %d shipments.', shipment_count)
    finally:
        producer.flush()


if __name__ == '__main__':
    main()
