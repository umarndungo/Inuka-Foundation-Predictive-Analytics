from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.beneficiary import BeneficiaryIdentityGraph
from app.models.metrics import BeneficiaryRiskScore
from app.models.reference import BeneficiaryMaster
from app.schemas.beneficiaries import BeneficiaryResponse, PaginatedBeneficiariesResponse

router = APIRouter()


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
    if score > 0.75:
        return "HIGH"
    if score >= 0.45:
        return "MEDIUM"
    return "LOW"


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
    if score > 0.75:
        return "Automated Field Worker Outreach"
    if score >= 0.45:
        return "Schedule Counselor Check-in"
    return "Continue Routine Monitoring"


def _persisted_drivers(score_row: BeneficiaryRiskScore | None, fallback_row: BeneficiaryIdentityGraph) -> list[str]:
    if score_row and isinstance(score_row.drivers, list) and score_row.drivers:
        return [str(item) for item in score_row.drivers]
    return _drivers(fallback_row)


def _persisted_recommended_action(score_row: BeneficiaryRiskScore | None, fallback_score: float) -> str:
    if score_row and score_row.recommended_action:
        return str(score_row.recommended_action)
    return _recommended_action(fallback_score)


def _to_response(
    row: BeneficiaryIdentityGraph,
    master: BeneficiaryMaster | None,
    latest_score: BeneficiaryRiskScore | None,
) -> BeneficiaryResponse:
    region = row.region or (master.region if master else "Unknown")
    fallback_score = _risk_score(row)
    score = round(float(latest_score.risk_score), 2) if latest_score else fallback_score
    tier = latest_score.risk_tier.upper() if latest_score and latest_score.risk_tier else _risk_tier(score)
    lat = master.home_lat if master and master.home_lat is not None else 0.0
    lng = master.home_lng if master and master.home_lng is not None else 0.0
    last_activity = row.last_event_at.isoformat() if row.last_event_at else datetime.now(timezone.utc).isoformat()

    return BeneficiaryResponse(
        id=row.beneficiary_id.lower(),
        code=row.beneficiary_id,
        name=master.full_name if master else row.beneficiary_id,
        region=region,
        subCounty=master.sub_county if master else region,
        school=master.school_name if master else f"{region} Learning Centre",
        grade=master.grade if master else max(3, min(8, int(round((row.grade_average or 65) / 10)))),
        age=master.age if master else 12,
        gender=master.gender if master else "F",
        riskScore=score,
        riskTier=tier,
        riskDrivers=_persisted_drivers(latest_score, row),
        recommendedAction=_persisted_recommended_action(latest_score, score),
        lastActivity=last_activity,
        attendanceRate=round(float(row.attendance_rate or 0.0), 2),
        assignmentCompletion=round(float(row.assignment_completion or 0.0), 2),
        travelDistanceKm=round(float(row.travel_distance_km or 0.0), 2),
        phoneNumber=master.phone_number if master else None,
        fieldWorkerId=master.field_worker_id if master else None,
        coordinates={"lat": lat, "lng": lng},
        trend=_trend(row),
        enrollmentDate=master.enrollment_date.isoformat() if master else "2023-01-01",
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
    master_result = await db.execute(select(BeneficiaryMaster))
    masters = {row.beneficiary_id: row for row in master_result.scalars().all()}
    score_result = await db.execute(select(BeneficiaryRiskScore).order_by(BeneficiaryRiskScore.scored_at.desc()))
    latest_scores: dict[str, BeneficiaryRiskScore] = {}
    for score_row in score_result.scalars().all():
        latest_scores.setdefault(score_row.beneficiary_id, score_row)
    items = [_to_response(row, masters.get(row.beneficiary_id), latest_scores.get(row.beneficiary_id)) for row in rows]

    if search:
        search_l = search.lower()
        items = [
            item
            for item in items
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
    canonical_id = beneficiary_id.strip().upper()

    result = await db.execute(
        select(BeneficiaryIdentityGraph).where(BeneficiaryIdentityGraph.beneficiary_id == canonical_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiary ID '{beneficiary_id}' not found",
        )

    master_result = await db.execute(
        select(BeneficiaryMaster).where(BeneficiaryMaster.beneficiary_id == canonical_id)
    )
    master = master_result.scalar_one_or_none()
    score_result = await db.execute(
        select(BeneficiaryRiskScore)
        .where(BeneficiaryRiskScore.beneficiary_id == canonical_id)
        .order_by(BeneficiaryRiskScore.scored_at.desc())
        .limit(1)
    )
    latest_score = score_result.scalar_one_or_none()
    return _to_response(row, master, latest_score)
