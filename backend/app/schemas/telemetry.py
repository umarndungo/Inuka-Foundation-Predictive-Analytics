"""
Documentation-only schema for GET /api/v1/telemetry/stream. SSE payloads
are sent as raw `data: <json>\\n\\n` frames (see sse-starlette), so nothing
here is enforced at runtime — this just gives /docs an accurate shape for
Frontend to reference when writing the SSE client hook.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class TelemetryEventMeta(BaseModel):
    event_id: int
    topic: str
    beneficiary_id: str | None
    event_timestamp: str | None
    ingested_at: str | None


class TelemetryEvent(BaseModel):
    """A Bronze-landed telemetry payload, as produced by
    data-pipeline/scripts/kafka_producer_sim.py, plus ingestion metadata."""

    beneficiary_id: str | None = None
    region: str | None = None
    attendance_rate: float | None = None
    travel_distance_km: float | None = None
    meta: TelemetryEventMeta | None = None

    model_config = {"extra": "allow"}


class TelemetryHeartbeat(BaseModel):
    ts: str
