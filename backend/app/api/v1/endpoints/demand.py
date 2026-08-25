"""
Demand endpoints for chart-ready frontend forecasts.

- GET /api/v1/demand returns one chart-ready demand series for a region or the
  national aggregate.
- GET /api/v1/demand/breakdown returns regional summary rows for map/card UIs.

All data is read from gold.demand_forecasts (materialized by the db-seed
service). No per-request ML computation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.metrics import DemandForecastArtifact
from app.schemas.demand import DemandForecastResponse, RegionalDemandForecast

logger = logging.getLogger(__name__)
router = APIRouter()


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

    # If no persisted artifact found, try adjacent horizon days
    for fallback_days in (30, 14, 7):
        if fallback_days != days:
            persisted = await _get_persisted_forecast(db, region, fallback_days)
            if persisted is not None:
                return persisted

    logger.warning("No demand forecast artifacts found for region=%s horizon=%d", region, days)
    return DemandForecastResponse(
        region=region,
        historical=[],
        predicted=[],
        confidence=[],
        dates=[],
        summary={"expectedChange": 0.0, "peakDay": "", "confidence": 0},
    )


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

    # Try adjacent horizon days
    for fallback_days in (30, 14, 7):
        if fallback_days != days:
            persisted = await _get_persisted_breakdown(db, fallback_days)
            if persisted:
                return persisted

    logger.warning("No demand breakdown artifacts found for horizon=%d", days)
    return []
