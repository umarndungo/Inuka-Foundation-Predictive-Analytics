from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.metrics import BeneficiaryRiskScore, RegionalRiskStats, RiskTrendDaily
from app.models.reference import FieldWorker
from app.schemas.dashboard import (
    FieldWorkerResponse,
    KPIMetricResponse,
    MapRegionResponse,
    RiskDistributionResponse,
    RiskTrendPointResponse,
    SystemStatusResponse,
)

router = APIRouter()

_REGION_COORDS: dict[str, tuple[float, float]] = {
    "Nairobi": (-1.286389, 36.817223),
    "Kisumu": (-0.091702, 34.767956),
    "Nakuru": (-0.303099, 36.080025),
    "Mombasa": (-4.043477, 39.668206),
    "Eldoret": (0.514277, 35.269779),
}




def _slug(region: str) -> str:
    return region.lower().replace(" ", "-")


def _region_code(region: str) -> str:
    parts = region.split()
    if len(parts) == 1:
        return region[:3].upper()
    return "".join(part[0] for part in parts).upper()


@router.get("/risk/distribution", response_model=RiskDistributionResponse)
async def get_risk_distribution(db: AsyncSession = Depends(get_db)) -> RiskDistributionResponse:
    score_result = await db.execute(select(BeneficiaryRiskScore))
    scores = score_result.scalars().all()
    if scores:
        latest: dict[str, BeneficiaryRiskScore] = {}
        for score in sorted(scores, key=lambda s: (s.beneficiary_id, s.scored_at), reverse=True):
            latest.setdefault(score.beneficiary_id, score)
        low = sum(1 for s in latest.values() if s.risk_tier == "LOW")
        medium = sum(1 for s in latest.values() if s.risk_tier == "MEDIUM")
        high_only = sum(1 for s in latest.values() if s.risk_tier == "HIGH" and float(s.risk_score) < 0.85)
        critical = sum(1 for s in latest.values() if s.risk_tier == "HIGH" and float(s.risk_score) >= 0.85)
        total = low + medium + high_only + critical
        return RiskDistributionResponse(low=low, medium=medium, high=high_only, critical=critical, total=total)

    result = await db.execute(select(RegionalRiskStats))
    rows = result.scalars().all()
    low = sum(int(r.low_risk_count or 0) for r in rows)
    medium = sum(int(r.medium_risk_count or 0) for r in rows)
    high = sum(int(r.high_risk_count or 0) for r in rows)
    critical = 0
    total = low + medium + high + critical
    return RiskDistributionResponse(low=low, medium=medium, high=high, critical=critical, total=total)


@router.get("/metrics/kpi", response_model=list[KPIMetricResponse])
async def get_kpi_metrics(db: AsyncSession = Depends(get_db)) -> list[KPIMetricResponse]:
    result = await db.execute(select(RegionalRiskStats))
    rows = result.scalars().all()

    total_beneficiaries = sum(int(r.beneficiary_count or 0) for r in rows)
    high_risk = sum(int(r.high_risk_count or 0) for r in rows)
    alerts_result = await db.execute(text("SELECT COALESCE(SUM(alert_count), 0) FROM gold.regional_alert_stats"))
    alert_count = int(alerts_result.scalar() or 0)
    latest_sync = max((r.last_ingested_at for r in rows if r.last_ingested_at is not None), default=None)
    with_telemetry = sum(int(r.with_telemetry_count or 0) for r in rows)

    return [
        KPIMetricResponse(
            label="Enrolled",
            value=total_beneficiaries,
            change=0.0,
            changeLabel="vs last sync",
            description="Total enrolled synthetic beneficiaries",
            icon="users",
            status="normal",
            isInverse=False,
        ),
        KPIMetricResponse(
            label="High Risk",
            value=high_risk,
            change=0.0,
            changeLabel="vs last sync",
            description="Beneficiaries currently flagged HIGH risk",
            icon="shield-alert",
            status="critical" if high_risk else "normal",
            isInverse=True,
        ),
        KPIMetricResponse(
            label="Alerts",
            value=alert_count,
            change=0.0,
            changeLabel="vs last sync",
            description="Escalations published to system.alerts",
            icon="bell",
            status="warning" if alert_count else "normal",
            isInverse=True,
        ),
        KPIMetricResponse(
            label="Telemetry Coverage",
            value=f"{round((with_telemetry / total_beneficiaries) * 100, 1) if total_beneficiaries else 0}%",
            change=0.0,
            changeLabel="vs last sync",
            description="Share of beneficiaries with live telemetry",
            icon="wifi",
            status="positive" if with_telemetry else "warning",
            isInverse=False,
        ),
    ]


@router.get("/map/regions", response_model=list[MapRegionResponse])
async def get_map_regions(db: AsyncSession = Depends(get_db)) -> list[MapRegionResponse]:
    result = await db.execute(select(RegionalRiskStats))
    rows = result.scalars().all()
    regions: list[MapRegionResponse] = []
    for row in rows:
        with_telemetry = int(row.with_telemetry_count or 0)
        risk_score = round((int(row.high_risk_count or 0) / with_telemetry), 2) if with_telemetry else 0.0
        regions.append(
            MapRegionResponse(
                name=row.region,
                code=_region_code(row.region),
                coordinates=_REGION_COORDS.get(row.region, (0.0, 0.0)),
                beneficiaries=int(row.beneficiary_count or 0),
                highRisk=int(row.high_risk_count or 0),
                riskScore=risk_score,
            )
        )
    return regions


