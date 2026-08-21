#!/usr/bin/env python3
"""
Simulate field telemetry events onto Kafka topic `beneficiary.telemetry`.

Reads synthetic beneficiaries from seed_generator output (or generates inline)
and publishes at a configurable rate for local demos and latency testing.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    from kafka import KafkaProducer
    from kafka.errors import KafkaError
except ImportError:
    print("Missing dependency: pip install -r data-pipeline/requirements.txt", file=sys.stderr)
    sys.exit(1)

DEFAULT_BOOTSTRAP = "localhost:19092"
TELEMETRY_TOPIC = "beneficiary.telemetry"
DEFAULT_SEED_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "synthetic_beneficiaries.json"
)


def load_records(path: Path) -> list[dict]:
    if not path.exists():
        print(f"Seed file not found: {path}", file=sys.stderr)
        print("Run: python data-pipeline/scripts/seed_generator.py", file=sys.stderr)
        sys.exit(1)
    return json.loads(path.read_text(encoding="utf-8"))


def make_producer(bootstrap: str) -> KafkaProducer:
    return KafkaProducer(
        bootstrap_servers=bootstrap,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
        acks="all",
        linger_ms=5,
        retries=3,
    )


def publish_loop(
    producer: KafkaProducer,
    records: list[dict],
    *,
    rate: float,
    limit: int | None,
    refresh_timestamp: bool,
) -> int:
    interval = 1.0 / rate if rate > 0 else 0.0
    sent = 0
    i = 0
    n = len(records)

    while limit is None or sent < limit:
        event = dict(records[i % n])
        if refresh_timestamp:
            event["timestamp"] = (
                datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
            )
        key = event.get("beneficiary_id", "")
        future = producer.send(TELEMETRY_TOPIC, key=key, value=event)
        future.get(timeout=10)
        sent += 1
        i += 1
        if sent % 25 == 0 or sent == 1:
            print(
                f"[{sent}] → {TELEMETRY_TOPIC}  {key}  "
                f"region={event.get('region')}  pillar={event.get('pillar')}"
            )
        if interval:
            time.sleep(interval)

    return sent


def main() -> None:
    parser = argparse.ArgumentParser(description="Simulate Kafka beneficiary telemetry.")
    parser.add_argument("--bootstrap", default=DEFAULT_BOOTSTRAP, help="Kafka bootstrap servers")
    parser.add_argument("--seed-file", type=Path, default=DEFAULT_SEED_PATH)
    parser.add_argument("--rate", type=float, default=5.0, help="Events per second (default: 5)")
    parser.add_argument(
        "--count",
        type=int,
        default=50,
        help="Number of events to send (default: 50). Use 0 for continuous.",
    )
    parser.add_argument(
        "--no-refresh-ts",
        action="store_true",
        help="Keep original seed timestamps instead of now()",
    )
    args = parser.parse_args()

    records = load_records(args.seed_file)
    limit = None if args.count == 0 else args.count

    print(f"Connecting to {args.bootstrap} …")
    try:
        producer = make_producer(args.bootstrap)
        producer.partitions_for(TELEMETRY_TOPIC)
    except KafkaError as exc:
        print(f"Cannot reach Kafka at {args.bootstrap}: {exc}", file=sys.stderr)
        print("  docker compose up -d redpanda redpanda-init postgres", file=sys.stderr)
        sys.exit(1)

    print(
        f"Publishing to {TELEMETRY_TOPIC} at ~{args.rate} evt/s "
        f"(limit={'∞' if limit is None else limit}) from {args.seed_file}"
    )
    try:
        sent = publish_loop(
            producer,
            records,
            rate=args.rate,
            limit=limit,
            refresh_timestamp=not args.no_refresh_ts,
        )
    except KeyboardInterrupt:
        print("\nStopped by user.")
        sent = -1
    finally:
        producer.flush()
        producer.close()

    if sent >= 0:
        print(f"Done. Sent {sent} events.")


if __name__ == "__main__":
    main()
