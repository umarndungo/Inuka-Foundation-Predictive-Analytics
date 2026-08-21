#!/usr/bin/env python3
"""
Inuka Foundation Predictive Analytics
EDA and Target Audit

Purpose:
    Explore the synthetic beneficiary dataset before model development.

This script:
    1. Audits dataset quality
    2. Profiles the four Inuka pillars
    3. Profiles regions
    4. Audits the dropped_out target
    5. Analyses predictor relationships
    6. Tests historical_dropouts_in_family vs dropped_out
    7. Analyses attendance vs dropout
    8. Produces summary CSV files
    9. Produces visualisations
   10. Produces a Markdown EDA report

IMPORTANT:
    The dataset is synthetic.
    Findings must not be presented as real-world Inuka evidence.

Target:
    dropped_out

The target is used only as the supervised learning outcome.
Predictor thresholds must NOT be used to manufacture the target.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt


# ============================================================
# PATHS
# ============================================================

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"

INPUT_FILE = DATA_DIR / "synthetic_beneficiaries.json"

OUTPUT_DIR = DATA_DIR / "eda_output"
PLOTS_DIR = OUTPUT_DIR / "plots"
TABLES_DIR = OUTPUT_DIR / "tables"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PLOTS_DIR.mkdir(parents=True, exist_ok=True)
TABLES_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# CONFIGURATION
# ============================================================

TARGET = "dropped_out"

PILLAR_COLUMN = "pillar"
REGION_COLUMN = "region"

NUMERIC_FEATURES = [
    "attendance_rate",
    "grade_average",
    "socioeconomic_index",
    "historical_dropouts_in_family",
    "assignment_completion",
    "travel_distance_km",
]

CATEGORICAL_FEATURES = [
    "region",
    "pillar",
]

EXPECTED_PILLARS = [
    "Scholarship",
    "Plus",
    "Vocational",
    "Tech",
]


# ============================================================
# LOAD DATA
# ============================================================

def load_data() -> pd.DataFrame:
    """Load synthetic beneficiary records from JSON."""

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found:\n{INPUT_FILE}\n\n"
            "Run seed_generator.py first."
        )

    with INPUT_FILE.open("r", encoding="utf-8") as file:
        records = json.load(file)

    df = pd.DataFrame(records)

    print("=" * 70)
    print("INUKA FOUNDATION PREDICTIVE ANALYTICS — EDA")
    print("=" * 70)
    print(f"Input file: {INPUT_FILE}")
    print(f"Records: {len(df):,}")
    print(f"Columns: {len(df.columns)}")
    print()

    return df


# ============================================================
# BASIC DATASET AUDIT
# ============================================================

def dataset_audit(df: pd.DataFrame) -> pd.DataFrame:
    """Generate column-level dataset quality audit."""

    rows = []

    for column in df.columns:
        rows.append(
            {
                "column": column,
                "dtype": str(df[column].dtype),
                "records": len(df),
                "missing": int(df[column].isna().sum()),
                "missing_pct": round(
                    df[column].isna().mean() * 100, 2
                ),
                "unique_values": int(df[column].nunique()),
            }
        )

    audit = pd.DataFrame(rows)

    audit.to_csv(
        TABLES_DIR / "dataset_audit.csv",
        index=False,
    )

    return audit


# ============================================================
# DUPLICATE AUDIT
# ============================================================

def duplicate_audit(df: pd.DataFrame) -> dict:
    """Check duplicate records and beneficiary IDs."""

    full_duplicates = int(df.duplicated().sum())

    duplicate_beneficiary_ids = int(
        df["beneficiary_id"].duplicated().sum()
    )

    return {
        "full_duplicate_records": full_duplicates,
        "duplicate_beneficiary_ids": duplicate_beneficiary_ids,
    }


# ============================================================
# TARGET AUDIT
# ============================================================

def target_audit(df: pd.DataFrame) -> pd.DataFrame:
    """Audit the supervised learning target."""

    if TARGET not in df.columns:
        raise ValueError(
            f"Required target '{TARGET}' is missing."
        )

    counts = df[TARGET].value_counts().sort_index()

    summary = pd.DataFrame(
        {
            "target_value": counts.index,
            "records": counts.values,
            "percentage": (
                counts.values / len(df) * 100
            ).round(2),
        }
    )

    summary.to_csv(
        TABLES_DIR / "target_distribution.csv",
        index=False,
    )

    return summary


# ============================================================
# PILLAR ANALYSIS
# ============================================================

def pillar_analysis(df: pd.DataFrame) -> pd.DataFrame:
    """
    Analyse beneficiary distribution and dropout rate
    across the four Inuka pillars.
    """

    result = (
        df.groupby(PILLAR_COLUMN)
        .agg(
            beneficiaries=("beneficiary_id", "count"),
            dropout_count=(TARGET, "sum"),
            dropout_rate=(TARGET, "mean"),
            avg_attendance=("attendance_rate", "mean"),
            avg_grade=("grade_average", "mean"),
            avg_assignment_completion=(
                "assignment_completion",
                "mean",
            ),
            avg_travel_distance=(
                "travel_distance_km",
                "mean",
            ),
        )
        .reset_index()
    )

    result["dropout_rate"] = (
        result["dropout_rate"] * 100
    ).round(2)

    result = result.round(3)

    result.to_csv(
        TABLES_DIR / "pillar_analysis.csv",
        index=False,
    )

    return result


# ============================================================
# REGION ANALYSIS
# ============================================================

def region_analysis(df: pd.DataFrame) -> pd.DataFrame:
    """Analyse beneficiary and outcome patterns by region."""

    result = (
        df.groupby(REGION_COLUMN)
        .agg(
            beneficiaries=("beneficiary_id", "count"),
            dropout_count=(TARGET, "sum"),
            dropout_rate=(TARGET, "mean"),
            avg_attendance=("attendance_rate", "mean"),
            avg_grade=("grade_average", "mean"),
            avg_socioeconomic_index=(
                "socioeconomic_index",
                "mean",
            ),
            avg_assignment_completion=(
                "assignment_completion",
                "mean",
            ),
            avg_travel_distance=(
                "travel_distance_km",
                "mean",
            ),
        )
        .reset_index()
    )

    result["dropout_rate"] = (
        result["dropout_rate"] * 100
    ).round(2)

    result = result.round(3)

    result.to_csv(
        TABLES_DIR / "regional_analysis.csv",
        index=False,
    )

    return result


# ============================================================
# NUMERIC SUMMARY
# ============================================================

def numeric_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Generate descriptive statistics."""

    available = [
        column
        for column in NUMERIC_FEATURES
        if column in df.columns
    ]

    summary = (
        df[available]
        .describe()
        .T
        .reset_index()
        .rename(columns={"index": "feature"})
    )

    summary.to_csv(
        TABLES_DIR / "numeric_summary.csv",
        index=False,
    )

    return summary


