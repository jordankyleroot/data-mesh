"""
Kyle Corp — Trading Producer
Publishes TradingPriceTick every 2 seconds and TradingDealExecuted every 15 seconds.
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
logger = logging.getLogger('trading_producer')

SCHEMA_DIR = os.path.join(os.path.dirname(__file__), '../schemas')

TRADER_IDS = [f'TRD-{i:03d}' for i in range(1, 6)]
TRADING_PRODUCTS = ['BRENT_CRUDE', 'WTI_CRUDE', 'DIESEL', 'PETROL', 'LPG', 'KEROSENE']
TRADE_SIDES = ['BUY', 'SELL']
COUNTERPARTIES = [
    'Shell Trading International',
    'BP Oil International',
    'TotalEnergies Trading',
    'Vitol Group',
    'Trafigura',
    'Glencore Energy',
    'NNPC Trading',
    'Mercuria Energy',
]

# Base mid prices
BASE_PRICES = {
    'BRENT_CRUDE': 85.00,
    'WTI_CRUDE':   82.00,
    'DIESEL':       1.20,
    'PETROL':       1.00,
    'LPG':          0.80,
    'KEROSENE':     0.95,
}

# Spread (half-spread) per product
SPREADS = {
    'BRENT_CRUDE': 0.08,
    'WTI_CRUDE':   0.07,
    'DIESEL':      0.005,
    'PETROL':      0.004,
    'LPG':         0.003,
    'KEROSENE':    0.004,
}

# Track current mid prices so they drift realistically
current_prices = dict(BASE_PRICES)
# Track 24h change (cumulative drift from base for demo)
price_changes = {p: 0.0 for p in BASE_PRICES}


def load_schema(filename):
    path = os.path.join(SCHEMA_DIR, filename)
    with open(path, 'r') as f:
        return f.read()


def now_ms():
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def make_price_tick(product):
    global current_prices, price_changes

    # Apply ±0.5% random walk
    change_pct = random.uniform(-0.005, 0.005)
    old_price = current_prices[product]
    new_mid = round(old_price * (1 + change_pct), 5)
    current_prices[product] = new_mid

    # Track cumulative change from base for change24h field
    price_changes[product] = round(
        ((new_mid - BASE_PRICES[product]) / BASE_PRICES[product]) * 100, 4
    )

    spread = SPREADS[product]
    bid = round(new_mid - spread, 5)
    ask = round(new_mid + spread, 5)

    return {
        'product': product,
        'bidPrice': bid,
        'askPrice': ask,
        'midPrice': round(new_mid, 5),
        'change24h': price_changes[product],
        'tickAt': now_ms(),
    }


def make_deal_executed():
    product = random.choice(TRADING_PRODUCTS)
    side = random.choice(TRADE_SIDES)
    mid = current_prices[product]

    # Deal price near current mid with slight slippage
    slippage = random.uniform(-0.002, 0.002)
    price = round(mid * (1 + slippage), 5)

    # Quantity depends on product (crude in barrels, refined in volume-equivalent)
    if product in ('BRENT_CRUDE', 'WTI_CRUDE'):
        qty = round(random.uniform(5000, 100000), 0)
    else:
        qty = round(random.uniform(50000, 500000), 0)

    return {
        'dealId': f'DEAL-{uuid.uuid4().hex[:10].upper()}',
        'traderId': random.choice(TRADER_IDS),
        'product': product,
        'side': side,
        'quantity': qty,
        'priceUsd': price,
        'counterparty': random.choice(COUNTERPARTIES),
        'executedAt': now_ms(),
    }


def main():
    parser = argparse.ArgumentParser(description='Kyle Corp Trading Producer')
    parser.add_argument('--bootstrap-servers', default='localhost:9092')
    parser.add_argument('--schema-registry-url', default='http://localhost:8081')
    args = parser.parse_args()

    tick_schema_str = load_schema('trading_price_tick_v1.avsc')
    deal_schema_str = load_schema('trading_deal_executed_v1.avsc')

    producer = DataMeshProducer(
        bootstrap_servers=args.bootstrap_servers,
        schema_registry_url=args.schema_registry_url,
        domain="trading",
    )

    logger.info('Trading producer started. Price ticks every 2s, deals every 15s.')

    tick_count = 0
    deal_count = 0
    last_deal_time = time.time()

    try:
        while True:
            loop_start = time.time()

            # Publish a price tick for each product
            for product in TRADING_PRODUCTS:
                tick = make_price_tick(product)
                producer.produce(
                    topic='trading.price-tick.bulk',
                    event_type='price-tick',
                    payload=tick,
                    schema_str=tick_schema_str,
                )
                tick_count += 1
                logger.info(
                    '[TICK] %s bid=%.5f ask=%.5f mid=%.5f chg24h=%.4f%%',
                    tick['product'], tick['bidPrice'], tick['askPrice'],
                    tick['midPrice'], tick['change24h'],
                )

            # Publish a deal every ~15 seconds
            if time.time() - last_deal_time >= 15:
                deal = make_deal_executed()
                producer.produce(
                    topic='trading.deal-executed.critical',
                    event_type='deal-executed',
                    payload=deal,
                    schema_str=deal_schema_str,
                )
                deal_count += 1
                last_deal_time = time.time()
                logger.info(
                    '[DEAL] #%d %s %s %.0f @ %.5f USD — %s',
                    deal_count, deal['side'], deal['product'],
                    deal['quantity'], deal['priceUsd'], deal['counterparty'],
                )

            elapsed = time.time() - loop_start
            sleep_time = max(0, 2.0 - elapsed)
            time.sleep(sleep_time)

    except KeyboardInterrupt:
        logger.info('Trading producer stopped. Ticks: %d, Deals: %d', tick_count, deal_count)
    finally:
        producer.flush()


if __name__ == '__main__':
    main()
