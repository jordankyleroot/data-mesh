"""
Kyle Corp — Schema Registration Script
Registers all 11 Kyle Corp Avro schemas with the Schema Registry
and sets FULL_TRANSITIVE compatibility on each subject.

Subject naming convention:
  namespace last-segment + "." + event-name-in-kebab + "-value"
  e.g. com.kylecorp.crude / crude_barrel_received_v1.avsc
       -> domain = "crude"
       -> event  = "barrel-received"
       -> subject = "crude.barrel-received-value"
"""

import sys
import os
import json
import argparse

# Allow importing the shared DataMesh SDK
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../platform/sdks/python'))

from datamesh import SchemaRegistryClient

SCHEMA_DIR = os.path.join(os.path.dirname(__file__), 'schemas')

# Explicit mapping: filename -> (namespace_last_segment, event_kebab_name)
# This avoids any ambiguity from filename parsing.
SCHEMA_REGISTRY_MAP = {
    'crude_barrel_received_v1.avsc':          ('crude',     'barrel-received'),
    'crude_batch_processed_v1.avsc':          ('crude',     'batch-processed'),
    'pipeline_flow_updated_v1.avsc':          ('pipeline',  'flow-updated'),
    'pipeline_leak_alert_v1.avsc':            ('pipeline',  'leak-alert'),
    'trading_deal_executed_v1.avsc':          ('trading',   'deal-executed'),
    'trading_price_tick_v1.avsc':             ('trading',   'price-tick'),
    'logistics_shipment_dispatched_v1.avsc':  ('logistics', 'shipment-dispatched'),
    'logistics_delivery_confirmed_v1.avsc':   ('logistics', 'delivery-confirmed'),
    'safety_incident_reported_v1.avsc':       ('safety',    'incident-reported'),
    'finance_invoice_raised_v1.avsc':         ('finance',   'invoice-raised'),
    'customer_order_placed_v1.avsc':          ('customer',  'order-placed'),
}


def build_subject(domain, event_kebab):
    return f'{domain}.{event_kebab}-value'


def load_schema(filename):
    path = os.path.join(SCHEMA_DIR, filename)
    with open(path, 'r') as f:
        content = f.read()
    # Validate it's parseable JSON
    json.loads(content)
    return content


def main():
    parser = argparse.ArgumentParser(description='Kyle Corp Schema Registration')
    parser.add_argument('--schema-registry-url', default='http://localhost:8081',
                        help='Schema Registry URL (default: http://localhost:8081)')
    parser.add_argument('--compatibility', default='FULL_TRANSITIVE',
                        choices=['BACKWARD', 'BACKWARD_TRANSITIVE', 'FORWARD', 'FORWARD_TRANSITIVE',
                                 'FULL', 'FULL_TRANSITIVE', 'NONE'],
                        help='Compatibility level to set on each subject (default: FULL_TRANSITIVE)')
    args = parser.parse_args()

    client = SchemaRegistryClient(args.schema_registry_url)

    print(f'Schema Registry: {args.schema_registry_url}')
    print(f'Compatibility:   {args.compatibility}')
    print(f'Schemas dir:     {SCHEMA_DIR}')
    print('-' * 60)

    registered = 0
    errors = 0

    for filename, (domain, event_kebab) in SCHEMA_REGISTRY_MAP.items():
        subject = build_subject(domain, event_kebab)
        try:
            schema_str = load_schema(filename)
        except FileNotFoundError:
            print(f'  [ERROR] File not found: {filename}')
            errors += 1
            continue
        except json.JSONDecodeError as exc:
            print(f'  [ERROR] Invalid JSON in {filename}: {exc}')
            errors += 1
            continue

        try:
            # register() sets compatibility AND registers in one call
            schema_id = client.register(
                subject=subject,
                schema=json.loads(schema_str),
                compatibility=args.compatibility,
            )

            print(f'  {filename} -> {subject}  (id={schema_id}, compat={args.compatibility})')
            registered += 1

        except Exception as exc:
            print(f'  [ERROR] Failed to register {subject}: {exc}')
            errors += 1

    print('-' * 60)
    print(f'Done. Registered: {registered}  Errors: {errors}')
    if errors:
        sys.exit(1)


if __name__ == '__main__':
    main()
