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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.db import get_db
from app.models.metrics import RegionalRiskStats
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
    try:
        from app.ml.demand import forecast_demand_series

        raw = await run_in_threadpool(forecast_demand_series, region, days)
    except FileNotFoundError:
        logger.warning("Demand data extract missing — falling back to gold aggregate series")
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
    try:
        from app.ml.demand import forecast_regional_breakdown

        raw = await run_in_threadpool(forecast_regional_breakdown, days)
    except FileNotFoundError:
        logger.warning("Demand data extract missing — falling back to gold aggregate breakdown")
        raw = await _gold_fallback_breakdown(db, days)

    return [RegionalDemandForecast(**item) for item in raw]
