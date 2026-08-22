from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.beneficiary import BeneficiaryIdentityGraph
from app.schemas.beneficiaries import BeneficiaryResponse, PaginatedBeneficiariesResponse

router = APIRouter()

_REGION_COORDS: dict[str, tuple[float, float]] = {
    "Nairobi": (-1.286389, 36.817223),
    "Kisumu": (-0.091702, 34.767956),
    "Nakuru": (-0.303099, 36.080025),
    "Mombasa": (-4.043477, 39.668206),
    "Eldoret": (0.514277, 35.269779),
}

_SUBCOUNTY_BY_REGION: dict[str, str] = {
    "Nairobi": "Kasarani",
    "Kisumu": "Kisumu East",
    "Nakuru": "Nakuru West",
    "Mombasa": "Kisauni",
    "Eldoret": "Ainabkoi",
}

_SCHOOL_BY_REGION: dict[str, str] = {
    "Nairobi": "Nairobi Learning Centre",
    "Kisumu": "Kisumu Community School",
    "Nakuru": "Nakuru Hills Academy",
    "Mombasa": "Mombasa Coast School",
    "Eldoret": "Eldoret Future Academy",
}


def _risk_score(row: BeneficiaryIdentityGraph) -> float:
    score = 0.15
    if row.attendance_rate is not None and row.attendance_rate < 0.60:
        score += 0.35
    if row.travel_distance_km is not None and row.travel_distance_km > 15:
        score += 0.25
    if row.assignment_completion is not None and row.assignment_completion < 0.50:
        score += 0.25
    return round(min(score, 0.98), 2)


def _risk_tier(score: float) -> str:
    if score >= 0.85:
        return "critical"
    if score > 0.75:
        return "high"
    if score >= 0.45:
        return "medium"
    return "low"


def _drivers(row: BeneficiaryIdentityGraph) -> list[str]:
    drivers: list[str] = []
    if row.attendance_rate is not None and row.attendance_rate < 0.60:
        drivers.append("Low Attendance")
    if row.assignment_completion is not None and row.assignment_completion < 0.50:
        drivers.append("Low Assignment Completion")
    if row.travel_distance_km is not None and row.travel_distance_km > 15:
        drivers.append("High Travel Distance")
    if not drivers:
        drivers.append("Stable Performance")
    return drivers


def _trend(row: BeneficiaryIdentityGraph) -> str:
    if row.attendance_rate is not None and row.attendance_rate < 0.55:
        return "declining"
    if row.attendance_rate is not None and row.attendance_rate > 0.80:
        return "improving"
    return "stable"


def _recommended_action(score: float) -> str:
    if score >= 0.85:
        return "Immediate field worker visit required"
    if score > 0.75:
        return "Contact assigned field worker and schedule home visit"
    if score >= 0.45:
        return "Weekly monitoring and counselor check-in"
    return "Continue routine monitoring"


def _coords(region: str, beneficiary_id: str) -> tuple[float, float]:
    base_lat, base_lng = _REGION_COORDS.get(region, (0.0, 0.0))
    seed = sum(ord(c) for c in beneficiary_id) % 100
    offset = (seed / 1000.0) - 0.05
    return (round(base_lat + offset, 6), round(base_lng - offset, 6))


def _to_response(row: BeneficiaryIdentityGraph) -> BeneficiaryResponse:
    region = row.region or "Unknown"
    score = _risk_score(row)
    tier = _risk_tier(score)
    lat, lng = _coords(region, row.beneficiary_id)
    grade = max(3, min(8, int(round((row.grade_average or 65) / 10))))
    age = grade + 6
    gender = "F" if sum(ord(c) for c in row.beneficiary_id) % 2 == 0 else "M"
    last_activity = row.last_event_at.isoformat() if row.last_event_at else datetime.now(timezone.utc).isoformat()

    return BeneficiaryResponse(
        id=row.beneficiary_id.lower(),
        code=row.beneficiary_id,
        name=f"Beneficiary {row.beneficiary_id}",
        region=region,
        subCounty=_SUBCOUNTY_BY_REGION.get(region, region),
        school=_SCHOOL_BY_REGION.get(region, f"{region} Learning Centre"),
        grade=grade,
        age=age,
        gender=gender,
        riskScore=score,
        riskTier=tier,
        riskDrivers=_drivers(row),
        recommendedAction=_recommended_action(score),
        lastActivity=last_activity,
        attendanceRate=round(float(row.attendance_rate or 0.0), 2),
        assignmentCompletion=round(float(row.assignment_completion or 0.0), 2),
        travelDistanceKm=round(float(row.travel_distance_km or 0.0), 2),
        phoneNumber=None,
        fieldWorkerId=f"fw-{(sum(ord(c) for c in row.beneficiary_id) % 12) + 1:03d}",
        coordinates={"lat": lat, "lng": lng},
        trend=_trend(row),
        enrollmentDate="2023-01-01",
    )


@router.get("/beneficiaries", response_model=PaginatedBeneficiariesResponse)
async def list_beneficiaries(
    search: str | None = None,
    region: str | None = None,
    riskTier: str | None = None,
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=10, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> PaginatedBeneficiariesResponse:
    result = await db.execute(select(BeneficiaryIdentityGraph))
    rows = result.scalars().all()
    items = [_to_response(row) for row in rows]

    if search:
        search_l = search.lower()
        items = [
            item for item in items
            if search_l in item.code.lower()
            or search_l in item.name.lower()
            or search_l in item.region.lower()
            or search_l in item.subCounty.lower()
        ]
    if region and region.lower() != "all":
        items = [item for item in items if item.region.lower() == region.lower()]
    if riskTier and riskTier.lower() != "all":
        items = [item for item in items if item.riskTier.lower() == riskTier.lower()]

    total = len(items)
    start = (page - 1) * pageSize
    page_items = items[start : start + pageSize]
    total_pages = max(1, (total + pageSize - 1) // pageSize)

    return PaginatedBeneficiariesResponse(
        items=page_items,
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=total_pages,
    )


@router.get("/beneficiaries/{beneficiary_id}", response_model=BeneficiaryResponse)
async def get_beneficiary(
    beneficiary_id: str,
    db: AsyncSession = Depends(get_db),
) -> BeneficiaryResponse:
    result = await db.execute(
        select(BeneficiaryIdentityGraph).where(BeneficiaryIdentityGraph.beneficiary_id == beneficiary_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiary ID '{beneficiary_id}' not found",
        )
    return _to_response(row)
