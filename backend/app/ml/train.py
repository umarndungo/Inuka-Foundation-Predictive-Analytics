"""
Train and compare dropout-risk models for Inuka Risk Radar.

Models:
- Logistic Regression baseline
- XGBoost comparison

Design principles:
- random_state=42 everywhere
- stratified train/test split
- preprocessing fitted on training data only
- cross-validation performed inside training data
- no target leakage
- PR-AUC included because dropout is the minority class
- confusion matrices generated for both models
- XGBoost feature importance reported
- best model serialized with joblib
- synthetic data only

Usage:
    python backend/app/ml/train.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    precision_recall_curve,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import (
    StratifiedKFold,
    cross_validate,
    train_test_split,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from xgboost import XGBClassifier


# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------

RANDOM_STATE = 42

TEST_SIZE = 0.25
CV_FOLDS = 5

# Existing operational automation threshold.
AUTOMATION_THRESHOLD = 0.75

# Threshold used for model comparison.
# This is deliberately separate from the operational threshold.
DEFAULT_DECISION_THRESHOLD = 0.50


NUMERIC_FEATURES = [
    "attendance_rate",
    "assignment_completion",
    "travel_distance_km",
    "grade_average",
    "socioeconomic_index",
    "historical_dropouts_in_family",
]

CATEGORICAL_FEATURES = [
    "region",
    "pillar",
]

FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET_COLUMN = "dropped_out"

REGIONS = (
    "Nairobi",
    "Kisumu",
    "Nakuru",
    "Mombasa",
    "Eldoret",
)

PILLARS = (
    "Scholarship",
    "Plus",
    "Vocational",
    "Tech",
)


# ---------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------

ML_DIR = Path(__file__).resolve().parent

# backend/app/ml -> repo root
REPO_ROOT = ML_DIR.parents[2]
DEFAULT_DATA = REPO_ROOT / "data-pipeline" / "data" / "synthetic_beneficiaries.json"
DEFAULT_MODEL = ML_DIR / "model.pkl"
DEFAULT_METRICS = ML_DIR / "metrics.json"
OUTPUT_DIR = ML_DIR / "evaluation"


# ---------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------

def load_synthetic(path: Path) -> pd.DataFrame:
    """Load and validate the synthetic beneficiary dataset."""

    if not path.exists():
        raise FileNotFoundError(f"Training data not found: {path}")

    records = json.loads(path.read_text(encoding="utf-8"))

    if not isinstance(records, list):
        raise ValueError("Expected JSON file containing a list of records.")

    df = pd.DataFrame(records)

    required = FEATURE_COLUMNS + [TARGET_COLUMN]

    missing = [
        column
        for column in required
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Training data missing columns: {missing}"
        )

    return df


def load_target(df: pd.DataFrame) -> pd.Series:
    """
    Supervised label.

    This is the historical synthetic dropped_out outcome.
    It is NOT regenerated from predictor thresholds.
    """

    return df[TARGET_COLUMN].astype(int)


# ---------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------

def build_preprocessor() -> ColumnTransformer:
    """
    Build preprocessing pipeline.

    Important:
    This transformer is fitted only inside the model pipeline,
    therefore training data is used to learn preprocessing parameters.
    """

    numeric_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="median"),
            ),
            (
                "scaler",
                StandardScaler(),
            ),
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="most_frequent"),
            ),
            (
                "encoder",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                ),
            ),
        ]
    )

    return ColumnTransformer(
        transformers=[
            (
                "num",
                numeric_pipeline,
                NUMERIC_FEATURES,
            ),
            (
                "cat",
                categorical_pipeline,
                CATEGORICAL_FEATURES,
            ),
        ]
    )


# ---------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------

def build_logistic_pipeline() -> Pipeline:
    """Build Logistic Regression baseline."""

    preprocessor = build_preprocessor()

    model = LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        random_state=RANDOM_STATE,
    )

    return Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("model", model),
        ]
    )


def build_xgboost_pipeline() -> Pipeline:
    """Build XGBoost model."""

    preprocessor = build_preprocessor()

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

    return Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("model", model),
        ]
    )


# ---------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------

def evaluate_predictions(
    y_true: pd.Series,
    probabilities: np.ndarray,
    threshold: float,
) -> dict:
    """Calculate classification metrics at a chosen threshold."""

    predictions = (
        probabilities >= threshold
    ).astype(int)

    precision = precision_score(
        y_true,
        predictions,
        zero_division=0,
    )

    recall = recall_score(
        y_true,
        predictions,
        zero_division=0,
    )

    f1 = f1_score(
        y_true,
        predictions,
        zero_division=0,
    )

    roc_auc = roc_auc_score(
        y_true,
        probabilities,
    )

    pr_auc = average_precision_score(
        y_true,
        probabilities,
    )

    matrix = confusion_matrix(
        y_true,
        predictions,
    )

    return {
        "threshold": float(threshold),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "roc_auc": float(roc_auc),
        "pr_auc": float(pr_auc),
        "confusion_matrix": matrix.tolist(),
        "classification_report": classification_report(
            y_true,
            predictions,
            zero_division=0,
        ),
        "positive_prediction_rate": float(
            predictions.mean()
        ),
    }


# ---------------------------------------------------------------------
# Cross-validation
# ---------------------------------------------------------------------

def cross_validate_model(
    pipeline: Pipeline,
    X_train: pd.DataFrame,
    y_train: pd.Series,
) -> dict:
    """Run stratified cross-validation on training data only."""

    cv = StratifiedKFold(
        n_splits=CV_FOLDS,
        shuffle=True,
        random_state=RANDOM_STATE,
    )

    scoring = {
        "roc_auc": "roc_auc",
        "pr_auc": "average_precision",
        "precision": "precision",
        "recall": "recall",
        "f1": "f1",
    }

    results = cross_validate(
        pipeline,
        X_train,
        y_train,
        cv=cv,
        scoring=scoring,
        n_jobs=1,
        return_train_score=False,
    )

    output = {}

    for metric in scoring:
        values = results[
            f"test_{metric}"
        ]

        output[metric] = {
            "mean": float(np.mean(values)),
            "std": float(np.std(values)),
            "folds": [
                float(value)
                for value in values
            ],
        }

    return output


# ---------------------------------------------------------------------
# Feature importance
# ---------------------------------------------------------------------

def get_transformed_feature_names(
    pipeline: Pipeline,
) -> list[str]:
    """Return names after preprocessing."""

    preprocessor = pipeline.named_steps[
        "preprocess"
    ]

    return list(
        preprocessor.get_feature_names_out()
    )


def get_xgboost_feature_importance(
    pipeline: Pipeline,
) -> dict[str, float]:
    """Extract XGBoost feature importance."""

    model = pipeline.named_steps["model"]

    names = get_transformed_feature_names(
        pipeline
    )

    importances = model.feature_importances_

    pairs = sorted(
        zip(names, importances),
        key=lambda item: item[1],
        reverse=True,
    )

    return {
        name: float(value)
        for name, value in pairs
    }


def get_logistic_coefficients(
    pipeline: Pipeline,
) -> dict[str, float]:
    """Extract Logistic Regression coefficients."""

    model = pipeline.named_steps["model"]

    names = get_transformed_feature_names(
        pipeline
    )

    coefficients = model.coef_[0]

    pairs = sorted(
        zip(names, coefficients),
        key=lambda item: abs(item[1]),
        reverse=True,
    )

    return {
        name: float(value)
        for name, value in pairs
    }


# ---------------------------------------------------------------------
# Plots
# ---------------------------------------------------------------------

def save_confusion_matrix(
    y_true: pd.Series,
    probabilities: np.ndarray,
    threshold: float,
    output_path: Path,
    title: str,
) -> None:
    """Save confusion matrix plot."""

    predictions = (
        probabilities >= threshold
    ).astype(int)

    matrix = confusion_matrix(
        y_true,
        predictions,
    )

    fig, ax = plt.subplots(
        figsize=(6, 5)
    )

    ax.imshow(matrix)

    ax.set_title(title)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")

    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])

    ax.set_xticklabels(
        ["No Dropout", "Dropout"]
    )

    ax.set_yticklabels(
        ["No Dropout", "Dropout"]
    )

    for i in range(2):
        for j in range(2):
            ax.text(
                j,
                i,
                matrix[i, j],
                ha="center",
                va="center",
            )

    fig.tight_layout()
    fig.savefig(
        output_path,
        dpi=150,
    )
    plt.close(fig)


def save_roc_curve(
    y_true: pd.Series,
    model_probabilities: dict[str, np.ndarray],
    output_path: Path,
) -> None:
    """Save ROC comparison plot."""

    fig, ax = plt.subplots(
        figsize=(7, 6)
    )

    for name, probabilities in model_probabilities.items():

        fpr, tpr, _ = roc_curve(
            y_true,
            probabilities,
        )

        auc = roc_auc_score(
            y_true,
            probabilities,
        )

        ax.plot(
            fpr,
            tpr,
            label=f"{name} (AUC={auc:.3f})",
        )

    ax.plot(
        [0, 1],
        [0, 1],
        linestyle="--",
    )

    ax.set_xlabel(
        "False Positive Rate"
    )

    ax.set_ylabel(
        "True Positive Rate"
    )

    ax.set_title(
        "ROC Curve Comparison"
    )

    ax.legend()

    fig.tight_layout()

    fig.savefig(
        output_path,
        dpi=150,
    )

    plt.close(fig)


def save_pr_curve(
    y_true: pd.Series,
    model_probabilities: dict[str, np.ndarray],
    output_path: Path,
) -> None:
    """Save Precision-Recall comparison plot."""

    fig, ax = plt.subplots(
        figsize=(7, 6)
    )

    for name, probabilities in model_probabilities.items():

        precision, recall, _ = (
            precision_recall_curve(
                y_true,
                probabilities,
            )
        )

        pr_auc = average_precision_score(
            y_true,
            probabilities,
        )

        ax.plot(
            recall,
            precision,
            label=f"{name} (PR-AUC={pr_auc:.3f})",
        )

    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")

    ax.set_title(
        "Precision-Recall Curve Comparison"
    )

    ax.legend()

    fig.tight_layout()

    fig.savefig(
        output_path,
        dpi=150,
    )

    plt.close(fig)


# ---------------------------------------------------------------------
# Threshold analysis
# ---------------------------------------------------------------------

def threshold_analysis(
    y_true: pd.Series,
    probabilities: np.ndarray,
) -> list[dict]:
    """
    Evaluate several decision thresholds.

    This prevents the operational threshold from being
    treated as automatically optimal.
    """

    thresholds = [
        0.30,
        0.40,
        0.45,
        0.50,
        0.55,
        0.60,
        0.65,
        0.70,
        0.75,
    ]

    results = []

    for threshold in thresholds:

        predictions = (
            probabilities >= threshold
        ).astype(int)

        results.append(
            {
                "threshold": threshold,
                "precision": float(
                    precision_score(
                        y_true,
                        predictions,
                        zero_division=0,
                    )
                ),
                "recall": float(
                    recall_score(
                        y_true,
                        predictions,
                        zero_division=0,
                    )
                ),
                "f1": float(
                    f1_score(
                        y_true,
                        predictions,
                        zero_division=0,
                    )
                ),
                "positive_prediction_rate": float(
                    predictions.mean()
                ),
            }
        )

    return results


# ---------------------------------------------------------------------
# Main training function
# ---------------------------------------------------------------------

def train(
    data_path: Path = DEFAULT_DATA,
    model_path: Path = DEFAULT_MODEL,
    metrics_path: Path = DEFAULT_METRICS,
) -> dict:

    print("=" * 70)
    print("INUKA FOUNDATION — MODEL TRAINING")
    print("=" * 70)

    # ---------------------------------------------------------------
    # Load data
    # ---------------------------------------------------------------

    print("\n[1/8] Loading synthetic dataset...")

    df = load_synthetic(data_path)

    y = load_target(df)

    X = df[
        FEATURE_COLUMNS
    ].copy()

    print(
        f"Records: {len(df)}"
    )

    print(
        f"Dropout rate: {y.mean():.3f}"
    )

    # ---------------------------------------------------------------
    # Split
    # ---------------------------------------------------------------

    print(
        "\n[2/8] Creating leakage-safe "
        "stratified train/test split..."
    )

    X_train, X_test, y_train, y_test = (
        train_test_split(
            X,
            y,
            test_size=TEST_SIZE,
            random_state=RANDOM_STATE,
            stratify=y,
        )
    )

    print(
        f"Training records: {len(X_train)}"
    )

    print(
        f"Testing records: {len(X_test)}"
    )

    # ---------------------------------------------------------------
    # Build models
    # ---------------------------------------------------------------

    print(
        "\n[3/8] Building Logistic Regression "
        "and XGBoost pipelines..."
    )

    models = {
        "logistic_regression":
            build_logistic_pipeline(),

        "xgboost":
            build_xgboost_pipeline(),
    }

    # ---------------------------------------------------------------
    # Cross-validation
    # ---------------------------------------------------------------

    print(
        "\n[4/8] Running 5-fold cross-validation..."
    )

    cv_results = {}

    for name, model in models.items():

        print(
            f"  Cross-validating {name}..."
        )

        cv_results[name] = (
            cross_validate_model(
                model,
                X_train,
                y_train,
            )
        )

    # ---------------------------------------------------------------
    # Fit final models
    # ---------------------------------------------------------------

    print(
        "\n[5/8] Fitting final models "
        "on training data..."
    )

    fitted_models = {}

    test_probabilities = {}

    test_metrics = {}

    for name, model in models.items():

        print(
            f"  Training {name}..."
        )

        model.fit(
            X_train,
            y_train,
        )

        fitted_models[name] = model

        probabilities = (
            model.predict_proba(
                X_test
            )[:, 1]
        )

        test_probabilities[name] = (
            probabilities
        )

        test_metrics[name] = (
            evaluate_predictions(
                y_test,
                probabilities,
                DEFAULT_DECISION_THRESHOLD,
            )
        )

    # ---------------------------------------------------------------
    # Operational threshold
    # ---------------------------------------------------------------

    operational_metrics = {}

    for name, probabilities in (
        test_probabilities.items()
    ):

        operational_metrics[name] = (
            evaluate_predictions(
                y_test,
                probabilities,
                AUTOMATION_THRESHOLD,
            )
        )

    # ---------------------------------------------------------------
    # Threshold analysis
    # ---------------------------------------------------------------

    threshold_results = {}

    for name, probabilities in (
        test_probabilities.items()
    ):

        threshold_results[name] = (
            threshold_analysis(
                y_test,
                probabilities,
            )
        )

    # ---------------------------------------------------------------
    # Model selection
    # ---------------------------------------------------------------

    print(
        "\n[6/8] Comparing models..."
    )

    # Select using CV ROC-AUC.
    best_model_name = max(
        cv_results,
        key=lambda name:
        cv_results[name]["roc_auc"]["mean"],
    )

    best_model = fitted_models[
        best_model_name
    ]

    print(
        f"Selected model: {best_model_name}"
    )

    # ---------------------------------------------------------------
    # Feature importance
    # ---------------------------------------------------------------

    print(
        "\n[7/8] Extracting feature importance..."
    )

    feature_importances = {}

    if best_model_name == "xgboost":

        feature_importances = (
            get_xgboost_feature_importance(
                best_model
            )
        )

    else:

        feature_importances = (
            get_logistic_coefficients(
                best_model
            )
        )

    print(
        "\nTop features:"
    )

    for name, value in list(
        feature_importances.items()
    )[:10]:

        print(
            f"  {name}: {value:.4f}"
        )

    # ---------------------------------------------------------------
    # Output directories
    # ---------------------------------------------------------------

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ---------------------------------------------------------------
    # Confusion matrices
    # ---------------------------------------------------------------

    save_confusion_matrix(
        y_test,
        test_probabilities[
            "logistic_regression"
        ],
        DEFAULT_DECISION_THRESHOLD,
        OUTPUT_DIR
        / "confusion_matrix_logistic_regression.png",
        "Logistic Regression Confusion Matrix",
    )

    save_confusion_matrix(
        y_test,
        test_probabilities[
            "xgboost"
        ],
        DEFAULT_DECISION_THRESHOLD,
        OUTPUT_DIR
        / "confusion_matrix_xgboost.png",
        "XGBoost Confusion Matrix",
    )

    # ---------------------------------------------------------------
    # ROC and PR plots
    # ---------------------------------------------------------------

    save_roc_curve(
        y_test,
        test_probabilities,
        OUTPUT_DIR / "roc_curve_comparison.png",
    )

    save_pr_curve(
        y_test,
        test_probabilities,
        OUTPUT_DIR / "pr_curve_comparison.png",
    )

    # ---------------------------------------------------------------
    # Serialize best model
    # ---------------------------------------------------------------

    artifact = {
        "pipeline": best_model,
        "model_name": best_model_name,
        "feature_columns": FEATURE_COLUMNS,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "automation_threshold": AUTOMATION_THRESHOLD,
        "decision_threshold": DEFAULT_DECISION_THRESHOLD,
        "random_state": RANDOM_STATE,
        "label_column": TARGET_COLUMN,
        "label_rule": (
            "Synthetic historical dropped_out outcome; "
            "not generated from deterministic predictor thresholds."
        ),
        "regions": list(REGIONS),
        "pillars": list(PILLARS),
        "feature_importances": feature_importances,
    }

    model_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        artifact,
        model_path,
    )

    # ---------------------------------------------------------------
    # Metrics artifact
    # ---------------------------------------------------------------

    metrics = {
        "dataset": {
            "records": int(len(df)),
            "features": int(len(FEATURE_COLUMNS)),
            "dropout_rate": float(y.mean()),
            "synthetic": True,
        },

        "split": {
            "test_size": TEST_SIZE,
            "random_state": RANDOM_STATE,
            "stratified": True,
            "n_train": int(len(X_train)),
            "n_test": int(len(X_test)),
        },

        "cross_validation": cv_results,

        "test_metrics": test_metrics,

        "operational_threshold_metrics":
            operational_metrics,

        "threshold_analysis":
            threshold_results,

        "selected_model":
            best_model_name,

        "feature_importances":
            feature_importances,

        "artifacts": {
            "model": str(model_path),
            "evaluation_directory": str(
                OUTPUT_DIR
            ),
        },
    }

    metrics_path.write_text(
        json.dumps(
            metrics,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    # ---------------------------------------------------------------
    # Summary
    # ---------------------------------------------------------------

    print(
        "\n[8/8] Training completed successfully."
    )

    print("\nModel comparison:")

    for name in models:

        print(
            f"\n{name}"
        )

        print(
            f"  CV ROC-AUC: "
            f"{cv_results[name]['roc_auc']['mean']:.3f}"
        )

        print(
            f"  CV PR-AUC: "
            f"{cv_results[name]['pr_auc']['mean']:.3f}"
        )

        print(
            f"  Test ROC-AUC: "
            f"{test_metrics[name]['roc_auc']:.3f}"
        )

        print(
            f"  Test PR-AUC: "
            f"{test_metrics[name]['pr_auc']:.3f}"
        )

        print(
            f"  Precision: "
            f"{test_metrics[name]['precision']:.3f}"
        )

        print(
            f"  Recall: "
            f"{test_metrics[name]['recall']:.3f}"
        )

        print(
            f"  F1: "
            f"{test_metrics[name]['f1']:.3f}"
        )

    print(
        f"\nSelected model: {best_model_name}"
    )

    print(
        f"Model written to: {model_path}"
    )

    print(
        f"Metrics written to: {metrics_path}"
    )

    print(
        f"Evaluation artifacts: {OUTPUT_DIR}"
    )

    print("=" * 70)

    return metrics


# ---------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------

def main(
    argv: list[str] | None = None,
) -> int:

    import argparse

    parser = argparse.ArgumentParser(
        description=(
            "Train Inuka dropout-risk models."
        )
    )

    parser.add_argument(
        "--data",
        type=Path,
        default=DEFAULT_DATA,
    )

    parser.add_argument(
        "--model",
        type=Path,
        default=DEFAULT_MODEL,
    )

    parser.add_argument(
        "--metrics",
        type=Path,
        default=DEFAULT_METRICS,
    )

    args = parser.parse_args(argv)

    try:

        train(
            args.data,
            args.model,
            args.metrics,
        )

    except Exception as exc:

        print(
            f"\nTraining failed: {exc}",
            file=sys.stderr,
        )

        return 1

    return 0


if __name__ == "__main__":

    raise SystemExit(
        main()
    )