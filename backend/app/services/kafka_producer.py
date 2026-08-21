"""
Backend Engineer ownership — async producer for `system.alerts`.

docs/00_end_to_end_integration.md §3.1 (Kafka Topics table) makes Backend
the producer of `system.alerts` ("on automation trigger"), consumed by
Data Engineer's alert consumer / dashboard. This is a sibling to Data
Engineer's app/services/kafka_consumer.py (which lands `system.alerts`
into bronze.telemetry_events — see its module docstring for the expected
payload shape, which this module produces exactly).

Kept separate from n8n_trigger.py so a Kafka outage and an n8n outage are
independent failure modes — /evaluate should never 500 because either
downstream system is unavailable.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from aiokafka import AIOKafkaProducer

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_producer: AIOKafkaProducer | None = None


async def get_producer() -> AIOKafkaProducer:
    global _producer
    if _producer is None:
        _producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        await _producer.start()
    return _producer


async def close_producer() -> None:
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None


async def publish_alert(alert_payload: dict[str, Any]) -> bool:
    """Publish one risk-escalation event onto system.alerts. Never raises —
    a down Redpanda broker shouldn't fail the /evaluate request."""
    try:
        producer = await get_producer()
        key = alert_payload.get("beneficiary_id")
        await producer.send_and_wait(
            settings.kafka_topic_alerts,
            value=alert_payload,
            key=key.encode("utf-8") if key else None,
        )
        return True
    except Exception:
        logger.exception(
            "Failed to publish alert to Kafka topic=%s beneficiary_id=%s",
            settings.kafka_topic_alerts,
            alert_payload.get("beneficiary_id"),
        )
        return False
