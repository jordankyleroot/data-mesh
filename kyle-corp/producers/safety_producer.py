"""
Kyle Corp — Safety Incident Producer
Every 60 seconds has a 20% chance of publishing a SafetyIncidentReported event.
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
logger = logging.getLogger('safety_producer')

SCHEMA_DIR = os.path.join(os.path.dirname(__file__), '../schemas')

INCIDENT_TYPES = ['SPILL', 'FIRE', 'INJURY', 'NEAR_MISS', 'EQUIPMENT_FAILURE']
SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
SEVERITY_WEIGHTS = [0.40, 0.35, 0.18, 0.07]   # Mostly low/medium, rare critical

LOCATIONS = [
    'Warri Refinery — Crude Distillation Unit 2',
    'Lagos Terminal — Tank Farm Area B',
    'Port Harcourt Refinery — FCC Unit',
    'Kaduna Refinery — Pipestill 3',
    'Escravos Pipeline — KM 47 Crossing',
    'Trans-Niger Pipeline — Pump Station 4',
    'Bonny Export Terminal — Loading Jetty 1',
    'Forcados Offshore Terminal — FPSO Deck',
    'Aba Depot — Truck Loading Rack',
    'Abuja Distribution Centre — LPG Storage',
    'Warri-Sapele Pipeline — Valve Station 6',
    'Lagos Offshore Buoy — Mooring Area',
    'Onitsha Depot — Diesel Storage Tank 3',
    'Kaduna Pipeline — Compressor Station 2',
]

REPORTERS = [
    'HSE-OFR-001', 'HSE-OFR-002', 'HSE-OFR-003', 'HSE-OFR-004',
    'OPS-CTRL-01', 'OPS-CTRL-02', 'SHIFT-MGR-01', 'SHIFT-MGR-02',
    'SAFETY-SUPR-01', 'PIPELINE-INSP-03',
]

# Realistic descriptions per incident type
DESCRIPTIONS = {
    'SPILL': [
        'Minor crude oil seepage detected at flange connection during routine inspection. Containment berm activated.',
        'Approximately {barrels:.1f} barrels of diesel released from corroded valve gland. OSCP team deployed.',
        'Pipeline weld failure caused product release. Emergency isolation valves closed. Environmental team notified.',
        'Tank overfill incident during transfer operation. Approximately {barrels:.1f} barrels of petrol spilled on bund.',
        'Crude oil leak from pig trap seal after pigging operation. Affected area isolated and absorbent deployed.',
    ],
    'FIRE': [
        'Small hydrocarbon fire on pump seal at crude distillation unit. Extinguished by automatic deluge system.',
        'Flash fire during hot-work permit violation near fuel gas header. No injuries. Investigation underway.',
        'Electrical fire in MCC room adjacent to crude storage. Fire suppression activated. Power isolated.',
        'Flare stack malfunction caused ground-level ignition. Emergency shutdown initiated. All personnel accounted for.',
        'LPG vapour cloud ignition during tanker loading. Emergency response team contained fire within 12 minutes.',
    ],
    'INJURY': [
        '{injured} worker(s) suffered {severity}-severity burns during steam-line maintenance. Transported to clinic.',
        'Slip and fall incident on wet grating near heat exchanger. {injured} operator sustained fracture. First aid administered.',
        '{injured} contractor struck by falling equipment during crane lift over pipe rack. Hard-barricade area established.',
        'Chemical splash (caustic soda) to eyes of {injured} laboratory technician. Eye-wash station used. Referred to hospital.',
        '{injured} worker sustained crush injury during blind flange bolt torquing. STOP-work authority invoked.',
    ],
    'NEAR_MISS': [
        'Line-of-fire hazard identified: worker stood in valve-actuation zone during pressurised operation. No injury.',
        'Incorrect valve operated during tank switching, potential cross-contamination avoided by alert operator.',
        'Loss of primary containment narrowly avoided: loose sight-glass found during pre-shift walkdown.',
        'Unauthorised vehicle access to hydrogen area detected by CCTV. Security response initiated.',
        'Dropped object (spanner) from scaffold at 8m height. No personnel below; hazard escalated to engineering.',
    ],
    'EQUIPMENT_FAILURE': [
        'Centrifugal pump bearing failure on crude charge pump. Standby unit started. Maintenance team mobilised.',
        'Heat exchanger tube bundle perforation detected via pressure monitoring. Unit isolated for inspection.',
        'Emergency shutdown valve failed to operate during ESD test. Production deferred pending investigation.',
        'Level transmitter malfunction caused spurious high-level alarm on crude storage tank. Instrument replaced.',
        'Compressor surging on gas-lift unit. Automatic surge-control activated. Output reduced by 15%.',
    ],
}


def load_schema(filename):
    path = os.path.join(SCHEMA_DIR, filename)
    with open(path, 'r') as f:
        return f.read()


def now_ms():
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def make_incident():
    inc_type = random.choice(INCIDENT_TYPES)
    severity = random.choices(SEVERITIES, weights=SEVERITY_WEIGHTS, k=1)[0]

    # Pick and render a description
    desc_template = random.choice(DESCRIPTIONS[inc_type])
    barrels_spilled = None
    injured_count = None

    if inc_type == 'SPILL':
        barrels_spilled = round(random.uniform(0.5, 200.0), 2)
        desc = desc_template.replace('{barrels:.1f}', f'{barrels_spilled:.1f}')
    elif inc_type == 'INJURY':
        injured_count = random.randint(1, 4)
        desc = (desc_template
                .replace('{injured}', str(injured_count))
                .replace('{severity}', severity.lower()))
    else:
        desc = desc_template

    return {
        'incidentId': f'INC-{uuid.uuid4().hex[:10].upper()}',
        'type': inc_type,
        'severity': severity,
        'location': random.choice(LOCATIONS),
        'description': desc,
        'reportedBy': random.choice(REPORTERS),
        'barrelsSpilled': barrels_spilled,
        'injuredCount': injured_count,
        'reportedAt': now_ms(),
    }


def main():
    parser = argparse.ArgumentParser(description='Kyle Corp Safety Incident Producer')
    parser.add_argument('--bootstrap-servers', default='localhost:9092')
    parser.add_argument('--schema-registry-url', default='http://localhost:8081')
    parser.add_argument('--interval', type=int, default=60,
                        help='Check interval in seconds (default: 60)')
    parser.add_argument('--probability', type=float, default=0.20,
                        help='Probability of incident per interval (default: 0.20)')
    args = parser.parse_args()

    incident_schema_str = load_schema('safety_incident_reported_v1.avsc')

    producer = DataMeshProducer(
        bootstrap_servers=args.bootstrap_servers,
        schema_registry_url=args.schema_registry_url,
        domain="safety",
    )

    logger.info(
        'Safety producer started. Checking every %ds with %.0f%% incident probability.',
        args.interval, args.probability * 100,
    )

    incident_count = 0
    cycle = 0
    try:
        while True:
            time.sleep(args.interval)
            cycle += 1

            if random.random() < args.probability:
                incident = make_incident()
                producer.produce(
                    topic='safety.incident-reported.critical',
                    event_type='incident-reported',
                    payload=incident,
                    schema_str=incident_schema_str,
                )
                incident_count += 1
                logger.warning(
                    '[INCIDENT #%d] cycle=%d type=%s severity=%s location="%s"',
                    incident_count, cycle,
                    incident['type'],
                    incident['severity'],
                    incident['location'],
                )
            else:
                logger.info('[SAFETY] Cycle %d — no incident this interval.', cycle)

    except KeyboardInterrupt:
        logger.info('Safety producer stopped. Total incidents published: %d', incident_count)
    finally:
        producer.flush()


if __name__ == '__main__':
    main()
