from __future__ import annotations

from pydantic import BaseModel


class BeneficiaryCoordinates(BaseModel):
    lat: float
    lng: float


class BeneficiaryResponse(BaseModel):
    id: str
    code: str
    name: str
    region: str
    subCounty: str
    school: str
    grade: int
    age: int
    gender: str
    riskScore: float
    riskTier: str
    riskDrivers: list[str]
    recommendedAction: str
    lastActivity: str
    attendanceRate: float
    assignmentCompletion: float
    travelDistanceKm: float
    phoneNumber: str | None = None
    fieldWorkerId: str | None = None
    coordinates: BeneficiaryCoordinates
    trend: str
    enrollmentDate: str


class PaginatedBeneficiariesResponse(BaseModel):
    items: list[BeneficiaryResponse]
    total: int
    page: int
    pageSize: int
    totalPages: int
