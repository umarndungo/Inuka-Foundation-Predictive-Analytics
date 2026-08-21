"""
Backend Engineer ownership — GET /api/v1/demand (Day 2).

Wraps Data Scientist's forecast_regional_demand() (app/ml/demand.py). If
its data extract (data-pipeline/data/synthetic_beneficiaries.json) isn't
present yet, we fall back to a "current state" view built straight from
Data Engineer's gold.regional_risk_stats view, tagged data_source=
"gold_fallback" so Frontend/PM know it's not a real forecast — this keeps
the Demand Map rendering something real during the demo instead of a
blank panel or a 500.
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
from app.schemas.demand import DemandForecastItem, DemandForecastResponse

logger = logging.getLogger(__name__)
router = APIRouter()


async def _gold_fallback(db: AsyncSession, horizon_days: int) -> list[DemandForecastItem]:
    result = await db.execute(select(RegionalRiskStats))
    rows = result.scalars().all()
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    items: list[DemandForecastItem] = []
    for row in rows:
        with_telemetry = row.with_telemetry_count or 0
        high_share = (float(row.high_risk_count or 0) / with_telemetry) if with_telemetry else 0.0
        attendance = float(row.avg_attendance_rate) if row.avg_attendance_rate is not None else 0.0
        items.append(
            DemandForecastItem(
                region=row.region,
                # No trend without a time series here — current == forecast, trend "flat".
                current_demand_index=round(attendance, 4),
                forecast_demand_index=round(attendance, 4),
                trend="flat",
                horizon_days=horizon_days,
                high_risk_share=round(high_share, 4),
                beneficiary_count=int(row.beneficiary_count or 0),
                generated_at=now,
                data_source="gold_fallback",
            )
        )
    return items


@router.get(
    "/demand",
    response_model=DemandForecastResponse,
    summary="Regional demand forecast for the Demand Map",
)
async def get_demand_forecast(
    horizon_days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
) -> DemandForecastResponse:
    try:
        from app.ml.demand import forecast_regional_demand  # Data Scientist's function

        raw = await run_in_threadpool(forecast_regional_demand, horizon_days)
        items = [DemandForecastItem(**row) for row in raw]
    except FileNotFoundError:
        logger.warning(
            "Demand forecast data extract missing — falling back to gold.regional_risk_stats"
        )
        items = await _gold_fallback(db, horizon_days)

    return DemandForecastResponse(horizon_days=horizon_days, regions=items)
