"""
Demand endpoints for chart-ready frontend forecasts.

- GET /api/v1/demand returns one chart-ready demand series for a region or the
  national aggregate.
- GET /api/v1/demand/breakdown returns regional summary rows for map/card UIs.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.db import get_db
from app.models.metrics import DemandForecastArtifact, RegionalRiskStats
from app.schemas.demand import DemandForecastResponse, RegionalDemandForecast

logger = logging.getLogger(__name__)
router = APIRouter()


async def _gold_fallback_series(db: AsyncSession, region: str, horizon_days: int) -> dict:
    if region == "National":
        result = await db.execute(select(RegionalRiskStats))
        rows = result.scalars().all()
        current = round(sum(float(r.avg_attendance_rate or 0) for r in rows) * 100, 2)
    else:
        result = await db.execute(
            select(RegionalRiskStats).where(RegionalRiskStats.region == region)
        )
        row = result.scalar_one_or_none()
        current = round(float(row.avg_attendance_rate or 0) * 100, 2) if row else 0.0

    historical = [current for _ in range(max(horizon_days, 7))]
    predicted = [current for _ in range(horizon_days)]
    confidence = [0.65 for _ in range(horizon_days)]
    today = datetime.now(timezone.utc).date()
    start_offset = len(historical) - 1
    dates = [
        (today.fromordinal(today.toordinal() - start_offset + i)).isoformat()
        for i in range(len(historical) + len(predicted))
    ]

    return {
        "region": region,
        "historical": historical,
        "predicted": predicted,
        "confidence": confidence,
        "dates": dates,
        "summary": {
            "expectedChange": 0.0,
            "peakDay": dates[-1],
            "confidence": 65,
        },
    }


async def _gold_fallback_breakdown(db: AsyncSession, horizon_days: int) -> list[dict]:
    result = await db.execute(select(RegionalRiskStats))
    rows = result.scalars().all()
    today = datetime.now(timezone.utc).date()

    items: list[dict] = []
    for row in rows:
        current = round(float(row.avg_attendance_rate or 0) * 100, 2)
        historical = [current for _ in range(max(horizon_days, 7))]
        dates = [
            (today.fromordinal(today.toordinal() - (len(historical) - 1) + i)).isoformat()
            for i in range(len(historical) + horizon_days)
        ]
        items.append(
            {
                "region": row.region,
                "predicted_demand": current,
                "historical_trend": historical,
                "risk_factor": round(
                    (float(row.high_risk_count or 0) / float(row.with_telemetry_count or 1)), 2
                ) if row.with_telemetry_count else 0.0,
                "dates": dates,
                "summary": {
                    "expectedChange": 0.0,
                    "peakDay": dates[-1],
                    "confidence": 65,
                },
            }
        )
    return items


async def _get_persisted_forecast(
    db: AsyncSession,
    region: str,
    horizon_days: int,
) -> DemandForecastResponse | None:
    result = await db.execute(
        select(DemandForecastArtifact)
        .where(
            DemandForecastArtifact.region == region,
            DemandForecastArtifact.horizon_days == horizon_days,
        )
        .order_by(desc(DemandForecastArtifact.forecast_date), desc(DemandForecastArtifact.generated_at))
        .limit(1)
    )
    artifact = result.scalar_one_or_none()
    if artifact is None:
        return None

    return DemandForecastResponse(
        region=artifact.region,
        historical=[float(v) for v in artifact.historical],
        predicted=[float(v) for v in artifact.predicted],
        confidence=[float(v) for v in artifact.confidence],
        dates=[str(v) for v in artifact.dates],
        summary={
            "expectedChange": float(artifact.expected_change),
            "peakDay": artifact.peak_day.isoformat() if artifact.peak_day else (artifact.dates[-1] if artifact.dates else ""),
            "confidence": int(artifact.summary_confidence),
        },
    )


async def _get_persisted_breakdown(
    db: AsyncSession,
    horizon_days: int,
) -> list[RegionalDemandForecast]:
    result = await db.execute(
        select(DemandForecastArtifact)
        .where(
            DemandForecastArtifact.horizon_days == horizon_days,
            DemandForecastArtifact.region != "National",
        )
        .order_by(DemandForecastArtifact.region, desc(DemandForecastArtifact.forecast_date), desc(DemandForecastArtifact.generated_at))
    )
    rows = result.scalars().all()

    latest_by_region: dict[str, DemandForecastArtifact] = {}
    for row in rows:
        latest_by_region.setdefault(row.region, row)

    return [
        RegionalDemandForecast(
            region=row.region,
            predicted_demand=float(row.predicted_demand),
            historical_trend=[float(v) for v in row.historical],
            risk_factor=float(row.risk_factor),
            dates=[str(v) for v in row.dates],
            summary={
                "expectedChange": float(row.expected_change),
                "peakDay": row.peak_day.isoformat() if row.peak_day else (row.dates[-1] if row.dates else ""),
                "confidence": int(row.summary_confidence),
            },
        )
        for row in latest_by_region.values()
    ]


@router.get(
    "/demand",
    response_model=DemandForecastResponse,
    summary="Chart-ready demand forecast for one region or the national aggregate",
)
async def get_demand_forecast(
    region: str = Query(default="National"),
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
) -> DemandForecastResponse:
    persisted = await _get_persisted_forecast(db, region, days)
    if persisted is not None:
        return persisted

    try:
        from app.ml.demand import forecast_demand_series

        raw = await run_in_threadpool(forecast_demand_series, region, days)
    except FileNotFoundError:
        logger.warning("Demand artifacts missing — falling back to gold aggregate series")
        raw = await _gold_fallback_series(db, region, days)

    return DemandForecastResponse(**raw)


@router.get(
    "/demand/breakdown",
    response_model=list[RegionalDemandForecast],
    summary="Regional demand breakdown for map/card UIs",
)
async def get_demand_breakdown(
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
) -> list[RegionalDemandForecast]:
    persisted = await _get_persisted_breakdown(db, days)
    if persisted:
        return persisted

    try:
        from app.ml.demand import forecast_regional_breakdown

        raw = await run_in_threadpool(forecast_regional_breakdown, days)
    except FileNotFoundError:
        logger.warning("Demand artifacts missing — falling back to gold aggregate breakdown")
        raw = await _gold_fallback_breakdown(db, days)

    return [RegionalDemandForecast(**item) for item in raw]
