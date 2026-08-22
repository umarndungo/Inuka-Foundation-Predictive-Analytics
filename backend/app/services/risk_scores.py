from __future__ import annotations

from typing import Any

from sqlalchemy import desc, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.metrics import BeneficiaryRiskScore


async def persist_risk_score(
    db: AsyncSession,
    *,
    beneficiary_id: str,
    risk_score: float,
    risk_tier: str,
    drivers: list[str],
    recommended_action: str,
    model_version: str,
    automation_triggered: bool,
) -> BeneficiaryRiskScore:
    row = BeneficiaryRiskScore(
        beneficiary_id=beneficiary_id,
        risk_score=risk_score,
        risk_tier=risk_tier,
        drivers=drivers,
        recommended_action=recommended_action,
        model_version=model_version,
        automation_triggered=automation_triggered,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def latest_scores_by_beneficiary(db: AsyncSession) -> dict[str, BeneficiaryRiskScore]:
    result = await db.execute(
        select(BeneficiaryRiskScore).order_by(BeneficiaryRiskScore.beneficiary_id, desc(BeneficiaryRiskScore.scored_at))
    )
    rows = result.scalars().all()
    latest: dict[str, BeneficiaryRiskScore] = {}
    for row in rows:
        latest.setdefault(row.beneficiary_id, row)
    return latest


async def refresh_risk_trend_snapshot(db: AsyncSession) -> None:
    await db.execute(
        text(
            """
            WITH ranked AS (
                SELECT
                    beneficiary_id,
                    DATE(scored_at) AS snapshot_date,
                    risk_tier,
                    risk_score,
                    ROW_NUMBER() OVER (
                        PARTITION BY beneficiary_id, DATE(scored_at)
                        ORDER BY scored_at DESC, score_id DESC
                    ) AS rn
                FROM gold.beneficiary_risk_scores
            ),
            latest_per_day AS (
                SELECT snapshot_date, risk_tier, risk_score
                FROM ranked
                WHERE rn = 1
            ),
            aggregated AS (
                SELECT
                    snapshot_date,
                    COUNT(*) FILTER (WHERE risk_tier = 'LOW')::INTEGER AS low_count,
                    COUNT(*) FILTER (WHERE risk_tier = 'MEDIUM')::INTEGER AS medium_count,
                    COUNT(*) FILTER (WHERE risk_tier = 'HIGH' AND risk_score < 0.85)::INTEGER AS high_count,
                    COUNT(*) FILTER (WHERE risk_tier = 'HIGH' AND risk_score >= 0.85)::INTEGER AS critical_count,
                    COUNT(*)::INTEGER AS total_count,
                    ROUND(
                        ((COUNT(*) FILTER (WHERE risk_tier = 'HIGH' AND risk_score < 0.85)
                         + COUNT(*) FILTER (WHERE risk_tier = 'HIGH' AND risk_score >= 0.85))::NUMERIC)
                        / NULLIF(COUNT(*)::NUMERIC, 0),
                        4
                    ) AS overall_ratio
                FROM latest_per_day
                GROUP BY snapshot_date
            )
            INSERT INTO gold.risk_trend_daily (
                snapshot_date,
                low_count,
                medium_count,
                high_count,
                critical_count,
                total_count,
                overall_ratio,
                generated_at
            )
            SELECT
                snapshot_date,
                COALESCE(low_count, 0),
                COALESCE(medium_count, 0),
                COALESCE(high_count, 0),
                COALESCE(critical_count, 0),
                COALESCE(total_count, 0),
                COALESCE(overall_ratio, 0),
                NOW()
            FROM aggregated
            ON CONFLICT (snapshot_date) DO UPDATE SET
                low_count = EXCLUDED.low_count,
                medium_count = EXCLUDED.medium_count,
                high_count = EXCLUDED.high_count,
                critical_count = EXCLUDED.critical_count,
                total_count = EXCLUDED.total_count,
                overall_ratio = EXCLUDED.overall_ratio,
                generated_at = EXCLUDED.generated_at
            """
        )
    )
    await db.commit()
