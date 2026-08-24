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
    return (
        (df["attendance_rate"] < 0.60).astype(float)
        + (df["travel_distance_km"] > 15).astype(float)
        + (df["historical_dropouts_in_family"] >= 1).astype(float)
    )


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
        return pd.Series(dtype=float)
    daily = (
        sub.set_index("timestamp")
        .sort_index()
        .resample("D")["pressure"]
        .mean()
        .dropna()
    )
    return daily.astype(float)


def _future_dates(last_date: pd.Timestamp, days: int) -> list[str]:
    return [
        (last_date + pd.Timedelta(days=offset)).date().isoformat()
        for offset in range(1, days + 1)
    ]


def _build_forecast(region: str, daily: pd.Series, horizon_days: int) -> dict[str, Any]:
    rng = np.random.default_rng(abs(hash((region, RANDOM_STATE))) % (2**32))

    if daily.empty:
        historical = [0.0] * max(horizon_days, 7)
        predicted = [0.0] * horizon_days
        confidence = [0.6] * horizon_days
        today = pd.Timestamp(datetime.now(timezone.utc).date())
        dates = [
            (today - pd.Timedelta(days=(len(historical) - 1 - i))).date().isoformat()
            for i in range(len(historical))
        ] + _future_dates(today, horizon_days)
        return {
            "region": region,
            "historical": historical,
            "predicted": predicted,
            "confidence": confidence,
            "dates": dates,
            "summary": {
                "expectedChange": 0.0,
                "peakDay": dates[-1],
                "confidence": 60,
            },
        }

    history_points = min(max(len(daily), 7), 14)
    daily = daily.tail(history_points)
    historical = [round(float(v) * 100, 2) for v in daily.to_list()]

    y = np.array(daily.to_list(), dtype=float)
    x = np.arange(len(y), dtype=float)
    if len(y) >= 2:
        slope, intercept = np.polyfit(x, y, 1)
    else:
        slope, intercept = 0.0, float(y[-1])

    last_value = float(y[-1]) if len(y) else 0.0
    predicted_raw: list[float] = []
    confidence: list[float] = []
    for step in range(1, horizon_days + 1):
        baseline = intercept + slope * (len(y) - 1 + step)
        blended = (0.65 * baseline) + (0.35 * last_value)
        noise = float(rng.normal(0, 0.015))
        forecast = max(0.0, blended + noise)
        predicted_raw.append(forecast)
        confidence.append(round(max(0.6, 0.86 - (step - 1) * 0.015), 2))

    predicted = [round(v * 100, 2) for v in predicted_raw]
    historical_dates = [idx.date().isoformat() for idx in daily.index]
    future_dates = _future_dates(daily.index[-1], horizon_days)
    dates = historical_dates + future_dates

    hist_baseline = historical[-1] if historical else 0.0
    pred_peak = max(predicted) if predicted else hist_baseline
    expected_change = round(((pred_peak - hist_baseline) / hist_baseline) * 100, 2) if hist_baseline else 0.0
    peak_idx = predicted.index(pred_peak) if predicted else 0
    peak_day = future_dates[peak_idx] if future_dates else historical_dates[-1]
    summary_confidence = int(round(sum(confidence) / len(confidence) * 100)) if confidence else 60

    return {
        "region": region,
        "historical": historical,
        "predicted": predicted,
        "confidence": confidence,
        "dates": dates,
        "summary": {
            "expectedChange": expected_change,
            "peakDay": peak_day,
            "confidence": summary_confidence,
        },
    }


def forecast_demand_series(
    region: str | None = None,
    horizon_days: int = 7,
    data_path: Path | None = None,
) -> dict[str, Any]:
    df = _prepare_frame(data_path)
    normalized_region = _normalize_region(region)
    daily = _daily_series(df, normalized_region)
    return _build_forecast(normalized_region, daily, horizon_days)


def forecast_regional_breakdown(
    horizon_days: int = 7,
    data_path: Path | None = None,
) -> list[dict[str, Any]]:
    df = _prepare_frame(data_path)
    results: list[dict[str, Any]] = []

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
