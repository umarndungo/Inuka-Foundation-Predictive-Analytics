"""
Backend Engineer ownership — GET /api/v1/telemetry/stream (Day 2).

Server-Sent Events at ~2s cadence, sourced from Data Engineer's
fetch_latest_kafka_telemetry() helper (app/services/kafka_consumer.py),
which reads the newest Bronze rows. We track which event_ids we've already
emitted so a slow-moving stream doesn't repeat the same rows every poll.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Query, Request
from sse_starlette.sse import EventSourceResponse
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

# Bound memory for long-running demo sessions.
_MAX_TRACKED_IDS = 2000
_TRIM_TO = 500


@router.get(
    "/telemetry/stream",
    summary="SSE stream of the latest Kafka telemetry (~2s cadence)",
)
async def telemetry_stream(
    request: Request,
    limit: int = Query(default=None, ge=1, le=100),
):
    from app.services.kafka_consumer import fetch_latest_kafka_telemetry  # Data Engineer's helper

    batch_limit = limit or settings.telemetry_batch_limit
    interval = settings.telemetry_poll_interval_seconds

    async def event_generator():
        seen_event_ids: set[int] = set()
        while True:
            if await request.is_disconnected():
                logger.info("SSE client disconnected — closing telemetry stream")
                break

            try:
                rows = await run_in_threadpool(fetch_latest_kafka_telemetry, batch_limit)
            except Exception:
                logger.exception("Telemetry fetch from Bronze failed")
                yield {"event": "error", "data": json.dumps({"detail": "telemetry fetch failed"})}
                await asyncio.sleep(interval)
                continue

            # fetch_latest_kafka_telemetry() returns newest-first; emit
            # oldest-first so the dashboard sees events in order.
            new_rows = [
                row
                for row in reversed(rows)
                if row.get("_meta", {}).get("event_id") not in seen_event_ids
            ]
            for row in new_rows:
                event_id = row.get("_meta", {}).get("event_id")
                if event_id is not None:
                    seen_event_ids.add(event_id)
                yield {"event": "telemetry", "data": json.dumps(row, default=str)}

            if len(seen_event_ids) > _MAX_TRACKED_IDS:
                seen_event_ids = set(sorted(seen_event_ids)[-_TRIM_TO:])

            yield {
                "event": "heartbeat",
                "data": json.dumps({"ts": datetime.now(timezone.utc).isoformat()}),
            }
            await asyncio.sleep(interval)

    return EventSourceResponse(event_generator())