# ============================================================
# CORRELATION ANALYSIS
# ============================================================

def correlation_analysis(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate Pearson correlations among numeric variables.

    Note:
        Correlation is association, not causation.
    """

    available = [
        column
        for column in NUMERIC_FEATURES + [TARGET]
        if column in df.columns
    ]

    correlation = df[available].corr()

    correlation.to_csv(
        TABLES_DIR / "correlation_matrix.csv"
    )

    return correlation


# ============================================================
# TARGET ASSOCIATION ANALYSIS
# ============================================================

def target_feature_analysis(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compare each numeric predictor between beneficiaries
    who dropped out and those who did not.
    """

    rows = []

    for feature in NUMERIC_FEATURES:

        if feature not in df.columns:
            continue

        grouped = (
            df.groupby(TARGET)[feature]
            .agg(
                mean="mean",
                median="median",
                std="std",
            )
            .reset_index()
        )

        for _, row in grouped.iterrows():
            rows.append(
                {
                    "feature": feature,
                    "dropped_out": int(row[TARGET]),
                    "mean": round(row["mean"], 4),
                    "median": round(row["median"], 4),
                    "std": round(row["std"], 4),
                }
            )

    result = pd.DataFrame(rows)

    result.to_csv(
        TABLES_DIR / "target_feature_comparison.csv",
        index=False,
    )

    return result


# ============================================================
# FAMILY DROPOUT ANALYSIS
# ============================================================

def family_history_analysis(df: pd.DataFrame) -> pd.DataFrame:
    """
    Explicitly analyse historical family dropout history
    against the actual synthetic dropped_out outcome.

    IMPORTANT:
        This identifies association in synthetic data.
        It does NOT establish causality.
    """

    feature = "historical_dropouts_in_family"

    result = (
        df.groupby(feature)
        .agg(
            beneficiaries=("beneficiary_id", "count"),
            dropout_count=(TARGET, "sum"),
            dropout_rate=(TARGET, "mean"),
        )
        .reset_index()
    )

    result["dropout_rate"] = (
        result["dropout_rate"] * 100
    ).round(2)

    result.to_csv(
        TABLES_DIR / "family_history_vs_dropout.csv",
        index=False,
    )

    return result


# ============================================================
# ATTENDANCE ANALYSIS
# ============================================================

def attendance_analysis(df: pd.DataFrame) -> pd.DataFrame:
    """
    Analyse dropout rate across attendance bands.
    """

    bins = [
        0.0,
        0.50,
        0.60,
        0.70,
        0.80,
        0.90,
        1.00,
    ]

    labels = [
        "<=50%",
        "51-60%",
        "61-70%",
        "71-80%",
        "81-90%",
        ">90%",
    ]

    working = df.copy()

    working["attendance_band"] = pd.cut(
        working["attendance_rate"],
        bins=bins,
        labels=labels,
        include_lowest=True,
    )

    result = (
        working.groupby(
            "attendance_band",
            observed=False,
        )
        .agg(
            beneficiaries=("beneficiary_id", "count"),
            dropout_count=(TARGET, "sum"),
            dropout_rate=(TARGET, "mean"),
        )
        .reset_index()
    )

    result["dropout_rate"] = (
        result["dropout_rate"] * 100
    ).round(2)

    result.to_csv(
        TABLES_DIR / "attendance_vs_dropout.csv",
        index=False,
    )

    return result


# ============================================================
# PLOTS
# ============================================================

def save_plot(fig, filename: str) -> None:
    """Save and close matplotlib figure."""

    fig.tight_layout()

    fig.savefig(
        PLOTS_DIR / filename,
        dpi=150,
        bbox_inches="tight",
    )

    plt.close(fig)


def plot_target_distribution(df: pd.DataFrame) -> None:

    counts = df[TARGET].value_counts().sort_index()

    labels = ["Did not drop out", "Dropped out"]

    values = [
        counts.get(0, 0),
        counts.get(1, 0),
    ]

    fig, ax = plt.subplots(figsize=(7, 5))

    ax.bar(labels, values)

    ax.set_title("Synthetic Dropout Outcome Distribution")
    ax.set_ylabel("Beneficiaries")

    save_plot(
        fig,
        "01_target_distribution.png",
    )


def plot_dropout_by_pillar(df: pd.DataFrame) -> None:

    grouped = (
        df.groupby(PILLAR_COLUMN)[TARGET]
        .mean()
        .sort_values(ascending=False)
        * 100
    )

    fig, ax = plt.subplots(figsize=(8, 5))

    ax.bar(
        grouped.index,
        grouped.values,
    )

    ax.set_title(
        "Synthetic Dropout Rate by Inuka Pillar"
    )

    ax.set_ylabel("Dropout Rate (%)")
    ax.set_xlabel("Pillar")

    ax.tick_params(axis="x", rotation=20)

    save_plot(
        fig,
        "02_dropout_by_pillar.png",
    )


def plot_dropout_by_region(df: pd.DataFrame) -> None:

    grouped = (
        df.groupby(REGION_COLUMN)[TARGET]
        .mean()
        .sort_values(ascending=False)
        * 100
    )

    fig, ax = plt.subplots(figsize=(8, 5))

    ax.bar(
        grouped.index,
        grouped.values,
    )

    ax.set_title(
        "Synthetic Dropout Rate by Region"
    )

    ax.set_ylabel("Dropout Rate (%)")
    ax.set_xlabel("Region")

    ax.tick_params(axis="x", rotation=20)

    save_plot(
        fig,
        "03_dropout_by_region.png",
    )


def plot_family_history(df: pd.DataFrame) -> None:

    grouped = (
        df.groupby(
            "historical_dropouts_in_family"
        )[TARGET]
        .mean()
        * 100
    )

    fig, ax = plt.subplots(figsize=(8, 5))

    ax.bar(
        grouped.index.astype(str),
        grouped.values,
    )

    ax.set_title(
        "Historical Family Dropouts vs Synthetic Dropout Rate"
    )

    ax.set_xlabel(
        "Historical Dropouts in Family"
    )

    ax.set_ylabel(
        "Dropout Rate (%)"
    )

    save_plot(
        fig,
        "04_family_history_vs_dropout.png",
    )


def plot_attendance_vs_dropout(df: pd.DataFrame) -> None:

    grouped = (
        df.groupby(
            pd.cut(
                df["attendance_rate"],
                bins=[
                    0.0,
                    0.50,
                    0.60,
                    0.70,
                    0.80,
                    0.90,
                    1.00,
                ],
            ),
            observed=False,
        )[TARGET]
        .mean()
        * 100
    )

    fig, ax = plt.subplots(figsize=(9, 5))

    ax.plot(
        range(len(grouped)),
        grouped.values,
        marker="o",
    )

    ax.set_title(
        "Attendance Level vs Synthetic Dropout Rate"
    )

    ax.set_xlabel("Attendance Band")
    ax.set_ylabel("Dropout Rate (%)")

    ax.set_xticks(range(len(grouped)))
    ax.set_xticklabels(
        [str(x) for x in grouped.index],
        rotation=30,
        ha="right",
    )

    save_plot(
        fig,
        "05_attendance_vs_dropout.png",
    )


def plot_numeric_distributions(df: pd.DataFrame) -> None:

    for feature in NUMERIC_FEATURES:

        if feature not in df.columns:
            continue

        fig, ax = plt.subplots(figsize=(8, 5))

        ax.hist(
            df[feature].dropna(),
            bins=25,
        )

        ax.set_title(
            f"Distribution of {feature}"
        )

        ax.set_xlabel(feature)
        ax.set_ylabel("Frequency")

        filename = (
            "distribution_"
            + feature.replace(
                " ",
                "_",
            )
            + ".png"
        )

        save_plot(
            fig,
            filename,
        )


# ============================================================
# MARKDOWN REPORT
# ============================================================

def build_report(
    df: pd.DataFrame,
    audit: pd.DataFrame,
    duplicates: dict,
    target_summary: pd.DataFrame,
    pillar_summary: pd.DataFrame,
    region_summary: pd.DataFrame,
    correlation: pd.DataFrame,
    family_summary: pd.DataFrame,
    attendance_summary: pd.DataFrame,
) -> None:
    """Create a human-readable EDA report."""

    dropout_rate = (
        df[TARGET].mean() * 100
    )

    missing_total = int(
        df.isna().sum().sum()
    )

    report = f"""# Inuka Foundation Predictive Analytics
## Exploratory Data Analysis & Target Audit

**Dataset:** `synthetic_beneficiaries.json`

**Records:** {len(df):,}

**Features:** {len(df.columns)}

**Target:** `{TARGET}`

**Synthetic dropout rate:** {dropout_rate:.2f}%

> **Important:** All findings in this report are based on synthetic data.
> They must not be presented as actual Inuka Foundation dropout statistics.

---

# 1. Dataset Quality Audit

Total records: **{len(df):,}**

Total missing values: **{missing_total:,}**

Full duplicate records: **{duplicates["full_duplicate_records"]:,}**

Duplicate beneficiary IDs: **{duplicates["duplicate_beneficiary_ids"]:,}**

## Columns

"""

    for _, row in audit.iterrows():
        report += (
            f"- `{row['column']}` — "
            f"{row['dtype']}, "
            f"{row['unique_values']} unique values, "
            f"{row['missing']} missing values\\n"
        )

    report += """
---

# 2. Four Inuka Pillars

The dataset contains the four intended programme dimensions:

"""

    for pillar in EXPECTED_PILLARS:
        count = int(
            (df[PILLAR_COLUMN] == pillar).sum()
        )

        report += (
            f"- **{pillar}:** {count} beneficiaries\\n"
        )

    report += """

The pillar dimension must remain visible throughout
the predictive analytics workflow rather than being treated
as an afterthought.

---

# 3. Target Audit

The supervised learning target is:

`dropped_out`

This target represents a historical synthetic outcome.

The target should NOT be generated using predictor thresholds
during model training.

The purpose is for the model to learn relationships between
predictor variables and the historical outcome.

"""

    for _, row in target_summary.iterrows():
        label = (
            "Did not drop out"
            if int(row["target_value"]) == 0
            else "Dropped out"
        )

        report += (
            f"- {label}: "
            f"{int(row['records'])} "
            f"({row['percentage']:.2f}%)\\n"
        )

    report += """

---

# 4. Pillar-Level Outcome Analysis

"""

    report += pillar_summary.to_markdown(
        index=False
    )

    report += """

---

# 5. Regional Analysis

"""

    report += region_summary.to_markdown(
        index=False
    )

    report += """

---

# 6. Predictor Analysis

The main candidate predictors are:

- Attendance rate
- Grade average
- Socioeconomic index
- Historical dropouts in family
- Assignment completion
- Travel distance

These variables should be evaluated for association with
the historical outcome before model development.

---

# 7. Historical Family Dropout vs Actual Dropout

"""

    report += family_summary.to_markdown(
        index=False
    )

    report += """

### Interpretation rule

A higher dropout rate among beneficiaries with more historical
family dropouts would indicate an **association in the synthetic
dataset**.

It does NOT establish that family dropout history causes dropout.

This distinction is important for responsible predictive analytics.

---

# 8. Attendance vs Dropout

"""

    report += attendance_summary.to_markdown(
        index=False
    )

    report += """

Attendance is particularly important because it is an operationally
actionable signal.

If declining attendance is associated with higher historical dropout
rates, attendance could become an early-warning feature for proactive
intervention.

---

# 9. Correlation Matrix

"""

    report += correlation.to_markdown()

    report += """

Correlation should be treated as an exploratory diagnostic rather
than proof of causation.

---

# 10. Data Science Decision

The next stage is model development.

Before training the final model we should confirm:

1. `dropped_out` is sufficiently represented in both classes.
2. Predictors contain meaningful variation.
3. No target leakage exists.
4. Categorical features are encoded using training data only.
5. Train/test splitting occurs before fitting preprocessing.
6. Model performance is evaluated using appropriate metrics.
7. Performance is assessed beyond accuracy, especially because
   false negatives may be operationally costly.
8. The four Inuka pillars remain visible in model evaluation.

---

# 11. Important Limitation

This dataset is synthetic.

Therefore:

- dropout rates are not real Inuka statistics;
- regional differences are synthetic;
- pillar differences are synthetic;
- family-history relationships are synthetic;
- model performance on this dataset does not establish
  real-world predictive performance.

The model should ultimately be validated against real historical
Inuka outcomes when appropriately governed data becomes available.

---

# Output Files

The EDA process produces:

- `dataset_audit.csv`
- `target_distribution.csv`
- `pillar_analysis.csv`
- `regional_analysis.csv`
- `numeric_summary.csv`
- `correlation_matrix.csv`
- `target_feature_comparison.csv`
- `family_history_vs_dropout.csv`
- `attendance_vs_dropout.csv`

and visualisations under:

`data/eda_output/plots/`

"""

    report_path = OUTPUT_DIR / "EDA_REPORT.md"

    report_path.write_text(
        report,
        encoding="utf-8",
    )


# ============================================================
# MAIN
# ============================================================

def main() -> None:

    df = load_data()

    print("\n[1/10] Running dataset audit...")
    audit = dataset_audit(df)

    print("[2/10] Checking duplicates...")
    duplicates = duplicate_audit(df)

    print("[3/10] Auditing target...")
    target_summary = target_audit(df)

    print("[4/10] Analysing four Inuka pillars...")
    pillar_summary = pillar_analysis(df)

    print("[5/10] Analysing regions...")
    region_summary = region_analysis(df)

    print("[6/10] Generating numeric summary...")
    numeric_summary(df)

    print("[7/10] Calculating correlations...")
    correlation = correlation_analysis(df)

    print("[8/10] Analysing predictors against target...")
    target_feature_analysis(df)

    family_summary = family_history_analysis(df)

    attendance_summary = attendance_analysis(df)

    print("[9/10] Generating plots...")

    plot_target_distribution(df)
    plot_dropout_by_pillar(df)
    plot_dropout_by_region(df)
    plot_family_history(df)
    plot_attendance_vs_dropout(df)
    plot_numeric_distributions(df)

    print("[10/10] Generating Markdown report...")

    build_report(
        df=df,
        audit=audit,
        duplicates=duplicates,
        target_summary=target_summary,
        pillar_summary=pillar_summary,
        region_summary=region_summary,
        correlation=correlation,
        family_summary=family_summary,
        attendance_summary=attendance_summary,
    )

    print()
    print("=" * 70)
    print("EDA COMPLETED SUCCESSFULLY")
    print("=" * 70)
    print(f"Report: {OUTPUT_DIR / 'EDA_REPORT.md'}")
    print(f"Plots:  {PLOTS_DIR}")
    print(f"Tables: {TABLES_DIR}")
    print()
    print("Target distribution:")

    for _, row in target_summary.iterrows():
        print(
            f"  dropped_out={int(row['target_value'])}: "
            f"{int(row['records'])} "
            f"({row['percentage']:.2f}%)"
        )

    print()
    print("Pillar distribution:")

    for _, row in pillar_summary.iterrows():
        print(
            f"  {row[PILLAR_COLUMN]}: "
            f"{int(row['beneficiaries'])} beneficiaries, "
            f"{row['dropout_rate']:.2f}% dropout"
        )

    print()
    print("Region distribution:")

    for _, row in region_summary.iterrows():
        print(
            f"  {row[REGION_COLUMN]}: "
            f"{int(row['beneficiaries'])} beneficiaries, "
            f"{row['dropout_rate']:.2f}% dropout"
        )

    print()
    print("Duplicate audit:")
    print(
        f"  Full duplicate records: "
        f"{duplicates['full_duplicate_records']}"
    )
    print(
        f"  Duplicate beneficiary IDs: "
        f"{duplicates['duplicate_beneficiary_ids']}"
    )

    print()
    print("Next step: review EDA_REPORT.md and the generated CSV/plots")
    print("before proceeding to model training.")


if __name__ == "__main__":
    main()