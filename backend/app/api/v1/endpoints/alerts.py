from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.beneficiary import BeneficiaryIdentityGraph
from app.models.operations import Alert, Intervention
from app.schemas.alerts import AlertResponse, InterventionResponse

router = APIRouter()


def _to_alert_response(row: Alert) -> AlertResponse:
    return AlertResponse(
        id=row.alert_id,
        type=row.type,
        severity=row.severity,
        status=row.status,
        timestamp=row.created_at.isoformat(),
        location=row.location,
        beneficiaryId=row.beneficiary_id,
        beneficiaryCode=row.beneficiary_id,
        deviceId=row.device_id,
        description=row.description,
        metadata=row.alert_metadata,
        acknowledgedBy=row.acknowledged_by,
        acknowledgedAt=row.acknowledged_at.isoformat() if row.acknowledged_at else None,
        resolvedAt=row.resolved_at.isoformat() if row.resolved_at else None,
    )


@router.get("/alerts", response_model=list[AlertResponse])
async def list_alerts(
    severity: str | None = None,
    status: str | None = None,
    region: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[AlertResponse]:
    query = select(Alert).order_by(desc(Alert.created_at)).limit(limit)
    if severity and severity != "all":
        query = query.where(Alert.severity == severity)
    if status and status != "all":
        query = query.where(Alert.status == status)
    if region and region != "all":
        query = query.where(Alert.location.ilike(f"%{region}%"))

    result = await db.execute(query)
    rows = result.scalars().all()
    return [_to_alert_response(row) for row in rows]


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(alert_id: str, db: AsyncSession = Depends(get_db)) -> AlertResponse:
    result = await db.execute(select(Alert).where(Alert.alert_id == alert_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    row.status = "acknowledged"
    row.acknowledged_by = row.field_worker_id or "system"
    row.acknowledged_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _to_alert_response(row)


@router.post("/alerts/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(alert_id: str, db: AsyncSession = Depends(get_db)) -> AlertResponse:
    result = await db.execute(select(Alert).where(Alert.alert_id == alert_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    row.status = "resolved"
    row.resolved_at = datetime.now(timezone.utc)

    intervention = Intervention(
        intervention_id=f"INT-{uuid.uuid4().hex[:8].upper()}",
        beneficiary_id=row.beneficiary_id,
        field_worker_id=row.field_worker_id,
        triggered_by_alert_id=row.alert_id,
        intervention_type="alert_resolution",
        status="completed",
        created_at=row.created_at,
        completed_at=row.resolved_at,
        notes=f"Resolved alert {row.alert_id}",
    )
    db.add(intervention)
    await db.commit()
    await db.refresh(row)
    return _to_alert_response(row)


@router.get("/interventions", response_model=list[InterventionResponse])
async def list_interventions(
    beneficiary_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[InterventionResponse]:
    query = select(Intervention).order_by(desc(Intervention.created_at)).limit(limit)
    if beneficiary_id:
        query = query.where(Intervention.beneficiary_id == beneficiary_id)
    result = await db.execute(query)
    rows = result.scalars().all()
    return [
        InterventionResponse(
            intervention_id=row.intervention_id,
            beneficiary_id=row.beneficiary_id,
            field_worker_id=row.field_worker_id,
            triggered_by_alert_id=row.triggered_by_alert_id,
            intervention_type=row.intervention_type,
            status=row.status,
            created_at=row.created_at.isoformat(),
            completed_at=row.completed_at.isoformat() if row.completed_at else None,
            notes=row.notes,
        )
        for row in rows
    ]


@router.post("/alerts/bootstrap-from-graph", response_model=list[AlertResponse])
async def bootstrap_alerts_from_graph(
    limit: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[AlertResponse]:
    result = await db.execute(
        select(BeneficiaryIdentityGraph)
        .where(BeneficiaryIdentityGraph.risk_tier.in_(["HIGH", "MEDIUM"]))
        .limit(limit)
    )
    rows = result.scalars().all()
    created: list[Alert] = []
    for row in rows:
        alert = Alert(
            alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
            beneficiary_id=row.beneficiary_id,
            field_worker_id=None,
            severity="high" if row.risk_tier == "HIGH" else "medium",
            type="high_risk" if row.risk_tier == "HIGH" else "telemetry_anomaly",
            status="new",
            description=f"Beneficiary {row.beneficiary_id} flagged {row.risk_tier} risk. Assessment recommended.",
            location=row.region or "Unknown",
            device_id=None,
            alert_metadata={},
            created_at=datetime.now(timezone.utc),
            acknowledged_by=None,
            acknowledged_at=None,
            resolved_at=None,
        )
        db.add(alert)
        created.append(alert)
    await db.commit()
    for alert in created:
        await db.refresh(alert)
    return [_to_alert_response(alert) for alert in created]
