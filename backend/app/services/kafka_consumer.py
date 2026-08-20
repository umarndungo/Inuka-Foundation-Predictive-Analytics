"""
Kafka → PostgreSQL Bronze consumer (Data Engineer ownership).

Day 1: stub + contract only. Full near-real-time landing lands on Day 2
alongside Silver identity graph integration.
"""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

TELEMETRY_TOPIC = "beneficiary.telemetry"
ALERTS_TOPIC = "system.alerts"
DEFAULT_BOOTSTRAP = "localhost:19092"  # host; use redpanda:9092 inside Compose


class KafkaTelemetryConsumer:
    """Consumes beneficiary.telemetry and lands raw payloads into bronze.telemetry_events."""

    def __init__(self, bootstrap_servers: str = DEFAULT_BOOTSTRAP, group_id: str = "inuka-bronze-writer"):
        self.bootstrap_servers = bootstrap_servers
        self.group_id = group_id
        self._consumer = None

    def start(self) -> None:
        """Wire kafka-python consumer + SQLAlchemy session (Day 2)."""
        raise NotImplementedError(
            "Day 2: implement consume loop → INSERT INTO bronze.telemetry_events"
        )

    def parse_event(self, raw: bytes | str | dict[str, Any]) -> dict[str, Any]:
        if isinstance(raw, dict):
            return raw
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        return json.loads(raw)

    def stop(self) -> None:
        if self._consumer is not None:
            self._consumer.close()
            self._consumer = None
            logger.info("Kafka consumer stopped")
