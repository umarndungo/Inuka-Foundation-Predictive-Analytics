"""
Inference for POST /api/v1/evaluate.

Exposes score_beneficiary(payload) -> dict matching the shared API contract.
Loads preprocessing + model from model.pkl (joblib). No training-time code here.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd

ML_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL = ML_DIR / "model.pkl"

_DRIVER_RULES: list[tuple[str, str, Any]] = [
    # (feature, human label, predicate(value) -> bool)
    ("attendance_rate", "Low Attendance", lambda v: v is not None and float(v) < 0.60),
    ("travel_distance_km", "High Travel Distance", lambda v: v is not None and float(v) > 15.0),
    ("assignment_completion", "Low Assignment Completion", lambda v: v is not None and float(v) < 0.50),
    ("grade_average", "Low Grade Average", lambda v: v is not None and float(v) < 55.0),
    ("socioeconomic_index", "High Socioeconomic Vulnerability", lambda v: v is not None and float(v) < 2.5),
    (
        "historical_dropouts_in_family",
        "Family Dropout History",  # SYNTHETIC attribute only
        lambda v: v is not None and int(v) >= 1,
    ),
]

_ARTIFACT: dict[str, Any] | None = None


def _load_artifact(model_path: Path = DEFAULT_MODEL) -> dict[str, Any]:
    global _ARTIFACT
    if _ARTIFACT is None:
        if not model_path.exists():
            raise FileNotFoundError(
                f"Missing {model_path}. Train first: python backend/app/ml/train.py"
            )
        _ARTIFACT = joblib.load(model_path)
    return _ARTIFACT


def reload_model(model_path: Path = DEFAULT_MODEL) -> None:
    """Force reload (useful in tests / after retrain)."""
    global _ARTIFACT
    _ARTIFACT = joblib.load(model_path)


def _tier(score: float, threshold: float) -> str:
    if score > threshold:
        return "HIGH"
    if score >= 0.45:
        return "MEDIUM"
    return "LOW"


def _recommended_action(tier: str, automation: bool) -> str:
    if automation or tier == "HIGH":
        return "Automated Field Worker Outreach"
    if tier == "MEDIUM":
        return "Schedule Counselor Check-in"
    return "Continue Routine Monitoring"


def _drivers(payload: dict[str, Any], importances: dict[str, float], limit: int = 3) -> list[str]:
    """Human-readable drivers from rule hits, ordered by model feature importance."""
    # Map raw feature → max importance across one-hot / scaled names
    raw_importance: dict[str, float] = {}
    for name, val in importances.items():
        for feat in (
            "attendance_rate",
            "travel_distance_km",
            "assignment_completion",
            "grade_average",
            "socioeconomic_index",
            "historical_dropouts_in_family",
            "region",
            "pillar",
        ):
            if feat in name:
                raw_importance[feat] = max(
                  raw_importance.get(feat, 0.0),
                  abs(float(val))
                )

    hits: list[tuple[float, str]] = []
    for feat, label, pred in _DRIVER_RULES:
        if pred(payload.get(feat)):
            hits.append((raw_importance.get(feat, 0.0), label))

    hits.sort(key=lambda x: x[0], reverse=True)
    drivers = [label for _, label in hits[:limit]]
    if not drivers and payload.get("region"):
        drivers = [f"Regional Risk Pattern ({payload['region']})"]
    return drivers or ["Multiple Moderate Risk Factors"]


def _row_from_payload(payload: dict[str, Any], artifact: dict[str, Any]) -> pd.DataFrame:
    defaults = artifact.get("default_numeric", {})
    cat_defaults = artifact.get("default_categorical", {})
    row: dict[str, Any] = {}
    for col in artifact["numeric_features"]:
        if payload.get(col) is None:
            row[col] = defaults.get(col, 0.0)
        else:
            row[col] = float(payload[col])
    for col in artifact.get("categorical_features", ["region"]):
        if payload.get(col) is None:
            fallback = {"region": "Nairobi", "pillar": "Scholarship"}
            row[col] = cat_defaults.get(col, fallback.get(col, "UNKNOWN"))
        else:
            row[col] = payload[col]
    return pd.DataFrame([row], columns=artifact["feature_columns"])


def score_beneficiary(payload: dict[str, Any], model_path: Path | None = None) -> dict[str, Any]:
    """
    Score one beneficiary. Matches POST /api/v1/evaluate response shape.

    Required-ish keys: beneficiary_id, attendance_rate, assignment_completion,
    travel_distance_km, region. Extra training features are optional and defaulted
    from train-split medians when absent (no leakage — medians from train only).
    """
    artifact = _load_artifact(model_path or DEFAULT_MODEL)
    pipeline = artifact["pipeline"]
    threshold = float(artifact.get("automation_threshold", 0.65))

    if not payload.get("beneficiary_id"):
        raise ValueError("beneficiary_id is required")

    X = _row_from_payload(payload, artifact)
    score = float(pipeline.predict_proba(X)[0, 1])
    tier = _tier(score, threshold)
    automation = score > threshold
    drivers = _drivers(
        {**artifact.get("default_numeric", {}), **payload},
        artifact.get("feature_importances", {}),
    )

    return {
        "beneficiary_id": payload["beneficiary_id"],
        "risk_score": round(score, 4),
        "risk_tier": tier,
        "drivers": drivers,
        "recommended_action": _recommended_action(tier, automation),
        "automation_triggered": automation,
    }
