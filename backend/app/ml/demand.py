"""
Regional demand forecasting for frontend charts and maps.

Produces chart-ready demand series for `GET /api/v1/demand` and regional
summary breakdowns for `GET /api/v1/demand/breakdown`.

Changes from v1:
- Fixed broken function structure: forecast_regional_demand() had an
  incomplete body, _build_forecast was called but never defined, and
  results.append was orphaned inside _daily_series. All functions are
  now self-contained and independently callable.
- forecast_demand_series() is now a proper public function (was referenced
  in forecast_as_of but never defined).
- Added allocate_field_workers() — maps forecast demand index to a
  recommended field worker headcount per region within a total budget.
  Result is attached to every forecast_regional_demand() response.
- Reproducible noise uses numpy Generator (default_rng), not legacy
  RandomState.
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

# Total field worker budget to allocate across all regions.
FIELD_WORKER_BUDGET = 20


# ---------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------

def _load_frame(path: Path) -> pd.DataFrame:
    df = pd.DataFrame(json.loads(path.read_text(encoding="utf-8")))
    if df.empty:
        raise FileNotFoundError(path)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df


def _normalize_region(region: str | None) -> str:
    if not region or region.lower() == "national":
        return "National"
    return region


# ---------------------------------------------------------------------
# Demand proxy
# ---------------------------------------------------------------------

def _risk_pressure(df: pd.DataFrame) -> pd.Series:
    """
    Heuristic demand proxy: count of risk flags per beneficiary (max 3.0).

    Used to build the daily time series for trend fitting.
    Unchanged from v1 — kept simple for the synthetic dataset.
    """
    return (
        (df["attendance_rate"] < 0.60).astype(float)
        + (df["travel_distance_km"] > 15).astype(float)
        + (df["historical_dropouts_in_family"] >= 1).astype(float)
    )


# ---------------------------------------------------------------------
# Daily series and forecast
# ---------------------------------------------------------------------

def _build_daily_series(sub: pd.DataFrame) -> pd.Series:
    """Resample pressure scores to a daily mean series."""
    return (
        sub.set_index("timestamp")
        .sort_index()
        .resample("D")["pressure"]
        .mean()
        .dropna()
    )


def _linear_forecast(
    daily: pd.Series,
    horizon_days: int,
    rng: np.random.Generator,
) -> tuple[float, float, str]:
    """
    OLS linear extrapolation over a daily pressure series.

    Returns (current_index, forecast_index, trend).
    """
    if daily.empty:
        return 0.0, 0.0, "flat"

    y = daily.to_numpy(dtype=float)
    x = np.arange(len(y), dtype=float)

    if len(y) < 2:
        current = float(y[-1])
        slope = 0.0
    else:
        slope = float(np.polyfit(x, y, 1)[0])
        current = float(y[-1])

    noise = float(rng.normal(0, 0.02))
    forecast = max(0.0, current + slope * horizon_days + noise)

    if forecast > current + 0.03:
        trend = "up"
    elif forecast < current - 0.03:
        trend = "down"
    else:
        trend = "flat"

    return current, forecast, trend


# ---------------------------------------------------------------------
# Resource allocation
# ---------------------------------------------------------------------

def allocate_field_workers(
    region_demand: list[dict[str, Any]],
    total_budget: int = FIELD_WORKER_BUDGET,
) -> dict[str, int]:
    """
    Allocate field worker headcount per region proportional to
    forecast_demand_index, subject to a total budget constraint.

    Each region receives at least 1 worker. The remainder is distributed
    proportionally to forecast demand. Any rounding remainder goes to the
    highest-demand regions.

    This is the data-scientist-owned recommendation passed to operations;
    final allocation is a management decision.

    Args:
        region_demand: output list from forecast_regional_demand()
        total_budget:  total field workers available across all regions

    Returns:
        dict mapping region name -> recommended worker count
    """
    regions = [r["region"] for r in region_demand]
    indices = np.array(
        [r["forecast_demand_index"] for r in region_demand],
        dtype=float,
    )

    n = len(regions)
    remaining = max(0, total_budget - n)  # reserve 1 per region

    total_index = indices.sum()
    if total_index > 0:
        proportional = np.floor(
            indices / total_index * remaining
        ).astype(int)
    else:
        proportional = np.zeros(n, dtype=int)

    allocated = proportional + 1  # minimum 1 per region

    # Distribute rounding remainder to highest-demand regions
    shortfall = total_budget - int(allocated.sum())
    if shortfall > 0:
        order = np.argsort(-indices)
        for i in range(shortfall):
            allocated[order[i % n]] += 1

    return {region: int(count) for region, count in zip(regions, allocated)}


# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------

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
        "recommended_workers": 4,
        "generated_at": "..."
      }
    """
    rng = np.random.default_rng(RANDOM_STATE)
    path = data_path or DEFAULT_DATA
    df = _load_frame(path)
    df["pressure"] = _risk_pressure(df)

    now = datetime.now(timezone.utc)
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
                    "recommended_workers": 0,
                    "generated_at": now.isoformat().replace("+00:00", "Z"),
                }
            )
            continue

        daily = _build_daily_series(sub)
        current, forecast, trend = _linear_forecast(daily, horizon_days, rng)

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

    # Attach resource allocation recommendation to each region entry
    worker_allocation = allocate_field_workers(results)
    for entry in results:
        entry["recommended_workers"] = worker_allocation.get(entry["region"], 0)

    return results


