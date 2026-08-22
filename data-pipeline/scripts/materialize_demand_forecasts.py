#!/usr/bin/env python3
"""
Materialize chart-ready demand forecast artifacts into gold.demand_forecasts.

This turns the existing forecast logic into persisted backend-facing artifacts so
frontend routes can read from PostgreSQL instead of rebuilding forecasts on each
request.
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import Json
except ImportError:
    print("Missing dependency: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.ml.demand import REGIONS, forecast_demand_series, forecast_regional_breakdown  # noqa: E402

DEFAULT_DSN = os.getenv(
    "DATABASE_URL",
    "postgresql://inuka:inuka@localhost:5433/inuka_risk_radar",
)
DEFAULT_HORIZON = 7

UPSERT_SQL = """
INSERT INTO gold.demand_forecasts (
    forecast_date,
    region,
    horizon_days,
    historical,
    predicted,
    confidence,
    dates,
    expected_change,
    peak_day,
    summary_confidence,
    risk_factor,
    predicted_demand,
    generated_at
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (forecast_date, region, horizon_days) DO UPDATE SET
    historical = EXCLUDED.historical,
    predicted = EXCLUDED.predicted,
    confidence = EXCLUDED.confidence,
    dates = EXCLUDED.dates,
    expected_change = EXCLUDED.expected_change,
    peak_day = EXCLUDED.peak_day,
    summary_confidence = EXCLUDED.summary_confidence,
    risk_factor = EXCLUDED.risk_factor,
    predicted_demand = EXCLUDED.predicted_demand,
    generated_at = EXCLUDED.generated_at
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Persist demand forecasts into gold.demand_forecasts")
    parser.add_argument("--dsn", default=DEFAULT_DSN)
    parser.add_argument("--days", type=int, default=DEFAULT_HORIZON)
    args = parser.parse_args()

    forecast_date = datetime.now(timezone.utc).date()
    generated_at = datetime.now(timezone.utc)

    breakdown = {
        item["region"]: item for item in forecast_regional_breakdown(horizon_days=args.days)
    }
    regions = ["National", *REGIONS]

    conn = psycopg2.connect(args.dsn)
    try:
        with conn.cursor() as cur:
            for region in regions:
                forecast = forecast_demand_series(region=region, horizon_days=args.days)
                region_breakdown = breakdown.get(region)
                risk_factor = float(region_breakdown.get("risk_factor", 0.0)) if region_breakdown is not None else 0.0
                predicted_demand = float(region_breakdown.get("predicted_demand", 0.0)) if region_breakdown is not None else float(forecast["predicted"][-1] if forecast["predicted"] else 0.0)
                peak_day = forecast["summary"].get("peakDay")
                cur.execute(
                    UPSERT_SQL,
                    (
                        forecast_date,
                        region,
                        args.days,
                        Json(forecast["historical"]),
                        Json(forecast["predicted"]),
                        Json(forecast["confidence"]),
                        Json(forecast["dates"]),
                        float(forecast["summary"].get("expectedChange", 0.0)),
                        peak_day,
                        int(forecast["summary"].get("confidence", 0)),
                        risk_factor,
                        predicted_demand,
                        generated_at,
                    ),
                )
        conn.commit()
    finally:
        conn.close()

    print(f"Materialized demand forecasts for {len(regions)} regions at horizon={args.days} day(s)")


if __name__ == "__main__":
    main()
