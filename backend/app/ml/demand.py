"""
Regional demand forecasting for frontend charts and maps.

Produces chart-ready demand series for `GET /api/v1/demand` and regional
summary breakdowns for `GET /api/v1/demand/breakdown`.
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
    if df.empty:
        raise FileNotFoundError(path)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df


def _risk_pressure(df: pd.DataFrame) -> pd.Series:
    """Proxy demand = share of high-pressure beneficiaries."""
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

    Stable response shape:
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

def _normalize_region(region: str | None) -> str:
    if not region or region.lower() == "national":
        return "National"
    return region


def _prepare_frame(data_path: Path | None = None) -> pd.DataFrame:
    path = data_path or DEFAULT_DATA
    df = _load_frame(path)
    df["pressure"] = _risk_pressure(df)
    return df


def _daily_series(df: pd.DataFrame, region: str) -> pd.Series:
    if region == "National":
        sub = df
    else:
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

            # Simple OLS trend using available historical data only.
            slope = float(np.polyfit(x, y, 1)[0])
            current = float(y[-1])

        # Small reproducible noise for demo forecasts.
        noise = float(rng.normal(0, 0.02))
        forecast = max(
            0.0,
            current + slope * horizon_days + noise,
        )

        if forecast > current + 0.03:
            trend = "up"
        elif forecast < current - 0.03:
            trend = "down"
        else:
            trend = "flat"

        if "dropped_out" in sub.columns:
            high_share = float(
                sub["dropped_out"].astype(float).mean()
            )
        else:
            high_share = float(
                (
                    (sub["attendance_rate"] < 0.55)
                    | (sub["travel_distance_km"] > 18)
                    | (sub["historical_dropouts_in_family"] >= 2)
                ).mean()
            )

    for region in REGIONS:
        region_df = df[df["region"] == region]
        forecast = _build_forecast(region, _daily_series(df, region), horizon_days)
        risk_factor = float(region_df["pressure"].mean()) / 3.0 if not region_df.empty else 0.0
        results.append(
            {
                "region": region,
                "predicted_demand": forecast["predicted"][-1] if forecast["predicted"] else 0.0,
                "historical_trend": forecast["historical"],
                "risk_factor": round(risk_factor, 2),
                "dates": forecast["dates"],
                "summary": forecast["summary"],
            }
        )

    return results



def forecast_as_of(days_back: int = 14, **kwargs: Any) -> dict[str, Any]:
    """Optional helper: clip history window before forecasting."""
    path = kwargs.get("data_path") or DEFAULT_DATA

    df = _load_frame(path)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
    df = df[df["timestamp"] >= cutoff]

    tmp = ML_DIR / "_demand_window.json"
    tmp.write_text(
        df.to_json(
            orient="records",
            date_format="iso",
        ),
        encoding="utf-8",
    )

    try:
        return forecast_demand_series(
            region=kwargs.get("region"),
            horizon_days=kwargs.get("horizon_days", 7),
            data_path=tmp,
        )
    finally:
        if tmp.exists():
            tmp.unlink()