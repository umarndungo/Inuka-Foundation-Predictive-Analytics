"""
Kafka → PostgreSQL Bronze consumer (Data Engineer ownership).

Consumes `beneficiary.telemetry` (and optionally `system.alerts`) and lands
raw JSON into bronze.telemetry_events for Silver/Gold views.

SSE contract (Backend `/api/v1/telemetry/stream`, ~2s cadence):
  call fetch_latest_kafka_telemetry(limit=...) which reads newest Bronze rows
  — consumer write path is near-real-time, so a 2s poll sees fresh events.

system.alerts expected payload (Backend → n8n trigger → Kafka):
  {
    "alert_id": "ALT-001",
    "beneficiary_id": "BEN-9021",
    "risk_score": 0.88,
    "risk_tier": "HIGH",
    "region": "Kisumu",
    "triggered_at": "2026-08-20T12:00:00Z",
    "source": "evaluate/n8n"
  }
"""

from __future__ import annotations

import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

TELEMETRY_TOPIC = "beneficiary.telemetry"
ALERTS_TOPIC = "system.alerts"
DEFAULT_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:19092")
DEFAULT_GROUP = os.getenv("KAFKA_GROUP_ID", "inuka-bronze-writer")


def _sync_dsn() -> str:
    """psycopg2 DSN — prefer DATABASE_URL_SYNC; strip asyncpg from DATABASE_URL."""
    sync = os.getenv("DATABASE_URL_SYNC")
    if sync:
        return sync
    raw = os.getenv(
        "DATABASE_URL",
        "postgresql://inuka:inuka@localhost:5433/inuka_risk_radar",
    )
    return (
        raw.replace("postgresql+asyncpg://", "postgresql://")
        .replace("postgres+asyncpg://", "postgresql://")
    )


DEFAULT_DSN = _sync_dsn()

INSERT_SQL = """
INSERT INTO bronze.telemetry_events (
    topic, partition_id, kafka_offset, beneficiary_id, event_timestamp, payload
) VALUES (%s, %s, %s, %s, %s, %s::jsonb)
ON CONFLICT (topic, partition_id, kafka_offset) DO NOTHING
"""


def _parse_event_timestamp(payload: dict[str, Any]) -> datetime | None:
    raw = payload.get("timestamp") or payload.get("triggered_at")
    if not raw:
        return None
    if isinstance(raw, datetime):
        return raw if raw.tzinfo else raw.replace(tzinfo=timezone.utc)
    text = str(raw).replace("Z", "+00:00")
    try:
        ts = datetime.fromisoformat(text)
    except ValueError:
        return None
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


