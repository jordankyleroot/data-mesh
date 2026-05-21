"""
Kyle Corp — Pipeline Flow Producer
Publishes PipelineFlowUpdated events every 5 seconds and occasionally PipelineLeakAlert.
"""

import sys
import os
import time
import random
import logging
import argparse
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../platform/sdks/python'))

from datamesh import DataMeshProducer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger('pipeline_producer')

SCHEMA_DIR = os.path.join(os.path.dirname(__file__), '../schemas')

PIPELINES = [
    {'id': 'PIPE-WARRI-01',  'segments': ['SEG-W1', 'SEG-W2', 'SEG-W3'], 'base_flow': 4500.0, 'base_pressure': 950.0, 'base_temp': 42.0},
    {'id': 'PIPE-LAGOS-02',  'segments': ['SEG-L1', 'SEG-L2', 'SEG-L3'], 'base_flow': 6200.0, 'base_pressure': 1100.0,'base_temp': 45.0},
    {'id': 'PIPE-PH-03',     'segments': ['SEG-P1', 'SEG-P2'],            'base_flow': 3800.0, 'base_pressure': 880.0, 'base_temp': 40.0},
    {'id': 'PIPE-KADUNA-04', 'segments': ['SEG-K1', 'SEG-K2', 'SEG-K3'], 'base_flow': 5100.0, 'base_pressure': 1020.0,'base_temp': 38.0},
]

ALERT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']


def load_schema(filename):
    path = os.path.join(SCHEMA_DIR, filename)
    with open(path, 'r') as f:
        return f.read()


def now_ms():
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def compute_status(flow_rate, base_flow, pressure, base_pressure):
    flow_ratio = flow_rate / base_flow
    pressure_ratio = pressure / base_pressure
    if flow_ratio < 0.5 or pressure_ratio < 0.5:
        return 'SHUTDOWN'
    if flow_ratio < 0.85 or pressure_ratio < 0.80:
        return 'DEGRADED'
    return 'NORMAL'


def make_flow_event(pipeline):
    segment = random.choice(pipeline['segments'])
    # Add realistic Gaussian noise around base values
    flow_rate = round(pipeline['base_flow'] * random.gauss(1.0, 0.04), 2)
    pressure  = round(pipeline['base_pressure'] * random.gauss(1.0, 0.03), 2)
    temp      = round(pipeline['base_temp'] + random.gauss(0, 1.5), 2)
    flow_rate = max(0.0, flow_rate)
    pressure  = max(0.0, pressure)

    status = compute_status(flow_rate, pipeline['base_flow'], pressure, pipeline['base_pressure'])

    return {
        'pipelineId': pipeline['id'],
        'segmentId': segment,
        'flowRateBph': flow_rate,
        'pressurePsi': pressure,
        'tempCelsius': temp,
        'status': status,
        'recordedAt': now_ms(),
    }


def make_leak_alert(pipeline):
    segment_km = round(random.uniform(0.5, 120.0), 2)
    # Pressure drop magnitude correlates with severity
    severity = random.choice(ALERT_SEVERITIES)
    drop_map = {'LOW': (5, 25), 'MEDIUM': (25, 80), 'HIGH': (80, 200), 'CRITICAL': (200, 500)}
    lo, hi = drop_map[severity]
    pressure_drop = round(random.uniform(lo, hi), 2)
    estimated_loss = round(random.uniform(10, 500), 2)

    return {
        'alertId': f'ALERT-{uuid.uuid4().hex[:10].upper()}',
        'pipelineId': pipeline['id'],
        'segmentKm': segment_km,
        'pressureDrop': pressure_drop,
        'severity': severity,
        'estimatedLossBarrels': estimated_loss,
        'detectedAt': now_ms(),
    }


def main():
    parser = argparse.ArgumentParser(description='Kyle Corp Pipeline Flow Producer')
    parser.add_argument('--bootstrap-servers', default='localhost:9092')
    parser.add_argument('--schema-registry-url', default='http://localhost:8081')
    args = parser.parse_args()

    flow_schema_str  = load_schema('pipeline_flow_updated_v1.avsc')
    alert_schema_str = load_schema('pipeline_leak_alert_v1.avsc')

    producer = DataMeshProducer(
        bootstrap_servers=args.bootstrap_servers,
        schema_registry_url=args.schema_registry_url,
        domain="pipeline",
    )

    logger.info('Pipeline producer started. Publishing flow updates every 5s, leak alerts at ~5%% probability.')

    event_count = 0
    try:
        while True:
            for pipeline in PIPELINES:
                # Publish flow update for this pipeline
                flow_event = make_flow_event(pipeline)
                producer.produce(
                    topic='pipeline.flow-updated.standard',
                    event_type='flow-updated',
                    payload=flow_event,
                    schema_str=flow_schema_str,
                )
                event_count += 1
                logger.info(
                    '[FLOW] %s/%s — flow=%.1f bph, pressure=%.1f psi, status=%s',
                    flow_event['pipelineId'],
                    flow_event['segmentId'],
                    flow_event['flowRateBph'],
                    flow_event['pressurePsi'],
                    flow_event['status'],
                )

                # 5% chance of leak alert per pipeline per cycle
                if random.random() < 0.05:
                    alert = make_leak_alert(pipeline)
                    producer.produce(
                        topic='pipeline.leak-alert.critical',
                        event_type='leak-alert',
                        payload=alert,
                        schema_str=alert_schema_str,
                    )
                    event_count += 1
                    logger.warning(
                        '[LEAK ALERT] %s @km %.1f — severity=%s, pressure_drop=%.1f psi, est_loss=%.1f bbl',
                        alert['pipelineId'],
                        alert['segmentKm'],
                        alert['severity'],
                        alert['pressureDrop'],
                        alert['estimatedLossBarrels'],
                    )

            time.sleep(5)

    except KeyboardInterrupt:
        logger.info('Pipeline producer stopped after %d events.', event_count)
    finally:
        producer.flush()


if __name__ == '__main__':
    main()
