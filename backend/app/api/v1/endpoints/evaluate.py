"""
Backend Engineer ownership — POST /api/v1/evaluate.

Day 1: stub response matching the final JSON shape exactly (so Frontend
can integrate immediately) — see `_stub_score` below, which now doubles as
the automatic fallback for as long as Data Scientist's model.pkl doesn't
exist, per docs/00_end_to_end_integration.md §Seam 2.

Day 2: wired to Data Scientist's real backend/app/ml/predict.py
(`score_beneficiary`), with the n8n + Kafka automation trigger firing
async when risk_score > 0.75.

404 contract (docs/03_backend_engineer.md §3): beneficiary_id not found in
the Identity Graph (silver.beneficiary_identity_graph, Data Engineer's
view) raises HTTPException 404 before any scoring happens.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.db import get_db
from app.models.beneficiary import BeneficiaryIdentityGraph
from app.schemas.evaluate import EvaluateRequest, EvaluateResponse
from app.services.kafka_producer import publish_alert
from app.services.n8n_trigger import trigger_n8n_webhook

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

# Fields the Identity Graph can backfill when the caller's request doesn't
# include them — never overrides what the caller explicitly sent.
_GRAPH_BACKFILL_FIELDS = (
    "grade_average",
    "socioeconomic_index",
    "historical_dropouts_in_family",
    "pillar",
)


def _stub_score(payload: dict[str, Any]) -> dict[str, Any]:
    """Deterministic rule-based fallback — same response shape as
    predict.score_beneficiary(). Used automatically whenever model.pkl
    hasn't been trained yet, so /evaluate is never blocked on Data
    Scientist's Day-1/2 progress."""
    attendance = payload.get("attendance_rate")
    travel = payload.get("travel_distance_km")
    completion = payload.get("assignment_completion")

    score = 0.15
    drivers: list[str] = []
    if attendance is not None and attendance < 0.60:
        score += 0.35
        drivers.append("Low Attendance")
    if travel is not None and travel > 15.0:
        score += 0.25
        drivers.append("High Travel Distance")
    if completion is not None and completion < 0.50:
        score += 0.25
        drivers.append("Low Assignment Completion")
    score = min(score, 0.98)

    threshold = settings.automation_threshold
    tier = "HIGH" if score > threshold else "MEDIUM" if score >= 0.45 else "LOW"
    automation = score > threshold

    return {
        "beneficiary_id": payload["beneficiary_id"],
        "risk_score": round(score, 4),
        "risk_tier": tier,
        "drivers": drivers or ["Multiple Moderate Risk Factors"],
        "recommended_action": (
            "Automated Field Worker Outreach"
            if automation
            else "Schedule Counselor Check-in"
            if tier == "MEDIUM"
            else "Continue Routine Monitoring"
        ),
        "automation_triggered": automation,
    }


async def _fire_automation(*, beneficiary_id: str, risk_score: float, risk_tier: str, region: str) -> None:
    """Fan out the automation rule to n8n (SMS) and Kafka (system.alerts)
    concurrently. Both are best-effort/non-raising — see their modules."""
    alert_payload = {
        "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
        "beneficiary_id": beneficiary_id,
        "risk_score": risk_score,
        "risk_tier": risk_tier,
        "region": region,
        "triggered_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "evaluate/n8n",
    }
    await asyncio.gather(
        trigger_n8n_webhook(alert_payload),
        publish_alert(alert_payload),
    )


@router.post(
    "/evaluate",
    response_model=EvaluateResponse,
    status_code=status.HTTP_200_OK,
    summary="Score one beneficiary's dropout risk and trigger automation if HIGH",
)
async def evaluate_beneficiary(
    payload: EvaluateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> EvaluateResponse:
    result = await db.execute(
        select(BeneficiaryIdentityGraph).where(
            BeneficiaryIdentityGraph.beneficiary_id == payload.beneficiary_id
        )
    )
    graph_row = result.scalar_one_or_none()
    if graph_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiary ID '{payload.beneficiary_id}' not found in the Identity Graph",
        )

    enriched: dict[str, Any] = payload.model_dump()
    for field in _GRAPH_BACKFILL_FIELDS:
        value = getattr(graph_row, field, None)
        if value is not None:
            enriched.setdefault(field, value)

    model_status = "live"
    try:
        from app.ml.predict import score_beneficiary  # Data Scientist's function

        scored = await run_in_threadpool(score_beneficiary, enriched)
    except FileNotFoundError:
        logger.warning(
            "model.pkl not found — scoring beneficiary_id=%s with the rule-based stub",
            payload.beneficiary_id,
        )
        scored = _stub_score(enriched)
        model_status = "stub"

    response = EvaluateResponse(**scored, model_status=model_status)

    # Surface fields for the audit-logging middleware (main.py) without
    # coupling it to this route's internals.
    request.state.beneficiary_id = response.beneficiary_id
    request.state.risk_tier = response.risk_tier
    request.state.automation_triggered = response.automation_triggered

    if response.automation_triggered:
        await _fire_automation(
            beneficiary_id=response.beneficiary_id,
            risk_score=response.risk_score,
            risk_tier=response.risk_tier,
            region=payload.region,
        )

    return response
