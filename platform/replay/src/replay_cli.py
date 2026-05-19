#!/usr/bin/env python3
"""
datamesh-replay — Replay Kafka topic messages to a consumer group.

Supports:
  - Replay by time window:  --from 2024-01-15T10:00:00 --to 2024-01-15T11:00:00
  - Replay by offset range: --from-offset 0 --to-offset 5000
  - Replay to a different topic (forked replay): --target-topic <topic>
  - Dry-run mode: --dry-run

Safety: defaults to a rate limit of 1000 msg/s to protect downstream consumers.

Usage:
  python replay_cli.py replay \\
    --topic orders.order-placed.critical \\
    --consumer-group inventory-materializer-v1 \\
    --from 2024-01-15T10:00:00Z \\
    --to 2024-01-15T11:00:00Z \\
    --rate-limit 500

  python replay_cli.py status --topic orders.order-placed.critical --consumer-group inventory-materializer-v1
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from typing import Optional

from confluent_kafka import Consumer, Producer, KafkaError, TopicPartition
from confluent_kafka.admin import AdminClient


def parse_ts(ts_str: str) -> int:
    """Parse ISO-8601 datetime string to milliseconds since epoch."""
    dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    return int(dt.timestamp() * 1000)


def get_offsets_for_time(admin: AdminClient, consumer: Consumer, topic: str, ts_ms: int) -> dict[int, int]:
    """Return {partition: offset} for the given timestamp."""
    metadata = admin.list_topics(topic, timeout=10)
    if topic not in metadata.topics:
        raise ValueError(f"Topic {topic!r} not found")

    partitions = list(metadata.topics[topic].partitions.keys())
    tps = [TopicPartition(topic, p, ts_ms) for p in partitions]
    result = consumer.offsets_for_times(tps, timeout=10)
    return {tp.partition: tp.offset for tp in result if tp.offset != -1}


def replay(
    bootstrap_servers: str,
    topic: str,
    consumer_group: str,
    from_ts: Optional[str],
    to_ts: Optional[str],
    from_offset: Optional[int],
    to_offset: Optional[int],
    target_topic: Optional[str],
    rate_limit: int,
    dry_run: bool,
) -> None:
    admin_conf = {"bootstrap.servers": bootstrap_servers}
    admin = AdminClient(admin_conf)

    consumer_conf = {
        "bootstrap.servers": bootstrap_servers,
        "group.id": f"{consumer_group}__replay__{int(time.time())}",
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,
    }
    consumer = Consumer(consumer_conf)

    producer: Optional[Producer] = None
    if not dry_run:
        producer = Producer({"bootstrap.servers": bootstrap_servers, "acks": "all"})

    replay_target = target_topic or topic

    # Determine start/end offsets
    if from_ts:
        from_offsets = get_offsets_for_time(admin, consumer, topic, parse_ts(from_ts))
    elif from_offset is not None:
        metadata = admin.list_topics(topic, timeout=10)
        partitions = list(metadata.topics[topic].partitions.keys())
        from_offsets = {p: from_offset for p in partitions}
    else:
        raise ValueError("Must specify --from or --from-offset")

    end_ts_ms = parse_ts(to_ts) if to_ts else None
    end_offset_val = to_offset

    tps = [TopicPartition(topic, p, off) for p, off in from_offsets.items()]
    consumer.assign(tps)
    for tp in tps:
        consumer.seek(tp)

    print(f"{'[DRY RUN] ' if dry_run else ''}Replaying topic={topic} → {replay_target}")
    print(f"  Partitions: {list(from_offsets.keys())}")
    print(f"  Rate limit: {rate_limit} msg/s")

    replayed = 0
    interval = 1.0 / rate_limit if rate_limit > 0 else 0

    try:
        while True:
            msg = consumer.poll(timeout=2.0)
            if msg is None:
                print(f"  Caught up — replayed {replayed} messages.")
                break
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                print(f"  Error: {msg.error()}", file=sys.stderr)
                break

            # Time-range guard
            if end_ts_ms and msg.timestamp()[1] > end_ts_ms:
                continue
            if end_offset_val is not None and msg.offset() > end_offset_val:
                continue

            if dry_run:
                try:
                    val = json.loads(msg.value())
                    print(f"  [DRY RUN] partition={msg.partition()} offset={msg.offset()} key={msg.key()} value={json.dumps(val)[:120]}")
                except Exception:
                    print(f"  [DRY RUN] partition={msg.partition()} offset={msg.offset()} (binary value, {len(msg.value())} bytes)")
            else:
                producer.produce(
                    topic=replay_target,
                    key=msg.key(),
                    value=msg.value(),
                    headers=list(msg.headers() or []) + [(b"x-replay-source", topic.encode()), (b"x-replay-ts", str(int(time.time())).encode())],
                )
                if replayed % 100 == 0:
                    producer.poll(0)

            replayed += 1
            if interval:
                time.sleep(interval)

    finally:
        consumer.close()
        if producer:
            producer.flush(30)
        print(f"\nReplay complete. Total messages replayed: {replayed}")


def status(bootstrap_servers: str, topic: str, consumer_group: str) -> None:
    admin = AdminClient({"bootstrap.servers": bootstrap_servers})
    consumer = Consumer({
        "bootstrap.servers": bootstrap_servers,
        "group.id": consumer_group,
        "enable.auto.commit": False,
    })

    metadata = admin.list_topics(topic, timeout=10)
    partitions = list(metadata.topics[topic].partitions.keys())

    committed = consumer.committed([TopicPartition(topic, p) for p in partitions], timeout=10)
    high_watermarks = {p: consumer.get_watermark_offsets(TopicPartition(topic, p), timeout=5)[1] for p in partitions}

    total_lag = 0
    print(f"\nTopic: {topic}  Group: {consumer_group}")
    print(f"{'Partition':<12} {'Committed':<14} {'High':<14} {'Lag':<10}")
    print("-" * 52)
    for tp in committed:
        committed_off = tp.offset if tp.offset >= 0 else 0
        high = high_watermarks.get(tp.partition, 0)
        lag = max(0, high - committed_off)
        total_lag += lag
        print(f"{tp.partition:<12} {committed_off:<14} {high:<14} {lag:<10}")
    print("-" * 52)
    print(f"{'TOTAL LAG':<38} {total_lag:<10}\n")
    consumer.close()


def main():
    parser = argparse.ArgumentParser(description="Data Mesh Replay CLI")
    parser.add_argument("--bootstrap-servers", default="localhost:9092")
    sub = parser.add_subparsers(dest="command", required=True)

    rp = sub.add_parser("replay", help="Replay messages from a topic")
    rp.add_argument("--topic", required=True)
    rp.add_argument("--consumer-group", required=True)
    rp.add_argument("--from", dest="from_ts", help="ISO-8601 start timestamp")
    rp.add_argument("--to", dest="to_ts", help="ISO-8601 end timestamp")
    rp.add_argument("--from-offset", type=int)
    rp.add_argument("--to-offset", type=int)
    rp.add_argument("--target-topic", help="Write replayed messages to a different topic")
    rp.add_argument("--rate-limit", type=int, default=1000, help="Max messages per second")
    rp.add_argument("--dry-run", action="store_true")

    st = sub.add_parser("status", help="Show consumer group lag")
    st.add_argument("--topic", required=True)
    st.add_argument("--consumer-group", required=True)

    args = parser.parse_args()

    if args.command == "replay":
        replay(
            bootstrap_servers=args.bootstrap_servers,
            topic=args.topic,
            consumer_group=args.consumer_group,
            from_ts=args.from_ts,
            to_ts=args.to_ts,
            from_offset=args.from_offset,
            to_offset=args.to_offset,
            target_topic=args.target_topic,
            rate_limit=args.rate_limit,
            dry_run=args.dry_run,
        )
    elif args.command == "status":
        status(
            bootstrap_servers=args.bootstrap_servers,
            topic=args.topic,
            consumer_group=args.consumer_group,
        )


if __name__ == "__main__":
    main()
