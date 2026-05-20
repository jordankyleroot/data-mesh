"""
Kyle Corp — Run All Producers
Launches all five Kyle Corp event producers simultaneously in separate threads.
Press Ctrl+C to stop all producers gracefully.
"""

import sys
import os
import logging
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed

# Make sure each producer module can locate the SDK
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../platform/sdks/python'))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger('run_all')


def run_crude(bootstrap_servers, schema_registry_url):
    import crude_producer
    # Patch sys.argv so argparse inside crude_producer uses our values
    sys.argv = [
        'crude_producer.py',
        '--bootstrap-servers', bootstrap_servers,
        '--schema-registry-url', schema_registry_url,
    ]
    crude_producer.main()


def run_pipeline(bootstrap_servers, schema_registry_url):
    import pipeline_producer
    sys.argv = [
        'pipeline_producer.py',
        '--bootstrap-servers', bootstrap_servers,
        '--schema-registry-url', schema_registry_url,
    ]
    pipeline_producer.main()


def run_trading(bootstrap_servers, schema_registry_url):
    import trading_producer
    sys.argv = [
        'trading_producer.py',
        '--bootstrap-servers', bootstrap_servers,
        '--schema-registry-url', schema_registry_url,
    ]
    trading_producer.main()


def run_logistics(bootstrap_servers, schema_registry_url):
    import logistics_producer
    sys.argv = [
        'logistics_producer.py',
        '--bootstrap-servers', bootstrap_servers,
        '--schema-registry-url', schema_registry_url,
    ]
    logistics_producer.main()


def run_safety(bootstrap_servers, schema_registry_url):
    import safety_producer
    sys.argv = [
        'safety_producer.py',
        '--bootstrap-servers', bootstrap_servers,
        '--schema-registry-url', schema_registry_url,
    ]
    safety_producer.main()


PRODUCERS = [
    ('crude',     run_crude),
    ('pipeline',  run_pipeline),
    ('trading',   run_trading),
    ('logistics', run_logistics),
    ('safety',    run_safety),
]


def main():
    parser = argparse.ArgumentParser(description='Kyle Corp — Run All Producers')
    parser.add_argument('--bootstrap-servers', default='localhost:9092',
                        help='Kafka bootstrap servers (default: localhost:9092)')
    parser.add_argument('--schema-registry-url', default='http://localhost:8081',
                        help='Schema Registry URL (default: http://localhost:8081)')
    args = parser.parse_args()

    # Add the producers directory to path so imports work
    producers_dir = os.path.dirname(os.path.abspath(__file__))
    if producers_dir not in sys.path:
        sys.path.insert(0, producers_dir)

    logger.info('Starting %d Kyle Corp producers...', len(PRODUCERS))
    for name, _ in PRODUCERS:
        logger.info('  -> %s', name)

    futures_map = {}

    try:
        with ThreadPoolExecutor(max_workers=len(PRODUCERS), thread_name_prefix='kc-producer') as executor:
            for name, fn in PRODUCERS:
                future = executor.submit(fn, args.bootstrap_servers, args.schema_registry_url)
                futures_map[future] = name
                logger.info('Producer "%s" submitted.', name)

            # Wait for any producer to exit (they shouldn't under normal operation)
            for future in as_completed(futures_map):
                name = futures_map[future]
                try:
                    future.result()
                    logger.info('Producer "%s" exited normally.', name)
                except KeyboardInterrupt:
                    logger.info('Producer "%s" interrupted.', name)
                except Exception as exc:
                    logger.error('Producer "%s" raised an exception: %s', name, exc, exc_info=True)

    except KeyboardInterrupt:
        logger.info('KeyboardInterrupt received — shutting down all producers...')
        # ThreadPoolExecutor context manager will wait for threads to finish
        # Individual producers handle KeyboardInterrupt and call flush()
        logger.info('All producers stopped. Goodbye.')


if __name__ == '__main__':
    main()