class KafkaTelemetryConsumer:
    """Consumes Kafka topics and lands raw payloads into bronze.telemetry_events."""

    def __init__(
        self,
        bootstrap_servers: str = DEFAULT_BOOTSTRAP,
        group_id: str = DEFAULT_GROUP,
        dsn: str = DEFAULT_DSN,
        topics: list[str] | None = None,
    ):
        self.bootstrap_servers = bootstrap_servers
        self.group_id = group_id
        self.dsn = dsn
        self.topics = topics or [TELEMETRY_TOPIC, ALERTS_TOPIC]
        self._consumer = None
        self._conn = None
        self._running = False

    def parse_event(self, raw: bytes | str | dict[str, Any]) -> dict[str, Any]:
        if isinstance(raw, dict):
            return raw
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        return json.loads(raw)

    def _connect_db(self):
        try:
            import psycopg2
        except ImportError as exc:
            raise ImportError(
                "psycopg2 is required: pip install psycopg2-binary"
            ) from exc
        self._conn = psycopg2.connect(self.dsn)
        self._conn.autocommit = True

    def _connect_kafka(self):
        try:
            from kafka import KafkaConsumer
        except ImportError as exc:
            raise ImportError(
                "kafka-python is required: pip install -r data-pipeline/requirements.txt"
            ) from exc
        self._consumer = KafkaConsumer(
            *self.topics,
            bootstrap_servers=self.bootstrap_servers,
            group_id=self.group_id,
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            consumer_timeout_ms=-1,
            value_deserializer=lambda b: b,
            key_deserializer=lambda b: b.decode("utf-8") if b else None,
        )

    def land_message(
        self,
        *,
        topic: str,
        partition: int,
        offset: int,
        payload: dict[str, Any],
    ) -> bool:
        """Insert one event into Bronze. Returns True if a new row was written."""
        if self._conn is None:
            self._connect_db()
        assert self._conn is not None
        beneficiary_id = payload.get("beneficiary_id")
        event_ts = _parse_event_timestamp(payload)
        with self._conn.cursor() as cur:
            cur.execute(
                INSERT_SQL,
                (
                    topic,
                    partition,
                    offset,
                    beneficiary_id,
                    event_ts,
                    json.dumps(payload),
                ),
            )
            return cur.rowcount > 0

    def start(self, max_messages: int | None = None) -> int:
        """
        Blocking consume loop → Bronze.

        max_messages: stop after N landings (None = run forever).
        """
        self._connect_db()
        self._connect_kafka()
        self._running = True
        landed = 0
        logger.info(
            "Bronze consumer started topics=%s bootstrap=%s group=%s",
            self.topics,
            self.bootstrap_servers,
            self.group_id,
        )
        assert self._consumer is not None
        for msg in self._consumer:
            if not self._running:
                break
            try:
                payload = self.parse_event(msg.value)
                wrote = self.land_message(
                    topic=msg.topic,
                    partition=msg.partition,
                    offset=msg.offset,
                    payload=payload,
                )
                if wrote:
                    landed += 1
                    if landed == 1 or landed % 25 == 0:
                        logger.info(
                            "landed=%s topic=%s offset=%s beneficiary=%s",
                            landed,
                            msg.topic,
                            msg.offset,
                            payload.get("beneficiary_id"),
                        )
            except Exception:
                logger.exception(
                    "Failed to land message topic=%s partition=%s offset=%s",
                    msg.topic,
                    msg.partition,
                    msg.offset,
                )
            if max_messages is not None and landed >= max_messages:
                break
        self.stop()
        return landed

    def stop(self) -> None:
        self._running = False
        if self._consumer is not None:
            self._consumer.close()
            self._consumer = None
        if self._conn is not None:
            self._conn.close()
            self._conn = None
        logger.info("Kafka consumer stopped")


def fetch_latest_kafka_telemetry(
    limit: int = 20,
    dsn: str = DEFAULT_DSN,
    topic: str = TELEMETRY_TOPIC,
) -> list[dict[str, Any]]:
    """
    Newest Bronze telemetry payloads for Backend SSE (~2s poll).

    Returns list of dicts with payload fields plus ingestion metadata.
    """
    import psycopg2
    from psycopg2.extras import RealDictCursor

    sql = """
        SELECT
            event_id,
            topic,
            beneficiary_id,
            event_timestamp,
            ingested_at,
            payload
        FROM bronze.telemetry_events
        WHERE topic = %s
        ORDER BY ingested_at DESC, event_id DESC
        LIMIT %s
    """
    with psycopg2.connect(dsn) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (topic, limit))
            rows = cur.fetchall()

    results: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row["payload"]) if isinstance(row["payload"], dict) else json.loads(row["payload"])
        item["_meta"] = {
            "event_id": row["event_id"],
            "topic": row["topic"],
            "beneficiary_id": row["beneficiary_id"],
            "event_timestamp": row["event_timestamp"].isoformat() if row["event_timestamp"] else None,
            "ingested_at": row["ingested_at"].isoformat() if row["ingested_at"] else None,
        }
        results.append(item)
    return results


def main(argv: list[str] | None = None) -> int:
    import argparse

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    parser = argparse.ArgumentParser(description="Land Kafka events into Bronze Postgres.")
    parser.add_argument("--bootstrap", default=DEFAULT_BOOTSTRAP)
    parser.add_argument("--dsn", default=DEFAULT_DSN)
    parser.add_argument("--group", default=DEFAULT_GROUP)
    parser.add_argument("--max-messages", type=int, default=None)
    parser.add_argument(
        "--telemetry-only",
        action="store_true",
        help="Only consume beneficiary.telemetry (skip system.alerts)",
    )
    args = parser.parse_args(argv)

    topics = [TELEMETRY_TOPIC] if args.telemetry_only else [TELEMETRY_TOPIC, ALERTS_TOPIC]
    consumer = KafkaTelemetryConsumer(
        bootstrap_servers=args.bootstrap,
        group_id=args.group,
        dsn=args.dsn,
        topics=topics,
    )

    def _shutdown(signum, frame):  # noqa: ARG001
        logger.info("Signal %s received — shutting down", signum)
        consumer.stop()

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    landed = consumer.start(max_messages=args.max_messages)
    print(f"Landed {landed} new Bronze row(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