def forecast_demand_series(
    region: str | None = None,
    horizon_days: int = 7,
    data_path: Path | None = None,
) -> dict[str, Any]:
    """
    Return a time-series demand forecast for a single region (or National).

    Used by the Demand Map chart — returns historical daily indices and
    a forward forecast horizon.

    Response shape:
      {
        "region": "Kisumu",
        "historical": [{"date": "2026-08-01", "demand_index": 1.38}, ...],
        "forecast":   [{"date": "2026-08-23", "demand_index": 1.42}, ...],
        "trend": "up",
        "horizon_days": 7,
        "generated_at": "..."
      }
    """
    rng = np.random.default_rng(RANDOM_STATE)
    path = data_path or DEFAULT_DATA
    df = _load_frame(path)
    df["pressure"] = _risk_pressure(df)

    region_key = _normalize_region(region)
    now = datetime.now(timezone.utc)

    if region_key == "National":
        sub = df
    else:
        sub = df[df["region"] == region_key]
        if sub.empty:
            return {
                "region": region_key,
                "historical": [],
                "forecast": [],
                "trend": "flat",
                "horizon_days": horizon_days,
                "generated_at": now.isoformat().replace("+00:00", "Z"),
            }

    daily = _build_daily_series(sub)
    _, _, trend = _linear_forecast(daily, horizon_days, rng)

    historical = [
        {
            "date": str(ts.date()),
            "demand_index": round(float(val), 4),
        }
        for ts, val in daily.items()
    ]

    # Forecast horizon — separate rng seed for reproducibility
    rng_fc = np.random.default_rng(RANDOM_STATE + 1)
    y = daily.to_numpy(dtype=float)
    slope = float(np.polyfit(np.arange(len(y)), y, 1)[0]) if len(y) >= 2 else 0.0
    last_date = daily.index[-1] if not daily.empty else now

    forecast = []
    for d in range(1, horizon_days + 1):
        noise = float(rng_fc.normal(0, 0.01))
        val = max(0.0, float(y[-1]) + slope * d + noise) if len(y) > 0 else 0.0
        forecast.append(
            {
                "date": str((last_date + timedelta(days=d)).date()),
                "demand_index": round(val, 4),
            }
        )

    return {
        "region": region_key,
        "historical": historical,
        "forecast": forecast,
        "trend": trend,
        "horizon_days": horizon_days,
        "generated_at": now.isoformat().replace("+00:00", "Z"),
    }


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