@router.get("/system/status", response_model=SystemStatusResponse)
async def get_system_status(db: AsyncSession = Depends(get_db)) -> SystemStatusResponse:
    result = await db.execute(select(RegionalRiskStats))
    rows = result.scalars().all()
    latest_sync = max((r.last_ingested_at for r in rows if r.last_ingested_at is not None), default=None)
    devices_total = sum(int(r.beneficiary_count or 0) for r in rows)

    recent_cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
    online_result = await db.execute(
        text(
            """
            SELECT COUNT(DISTINCT beneficiary_id)
            FROM bronze.telemetry_events
            WHERE topic = 'beneficiary.telemetry'
              AND COALESCE(event_timestamp, ingested_at) >= :recent_cutoff
            """
        ),
        {"recent_cutoff": recent_cutoff},
    )
    devices_online = int(online_result.scalar() or 0)

    rate_result = await db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM bronze.telemetry_events
            WHERE topic = 'beneficiary.telemetry'
              AND ingested_at >= NOW() - INTERVAL '1 minute'
            """
        )
    )
    ingestion_rate = int(rate_result.scalar() or 0)

    return SystemStatusResponse(
        isOnline=True,
        lastSync=latest_sync.isoformat() if latest_sync else None,
        syncStatus="synced" if latest_sync else "offline",
        devicesOnline=devices_online,
        devicesTotal=devices_total,
        ingestionRate=ingestion_rate,
        apiLatency=120,
    )


@router.get("/field-workers", response_model=list[FieldWorkerResponse])
async def get_field_workers(db: AsyncSession = Depends(get_db)) -> list[FieldWorkerResponse]:
    worker_result = await db.execute(select(FieldWorker).where(FieldWorker.active.is_(True)))
    workers = worker_result.scalars().all()
    stats_result = await db.execute(select(RegionalRiskStats))
    stats_by_region = {row.region: row for row in stats_result.scalars().all()}
    now = datetime.now(timezone.utc)

    region_counts: dict[str, int] = {}
    for worker in workers:
        region_counts[worker.region] = region_counts.get(worker.region, 0) + 1

    responses: list[FieldWorkerResponse] = []
    for worker in workers:
        stat = stats_by_region.get(worker.region)
        assigned_total = int(stat.beneficiary_count or 0) if stat else 0
        worker_count = max(1, region_counts.get(worker.region, 1))
        per_worker = max(1, assigned_total // worker_count) if assigned_total else 1
        last_sync = stat.last_ingested_at.isoformat() if stat and stat.last_ingested_at else now.isoformat()
        is_online = bool(stat and stat.last_ingested_at and stat.last_ingested_at >= now - timedelta(minutes=10))
        responses.append(
            FieldWorkerResponse(
                id=worker.field_worker_id,
                code=worker.code,
                name=worker.full_name,
                region=worker.region,
                phoneNumber=worker.phone_number or "+254 7XX XXX XXX",
                assignedBeneficiaries=per_worker,
                lastSync=last_sync,
                isOnline=is_online,
            )
        )

    return responses


@router.get("/risk/trend", response_model=list[RiskTrendPointResponse])
async def get_risk_trend(period: str = "7d", db: AsyncSession = Depends(get_db)) -> list[RiskTrendPointResponse]:
    points = 1 if period == "24h" else 7 if period == "7d" else 30

    snapshot_result = await db.execute(
        select(RiskTrendDaily).order_by(RiskTrendDaily.snapshot_date.desc()).limit(points)
    )
    snapshots = list(reversed(snapshot_result.scalars().all()))
    if snapshots:
        return [
            RiskTrendPointResponse(
                date=snapshot.snapshot_date.isoformat(),
                overall=round(float(snapshot.overall_ratio), 2),
                highRisk=int(snapshot.high_count),
                critical=int(snapshot.critical_count),
                low=int(snapshot.low_count),
                medium=int(snapshot.medium_count),
            )
            for snapshot in snapshots
        ]

    score_result = await db.execute(select(BeneficiaryRiskScore).order_by(BeneficiaryRiskScore.scored_at.desc()))
    scores = score_result.scalars().all()

    if scores:
        buckets: dict[str, dict[str, BeneficiaryRiskScore]] = {}
        for score in scores:
            day_key = score.scored_at.date().isoformat()
            day_bucket = buckets.setdefault(day_key, {})
            if score.beneficiary_id not in day_bucket:
                day_bucket[score.beneficiary_id] = score
        days = sorted(buckets.keys())[-points:]
        trend: list[RiskTrendPointResponse] = []
        for day in days:
            day_scores = list(buckets[day].values())
            low = sum(1 for s in day_scores if s.risk_tier == "LOW")
            medium = sum(1 for s in day_scores if s.risk_tier == "MEDIUM")
            high_only = sum(1 for s in day_scores if s.risk_tier == "HIGH" and float(s.risk_score) < 0.85)
            critical = sum(1 for s in day_scores if s.risk_tier == "HIGH" and float(s.risk_score) >= 0.85)
            total = max(1, low + medium + high_only + critical)
            overall = round((high_only + critical) / total, 2)
            trend.append(
                RiskTrendPointResponse(
                    date=day,
                    overall=overall,
                    highRisk=high_only,
                    critical=critical,
                    low=low,
                    medium=medium,
                )
            )
        return trend

    return []
