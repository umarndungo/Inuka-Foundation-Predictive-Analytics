"""
Regional demand forecasting for the Demand Map (`GET /api/v1/demand`).

Lightweight, reproducible forecasts from synthetic beneficiary / telemetry
aggregates — rolling means + simple linear trend per region. random_state=42.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

RANDOM_STATE = 42
REGIONS = ("Nairobi", "Kisumu", "Nakuru", "Mombasa", "Eldoret")

ML_DIR = Path(__file__).resolve().parent
REPO_ROOT = ML_DIR.parents[2]
DEFAULT_DATA = REPO_ROOT / "data-pipeline" / "data" / "synthetic_beneficiaries.json"


def _load_frame(path: Path) -> pd.DataFrame:
    df = pd.DataFrame(json.loads(path.read_text(encoding="utf-8")))
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df


def _risk_pressure(df: pd.DataFrame) -> pd.Series:
    """Proxy demand = share of high-pressure beneficiaries (outreach workload)."""
    return (
        (df["attendance_rate"] < 0.60).astype(float)
        + (df["travel_distance_km"] > 15).astype(float)
        + (df["historical_dropouts_in_family"] >= 1).astype(float)
    )


def forecast_regional_demand(
    horizon_days: int = 7,
    data_path: Path | None = None,
) -> list[dict[str, Any]]:
    """
    Return per-region demand forecast for Backend / Frontend.

    Shape (stable contract for DemandChart / DemandMap):
      {
        "region": "Kisumu",
        "current_demand_index": 1.42,
        "forecast_demand_index": 1.51,
        "trend": "up" | "down" | "flat",
        "horizon_days": 7,
        "high_risk_share": 0.31,
        "beneficiary_count": 98,
        "generated_at": "..."
      }
    """
    rng = np.random.default_rng(RANDOM_STATE)
    path = data_path or DEFAULT_DATA
    df = _load_frame(path)
    df["pressure"] = _risk_pressure(df)

    now = datetime.now(timezone.utc).replace(microsecond=0)
    results: list[dict[str, Any]] = []

    for region in REGIONS:
        sub = df[df["region"] == region]
        if sub.empty:
            results.append(
                {
                    "region": region,
                    "current_demand_index": 0.0,
                    "forecast_demand_index": 0.0,
                    "trend": "flat",
                    "horizon_days": horizon_days,
                    "high_risk_share": 0.0,
                    "beneficiary_count": 0,
                    "generated_at": now.isoformat().replace("+00:00", "Z"),
                }
            )
            continue

        # Build a synthetic daily series from timestamps for a light trend fit.
        daily = (
            sub.set_index("timestamp")
            .sort_index()
            .resample("D")["pressure"]
            .mean()
            .dropna()
        )
        if len(daily) < 2:
            current = float(sub["pressure"].mean())
            slope = 0.0
        else:
            y = daily.to_numpy(dtype=float)
            x = np.arange(len(y), dtype=float)
            # Simple OLS trend (no leakage — descriptive on available history only).
            slope = float(np.polyfit(x, y, 1)[0])
            current = float(y[-1])

        # Small reproducible noise so demo forecasts aren't identical every region-day.
        noise = float(rng.normal(0, 0.02))
        forecast = max(0.0, current + slope * horizon_days + noise)
        if forecast > current + 0.03:
            trend = "up"
        elif forecast < current - 0.03:
            trend = "down"
        else:
            trend = "flat"

        if "dropped_out" in sub.columns:
            high_share = float(sub["dropped_out"].astype(float).mean())
        else:
            high_share = float(
                (
                    (sub["attendance_rate"] < 0.55)
                    | (sub["travel_distance_km"] > 18)
                    | (sub["historical_dropouts_in_family"] >= 2)
                ).mean()
            )

        results.append(
            {
                "region": region,
                "current_demand_index": round(current, 4),
                "forecast_demand_index": round(forecast, 4),
                "trend": trend,
                "horizon_days": horizon_days,
                "high_risk_share": round(high_share, 4),
                "beneficiary_count": int(len(sub)),
                "generated_at": now.isoformat().replace("+00:00", "Z"),
            }
        )

    return results


def forecast_as_of(days_back: int = 14, **kwargs: Any) -> list[dict[str, Any]]:
    """Optional helper: clip history window before forecasting."""
    path = kwargs.get("data_path") or DEFAULT_DATA
    df = _load_frame(path)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
    df = df[df["timestamp"] >= cutoff]
    tmp = ML_DIR / "_demand_window.json"
    tmp.write_text(df.to_json(orient="records", date_format="iso"), encoding="utf-8")
    try:
        return forecast_regional_demand(
            horizon_days=kwargs.get("horizon_days", 7),
            data_path=tmp,
        )
    finally:
        if tmp.exists():
            tmp.unlink()
