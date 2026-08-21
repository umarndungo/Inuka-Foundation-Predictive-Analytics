"""
Train dropout-risk XGBoost pipeline for Inuka Risk Radar.

- random_state=42 everywhere
- Scalers/encoders fit on train split only (no leakage)
- risk_score at inference = P(dropped_out); automation fires when > 0.75
- Target = historical synthetic dropped_out from seed (not feature thresholds)
- Synthetic data only — no real PII

Usage:
  python -m app.ml.train
  # or: python backend/app/ml/train.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import (
    classification_report,
    precision_recall_fscore_support,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

RANDOM_STATE = 42
AUTOMATION_THRESHOLD = 0.75

# Features available on POST /api/v1/evaluate (plus extras used when present).
NUMERIC_FEATURES = [
    "attendance_rate",
    "assignment_completion",
    "travel_distance_km",
    "grade_average",
    "socioeconomic_index",
    "historical_dropouts_in_family",
]
CATEGORICAL_FEATURES = ["region", "pillar"]
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET_COLUMN = "dropped_out"

REGIONS = ("Nairobi", "Kisumu", "Nakuru", "Mombasa", "Eldoret")
PILLARS = ("Scholarship", "Plus", "Vocational", "Tech")

ML_DIR = Path(__file__).resolve().parent
# <repo>/backend/app/ml → parents[2] = repo root
REPO_ROOT = ML_DIR.parents[2]
DEFAULT_DATA = REPO_ROOT / "data-pipeline" / "data" / "synthetic_beneficiaries.json"
DEFAULT_MODEL = ML_DIR / "model.pkl"
DEFAULT_METRICS = ML_DIR / "metrics.json"


def load_synthetic(path: Path) -> pd.DataFrame:
    records = json.loads(path.read_text(encoding="utf-8"))
    df = pd.DataFrame(records)
    required = FEATURE_COLUMNS + [TARGET_COLUMN]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(
            f"Training data missing columns {missing}. "
            "Confirm Data Engineer seed includes travel_distance_km, assignment_completion, "
            "pillar, and dropped_out (historical synthetic outcome)."
        )
    return df


def load_target(df: pd.DataFrame) -> pd.Series:
    """
    Supervised label = historical synthetic dropped_out from the seed generator.

    Defensible outcome column — not a deterministic cut of the same predictors.
    risk_score at inference = P(dropped_out).
    """
    return df[TARGET_COLUMN].astype(int)


def risk_tier_from_score(score: float) -> str:
    if score > AUTOMATION_THRESHOLD:
        return "HIGH"
    if score >= 0.45:
        return "MEDIUM"
    return "LOW"


def build_pipeline() -> Pipeline:
    try:
        from xgboost import XGBClassifier
    except ImportError as exc:
        raise ImportError(
            "xgboost is required: pip install -r backend/app/ml/requirements.txt"
        ) from exc

    preprocess = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
        ]
    )
    model = XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=RANDOM_STATE,
        n_jobs=2,
    )
    return Pipeline([("preprocess", preprocess), ("model", model)])


def feature_importance_table(pipeline: Pipeline, feature_names: list[str]) -> dict[str, float]:
    model = pipeline.named_steps["model"]
    importances = model.feature_importances_
    pairs = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)
    return {name: float(val) for name, val in pairs}


def transformed_feature_names(pipeline: Pipeline) -> list[str]:
    preprocess: ColumnTransformer = pipeline.named_steps["preprocess"]
    return list(preprocess.get_feature_names_out())


def run_eda(df: pd.DataFrame, label: pd.Series) -> dict:
    """Lightweight EDA summary for PM Impact Memo / model card."""
    tagged = df.assign(dropped_out=label)
    by_region = (
        tagged.groupby("region", sort=True)
        .agg(
            n=("beneficiary_id", "count"),
            avg_attendance=("attendance_rate", "mean"),
            avg_grade=("grade_average", "mean"),
            avg_socioeconomic=("socioeconomic_index", "mean"),
            avg_family_dropouts=("historical_dropouts_in_family", "mean"),
            dropout_rate=("dropped_out", "mean"),
        )
        .round(4)
        .to_dict(orient="index")
    )
    by_pillar = (
        tagged.groupby("pillar", sort=True)
        .agg(
            n=("beneficiary_id", "count"),
            avg_attendance=("attendance_rate", "mean"),
            dropout_rate=("dropped_out", "mean"),
        )
        .round(4)
        .to_dict(orient="index")
    )
    corr = float(df["attendance_rate"].corr(label.astype(float)))
    return {
        "n_records": int(len(df)),
        "dropout_rate": float(label.mean()),
        "at_risk_rate": float(label.mean()),  # alias for older Impact Memo consumers
        "attendance_vs_dropout_corr": corr,
        "by_region": by_region,
        "by_pillar": by_pillar,
        "headline": (
            f"Attendance vs dropped_out correlation = {corr:.3f} "
            "(lower attendance ↔ higher historical dropout on synthetic data)."
        ),
    }


def train(
    data_path: Path = DEFAULT_DATA,
    model_path: Path = DEFAULT_MODEL,
    metrics_path: Path = DEFAULT_METRICS,
) -> dict:
    df = load_synthetic(data_path)
    y = load_target(df)
    X = df[FEATURE_COLUMNS].copy()

    eda = run_eda(df, y)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.25,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    pipeline = build_pipeline()
    # Fit ONLY on train — scaler/encoder never see test/full data.
    pipeline.fit(X_train, y_train)

    proba = pipeline.predict_proba(X_test)[:, 1]
    y_pred = (proba > AUTOMATION_THRESHOLD).astype(int)

    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test, y_pred, average="binary", zero_division=0
    )
    auc = float(roc_auc_score(y_test, proba))
    report = classification_report(y_test, y_pred, zero_division=0)

    names = transformed_feature_names(pipeline)
    importances = feature_importance_table(pipeline, names)

    artifact = {
        "pipeline": pipeline,
        "feature_columns": FEATURE_COLUMNS,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "automation_threshold": AUTOMATION_THRESHOLD,
        "random_state": RANDOM_STATE,
        "label_column": TARGET_COLUMN,
        "label_rule": (
            "dropped_out from seed_generator latent logistic process "
            "(noisy synthetic historical outcome; not deterministic feature thresholds)"
        ),
        "default_numeric": {
            col: float(X_train[col].median()) for col in NUMERIC_FEATURES
        },
        "default_categorical": {
            "region": X_train["region"].mode().iloc[0],
            "pillar": X_train["pillar"].mode().iloc[0],
        },
        "feature_importances": importances,
        "regions": list(REGIONS),
        "pillars": list(PILLARS),
    }
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, model_path)

    metrics = {
        "eda": eda,
        "test": {
            "precision": float(precision),
            "recall": float(recall),
            "f1": float(f1),
            "roc_auc": auc,
            "automation_threshold": AUTOMATION_THRESHOLD,
            "positive_rate_at_threshold": float(y_pred.mean()),
        },
        "feature_importances_top": dict(list(importances.items())[:12]),
        "classification_report": report,
        "model_path": str(model_path),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
    }
    metrics_path.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")

    print(eda["headline"])
    print(
        f"dropout_rate={eda['dropout_rate']:.3f}  test ROC-AUC={auc:.3f}  "
        f"P/R/F1@0.75={precision:.3f}/{recall:.3f}/{f1:.3f}"
    )
    print("Top importances:")
    for name, val in list(importances.items())[:8]:
        print(f"  {name}: {val:.4f}")
    print(f"Wrote {model_path}")
    print(f"Wrote {metrics_path}")
    return metrics


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Train Inuka risk model.")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--metrics", type=Path, default=DEFAULT_METRICS)
    args = parser.parse_args(argv)

    if not args.data.exists():
        print(f"Missing data: {args.data}", file=sys.stderr)
        print("Run: python data-pipeline/scripts/seed_generator.py", file=sys.stderr)
        return 1
    train(args.data, args.model, args.metrics)
    return 0


if __name__ == "__main__":
    # Allow `python backend/app/ml/train.py` without installing the package.
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))
    raise SystemExit(main())
