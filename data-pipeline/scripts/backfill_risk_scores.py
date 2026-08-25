#!/usr/bin/env python3
"""
Backfill historical synthetic risk scores into gold.beneficiary_risk_scores.

This gives the dashboard immediate multi-day trend depth for demo/testing by
creating one synthetic score snapshot per beneficiary per day across a lookback
window, then refreshing gold.risk_trend_daily from those persisted scores.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    import psycopg2
    from psycopg2.extras import Json
except ImportError:
    print("Missing dependency: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "backend"))

DEFAULT_DSN = os.getenv(
    "DATABASE_URL",
    "postgresql://inuka:inuka@localhost:5433/inuka_risk_radar",
)
DEFAULT_SEED_PATH = REPO_ROOT / "data-pipeline" / "data" / "synthetic_beneficiaries.json"
DEFAULT_DAYS = 30
RANDOM_SEED = 42

UPSERT_SCORE_SQL = """
INSERT INTO gold.beneficiary_risk_scores (
    beneficiary_id,
    scored_at,
    risk_score,
    risk_tier,
    drivers,
    recommended_action,
    model_version,
    automation_triggered
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
"""

REFRESH_TREND_SQL = """
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
        COUNT(*) FILTER (WHERE risk_tier = 'HIGH')::INTEGER AS high_count,
        0::INTEGER AS critical_count,
        COUNT(*)::INTEGER AS total_count,
        ROUND(
            (COUNT(*) FILTER (WHERE risk_tier = 'HIGH')::NUMERIC)
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

CLEAR_SCORES_SQL = "DELETE FROM gold.beneficiary_risk_scores"
CLEAR_TREND_SQL = "DELETE FROM gold.risk_trend_daily"


def stub_score(payload: dict[str, Any], threshold: float = 0.75) -> dict[str, Any]:
    attendance = payload.get("attendance_rate")
    travel = payload.get("travel_distance_km")
    completion = payload.get("assignment_completion")

    score = 0.15
    drivers: list[str] = []
    if attendance is not None and float(attendance) < 0.60:
        score += 0.35
        drivers.append("Low Attendance")
    if travel is not None and float(travel) > 15.0:
        score += 0.25
        drivers.append("High Travel Distance")
    if completion is not None and float(completion) < 0.50:
        score += 0.25
        drivers.append("Low Assignment Completion")
    score = min(score, 0.98)

    tier = "HIGH" if score > threshold else "MEDIUM" if score >= 0.45 else "LOW"
    automation = score > threshold
    return {
        "risk_score": round(score, 4),
        "risk_tier": tier,
        "drivers": drivers or ["Multiple Moderate Risk Factors"],
        "recommended_action": (
            "Automated Field Worker Outreach"
            if automation
            else "Schedule Counselor Check-in"
            if tier == "MEDIUM"
            else "Continue Routine Monitoring"
        ),
        "automation_triggered": automation,
    }


def jitter_record(row: dict[str, Any], rng: random.Random, day_offset: int) -> dict[str, Any]:
    drift = day_offset / max(1, DEFAULT_DAYS)
    attendance = max(0.05, min(1.0, float(row["attendance_rate"]) + rng.uniform(-0.03, 0.03) - (drift * 0.06)))
    completion = max(0.05, min(1.0, float(row["assignment_completion"]) + rng.uniform(-0.04, 0.04) - (drift * 0.05)))
    travel = max(0.1, float(row["travel_distance_km"]) + rng.uniform(-1.5, 1.5) + (drift * 1.8))
    return {
        **row,
        "attendance_rate": round(attendance, 4),
        "assignment_completion": round(completion, 4),
        "travel_distance_km": round(travel, 2),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill synthetic historical risk scores")
    parser.add_argument("--dsn", default=DEFAULT_DSN)
    parser.add_argument("--seed-file", type=Path, default=DEFAULT_SEED_PATH)
    parser.add_argument("--days", type=int, default=DEFAULT_DAYS)
    parser.add_argument("--limit", type=int, default=250, help="Max beneficiaries to backfill (default: 250)")
    parser.add_argument("--replace", action="store_true", help="Clear existing risk scores/trend before backfill")
    args = parser.parse_args()

    if not args.seed_file.exists():
        print(f"Seed file not found: {args.seed_file}", file=sys.stderr)
        sys.exit(1)

    records = json.loads(args.seed_file.read_text(encoding="utf-8"))[: args.limit]
    rng = random.Random(RANDOM_SEED)
    now = datetime.now(timezone.utc)

    conn = psycopg2.connect(args.dsn)
    inserted = 0
    try:
        with conn.cursor() as cur:
            if args.replace:
                cur.execute(CLEAR_TREND_SQL)
                cur.execute(CLEAR_SCORES_SQL)

            for day_offset in range(args.days):
                snapshot_day = now - timedelta(days=(args.days - day_offset - 1))
                for row in records:
                    shaped = jitter_record(row, rng, day_offset)
                    scored = stub_score(shaped)
                    scored_at = snapshot_day.replace(
                        hour=8 + (inserted % 10),
                        minute=inserted % 60,
                        second=0,
                        microsecond=0,
                    )
                    cur.execute(
                        UPSERT_SCORE_SQL,
                        (
                            shaped["beneficiary_id"],
                            scored_at,
                            scored["risk_score"],
                            scored["risk_tier"],
                            Json(scored["drivers"]),
                            scored["recommended_action"],
                            "backfill-stub",
                            scored["automation_triggered"],
                        ),
                    )
                    inserted += 1

            cur.execute(REFRESH_TREND_SQL)
        conn.commit()
    finally:
        conn.close()

    print(
        f"Backfilled {inserted} synthetic risk scores across {args.days} day(s) "
        f"for {min(len(records), args.limit)} beneficiaries and refreshed gold.risk_trend_daily"
    )


if __name__ == "__main__":
    main()
