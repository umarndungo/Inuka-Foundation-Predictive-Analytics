from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.metrics import RegionalRiskStats
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

_FIELD_WORKER_NAMES: dict[str, list[str]] = {
    "Nairobi": ["James Ochieng", "Grace Wanjiku"],
    "Kisumu": ["Peter Otieno", "Mary Atieno", "David Omondi"],
    "Nakuru": ["Ruth Cherono", "Brian Kiptoo"],
    "Mombasa": ["Fatma Ali", "Asha Salim"],
    "Eldoret": ["Mercy Jepchirchir", "Daniel Kimutai"],
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
    result = await db.execute(select(RegionalRiskStats))
    rows = result.scalars().all()
    now = datetime.now(timezone.utc)
    workers: list[FieldWorkerResponse] = []

    worker_index = 1
    for row in rows:
        region = row.region
        names = _FIELD_WORKER_NAMES.get(region, [f"{region} Field Worker"])
        assigned_total = int(row.beneficiary_count or 0)
        per_worker = max(1, assigned_total // max(1, len(names)))
        last_sync = row.last_ingested_at.isoformat() if row.last_ingested_at else now.isoformat()
        is_online = bool(row.last_ingested_at and row.last_ingested_at >= now - timedelta(minutes=10))

        for idx, name in enumerate(names):
            workers.append(
                FieldWorkerResponse(
                    id=f"fw-{worker_index:03d}",
                    code=f"FW-{worker_index:03d}",
                    name=name,
                    region=region,
                    phoneNumber="+254 7XX XXX XXX",
                    assignedBeneficiaries=per_worker if idx < len(names) - 1 else max(1, assigned_total - per_worker * (len(names) - 1)),
                    lastSync=last_sync,
                    isOnline=is_online if idx == 0 else (is_online and idx % 2 == 0),
                )
            )
            worker_index += 1

    return workers


@router.get("/risk/trend", response_model=list[RiskTrendPointResponse])
async def get_risk_trend(period: str = "7d", db: AsyncSession = Depends(get_db)) -> list[RiskTrendPointResponse]:
    points = 1 if period == "24h" else 7 if period == "7d" else 30
    result = await db.execute(select(RegionalRiskStats))
    rows = result.scalars().all()

    base_low = sum(int(r.low_risk_count or 0) for r in rows)
    base_medium = sum(int(r.medium_risk_count or 0) for r in rows)
    base_high = sum(int(r.high_risk_count or 0) for r in rows)
    total = max(1, base_low + base_medium + base_high)
    base_critical = max(0, int(round(base_high * 0.15)))

    now = datetime.now(timezone.utc)
    trend: list[RiskTrendPointResponse] = []
    for i in range(points):
        day_offset = points - i - 1
        ts = now - timedelta(hours=day_offset) if period == "24h" else now - timedelta(days=day_offset)
        drift = i - max(0, points // 2)
        critical = max(0, base_critical + drift)
        high = max(0, base_high + drift * 2)
        medium = max(0, base_medium - drift)
        low = max(0, total - high - medium)
        overall = round((high + critical) / max(1, low + medium + high + critical), 2)
        trend.append(
            RiskTrendPointResponse(
                date=ts.date().isoformat(),
                overall=overall,
                highRisk=high,
                critical=critical,
                low=low,
                medium=medium,
            )
        )

    return trend
