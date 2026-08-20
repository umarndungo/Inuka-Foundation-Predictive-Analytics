#!/usr/bin/env python3
"""
Day-1 round-trip check: consume from beneficiary.telemetry and print payloads.

Usage:
  python data-pipeline/scripts/kafka_print_consumer.py --max-messages 10
"""

from __future__ import annotations

import argparse
import json
import sys

try:
    from kafka import KafkaConsumer
    from kafka.errors import KafkaError
except ImportError:
    print("Missing dependency: pip install -r data-pipeline/requirements.txt", file=sys.stderr)
    sys.exit(1)

DEFAULT_BOOTSTRAP = "localhost:19092"
TELEMETRY_TOPIC = "beneficiary.telemetry"


def main() -> None:
    parser = argparse.ArgumentParser(description="Print Kafka telemetry for round-trip checks.")
    parser.add_argument("--bootstrap", default=DEFAULT_BOOTSTRAP)
    parser.add_argument("--topic", default=TELEMETRY_TOPIC)
    parser.add_argument("--group", default="day1-print-consumer")
    parser.add_argument("--max-messages", type=int, default=10)
    parser.add_argument("--timeout-ms", type=int, default=15000)
    args = parser.parse_args()

    print(f"Consuming from {args.topic} via {args.bootstrap} …")
    try:
        consumer = KafkaConsumer(
            args.topic,
            bootstrap_servers=args.bootstrap,
            group_id=args.group,
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            consumer_timeout_ms=args.timeout_ms,
            value_deserializer=lambda b: json.loads(b.decode("utf-8")),
            key_deserializer=lambda b: b.decode("utf-8") if b else None,
        )
    except KafkaError as exc:
        print(f"Cannot reach Kafka at {args.bootstrap}: {exc}", file=sys.stderr)
        sys.exit(1)

    count = 0
    for msg in consumer:
        count += 1
        print(
            f"#{count} partition={msg.partition} offset={msg.offset} "
            f"key={msg.key} value={json.dumps(msg.value, separators=(',', ':'))}"
        )
        if count >= args.max_messages:
            break

    consumer.close()
    if count == 0:
        print("No messages received within timeout.", file=sys.stderr)
        sys.exit(2)
    print(f"Round-trip OK — received {count} message(s).")


if __name__ == "__main__":
    main()
