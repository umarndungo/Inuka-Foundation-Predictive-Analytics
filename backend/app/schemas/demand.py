"""
Pydantic schemas for GET /api/v1/demand. Shape matches Data Scientist's
forecast_regional_demand() (backend/app/ml/demand.py) plus a `data_source`
flag Backend adds to distinguish a real forecast from the Gold-aggregate
fallback used when the forecast pipeline's data extract isn't available yet.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

Trend = Literal["up", "down", "flat"]


class DemandForecastItem(BaseModel):
    region: str
    current_demand_index: float
    forecast_demand_index: float
    trend: Trend
    horizon_days: int
    high_risk_share: float
    beneficiary_count: int
    generated_at: str
    data_source: Literal["forecast", "gold_fallback"] = "forecast"


class DemandForecastResponse(BaseModel):
    horizon_days: int
    regions: list[DemandForecastItem]
