"""
Pydantic schemas for GET /api/v1/demand and /api/v1/demand/breakdown.

The frontend demand chart expects a chart-ready time-series contract rather than
an aggregate list, so the backend owns that transformation here. A companion
breakdown endpoint returns one summary object per region for map/card UIs.
"""

from __future__ import annotations

from pydantic import BaseModel


class DemandSummary(BaseModel):
    expectedChange: float
    peakDay: str
    confidence: int


class DemandForecastResponse(BaseModel):
    region: str
    historical: list[float]
    predicted: list[float]
    confidence: list[float]
    dates: list[str]
    summary: DemandSummary


class RegionalDemandForecast(BaseModel):
    region: str
    predicted_demand: float
    historical_trend: list[float]
    risk_factor: float
    dates: list[str]
    summary: DemandSummary
