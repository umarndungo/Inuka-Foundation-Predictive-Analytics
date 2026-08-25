from __future__ import annotations

from pydantic import BaseModel


class RiskDistributionResponse(BaseModel):
    low: int
    medium: int
    high: int
    total: int


class KPIMetricResponse(BaseModel):
    label: str
    value: str | int | float
    change: float
    changeLabel: str
    description: str
    icon: str
    status: str | None = None
    isInverse: bool | None = None


class MapRegionResponse(BaseModel):
    name: str
    code: str
    coordinates: tuple[float, float]
    beneficiaries: int
    highRisk: int
    riskScore: float


class SystemStatusResponse(BaseModel):
    isOnline: bool
    lastSync: str | None
    syncStatus: str
    devicesOnline: int
    devicesTotal: int
    ingestionRate: int
    apiLatency: int


class FieldWorkerResponse(BaseModel):
    id: str
    code: str
    name: str
    region: str
    phoneNumber: str
    assignedBeneficiaries: int
    lastSync: str
    isOnline: bool


class RiskTrendPointResponse(BaseModel):
    date: str
    overall: float
    high: int
    low: int
    medium: int
