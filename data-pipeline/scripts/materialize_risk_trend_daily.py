#!/usr/bin/env python3
"""
Materialize daily risk trend snapshots into gold.risk_trend_daily.

Each run recomputes one snapshot row per day from persisted
gold.beneficiary_risk_scores, using each beneficiary's latest score for that day.
This gives the dashboard a stable historical artifact instead of synthesizing a
trend at request time.
"""

from __future__ import annotations

import argparse
import os
import sys

try:
    import psycopg2
except ImportError:
    print("Missing dependency: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

DEFAULT_DSN = os.getenv(
    "DATABASE_URL",
    "postgresql://inuka:inuka@localhost:5433/inuka_risk_radar",
)

REFRESH_SQL = """
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

COUNT_SQL = "SELECT COUNT(*) FROM gold.risk_trend_daily"


def main() -> None:
    parser = argparse.ArgumentParser(description="Persist daily risk trend snapshots")
    parser.add_argument("--dsn", default=DEFAULT_DSN)
    args = parser.parse_args()

    conn = psycopg2.connect(args.dsn)
    try:
        with conn.cursor() as cur:
            cur.execute(REFRESH_SQL)
            cur.execute(COUNT_SQL)
            total = int(cur.fetchone()[0])
        conn.commit()
    finally:
        conn.close()

    print(f"Materialized {total} risk trend snapshot day(s) into gold.risk_trend_daily")


if __name__ == "__main__":
    main()
