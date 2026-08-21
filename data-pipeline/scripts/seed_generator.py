#!/usr/bin/env python3
"""
Generate synthetic beneficiary records for Inuka Risk Radar.

All data is synthetic — no real PII. Field names that mimic sensitive attributes
(e.g. historical_dropouts_in_family) are flagged for clarity.

Resolves Day-1 Seam 1: includes travel_distance_km and assignment_completion
so Data Science / Backend /evaluate contracts stay aligned.

Also includes:
  - pillar — Inuka programme dimension (Scholarship | Plus | Vocational | Tech)
  - dropped_out — historical synthetic outcome for supervised ML (not a
    deterministic function of the feature thresholds used at inference)
"""

from __future__ import annotations

import argparse
import json
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Reproducible by default for ML training / demo consistency.
DEFAULT_SEED = 42
REGIONS = ("Nairobi", "Kisumu", "Nakuru", "Mombasa", "Eldoret")
PILLARS = ("Scholarship", "Plus", "Vocational", "Tech")

# Deliberate demo skew: Kisumu shows elevated dropout-risk indicators.
# This is a synthetic test scenario, not a real-world regional claim.
KISUMU_RISK_BIAS = {
    "attendance_rate": (-0.18, -0.05),
    "grade_average": (-12.0, -4.0),
    "socioeconomic_index": (-1.2, -0.3),
    "historical_dropouts_in_family": (0, 2),
    "assignment_completion": (-0.20, -0.05),
    "travel_distance_km": (3.0, 10.0),
}


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _synthetic_dropout_outcome(
    rng: random.Random,
    *,
    attendance_rate: float,
    travel_distance_km: float,
    socioeconomic_index: float,
    assignment_completion: float,
    grade_average: float,
    historical_dropouts_in_family: int,
    pillar: str,
) -> int:
    """
    Sample a historical dropped_out label from a latent logistic process.

    Intentionally NOT the same OR-threshold rule used elsewhere for risk_tier /
    legacy at_risk engineering — ML must learn from a noisy generative outcome,
    not memorise a deterministic feature cut.
    """
    # Soft scores: higher → more likely dropout. Weights are synthetic only.
    logit = -1.35
    logit += (0.62 - attendance_rate) * 3.2
    logit += (travel_distance_km - 12.0) * 0.055
    logit += (2.8 - socioeconomic_index) * 0.35
    logit += (0.55 - assignment_completion) * 2.0
    logit += (58.0 - grade_average) * 0.028
    logit += historical_dropouts_in_family * 0.22
    # Mild programme effects (synthetic scenario, not a real claim).
    logit += {
        "Scholarship": -0.15,
        "Plus": 0.05,
        "Vocational": 0.12,
        "Tech": -0.05,
    }.get(pillar, 0.0)
    logit += rng.gauss(0.0, 0.85)  # irreducible noise

    prob = 1.0 / (1.0 + math.exp(-logit))
    return int(rng.random() < prob)


def _generate_one(rng: random.Random, beneficiary_id: str, base_ts: datetime) -> dict:
    region = rng.choice(REGIONS)
    pillar = rng.choice(PILLARS)

    attendance_rate = rng.uniform(0.45, 0.98)
    grade_average = rng.uniform(45.0, 95.0)
    # socioeconomic_index: 1 (most vulnerable) → 5 (least vulnerable) — synthetic scale
    socioeconomic_index = rng.uniform(1.0, 5.0)
    # Mimics a sensitive family attribute — SYNTHETIC ONLY, not real PII.
    historical_dropouts_in_family = rng.choices([0, 1, 2, 3], weights=[55, 25, 15, 5])[0]
    assignment_completion = rng.uniform(0.35, 0.99)
    travel_distance_km = rng.uniform(0.5, 25.0)

    if region == "Kisumu":
        attendance_rate = _clamp(
            attendance_rate + rng.uniform(*KISUMU_RISK_BIAS["attendance_rate"]), 0.05, 1.0
        )
        grade_average = _clamp(
            grade_average + rng.uniform(*KISUMU_RISK_BIAS["grade_average"]), 20.0, 100.0
        )
        socioeconomic_index = _clamp(
            socioeconomic_index + rng.uniform(*KISUMU_RISK_BIAS["socioeconomic_index"]),
            1.0,
            5.0,
        )
        historical_dropouts_in_family = min(
            3,
            historical_dropouts_in_family
            + rng.randint(*KISUMU_RISK_BIAS["historical_dropouts_in_family"]),
        )
        assignment_completion = _clamp(
            assignment_completion + rng.uniform(*KISUMU_RISK_BIAS["assignment_completion"]),
            0.05,
            1.0,
        )
        travel_distance_km = _clamp(
            travel_distance_km + rng.uniform(*KISUMU_RISK_BIAS["travel_distance_km"]),
            0.5,
            40.0,
        )

    dropped_out = _synthetic_dropout_outcome(
        rng,
        attendance_rate=attendance_rate,
        travel_distance_km=travel_distance_km,
        socioeconomic_index=socioeconomic_index,
        assignment_completion=assignment_completion,
        grade_average=grade_average,
        historical_dropouts_in_family=historical_dropouts_in_family,
        pillar=pillar,
    )

    event_ts = base_ts - timedelta(minutes=rng.randint(0, 60 * 24 * 14))

    return {
        "beneficiary_id": beneficiary_id,
        "timestamp": event_ts.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "region": region,
        "pillar": pillar,
        "attendance_rate": round(attendance_rate, 4),
        "grade_average": round(grade_average, 2),
        "socioeconomic_index": round(socioeconomic_index, 2),
        # SYNTHETIC ONLY — not real personal/family data.
        "historical_dropouts_in_family": historical_dropouts_in_family,
        "assignment_completion": round(assignment_completion, 4),
        "travel_distance_km": round(travel_distance_km, 2),
        # Historical synthetic outcome for supervised ML (target), not a feature cut.
        "dropped_out": dropped_out,
    }


def generate_beneficiaries(n: int, seed: int = DEFAULT_SEED) -> list[dict]:
    rng = random.Random(seed)
    base_ts = datetime.now(timezone.utc)
    start_id = 1000
    return [
        _generate_one(rng, f"BEN-{start_id + i}", base_ts)
        for i in range(n)
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic beneficiary seed data.")
    parser.add_argument("--count", type=int, default=500, help="Number of records (default: 500)")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="RNG seed (default: 42)")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "data" / "synthetic_beneficiaries.json",
        help="Output JSON path",
    )
    args = parser.parse_args()

    records = generate_beneficiaries(args.count, args.seed)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")

    regions: dict[str, int] = {}
    pillars: dict[str, int] = {}
    dropouts = 0
    for r in records:
        regions[r["region"]] = regions.get(r["region"], 0) + 1
        pillars[r["pillar"]] = pillars.get(r["pillar"], 0) + 1
        dropouts += int(r["dropped_out"])

    print(f"Wrote {len(records)} synthetic beneficiaries → {args.output}")
    print(f"Regions: {dict(sorted(regions.items()))}")
    print(f"Pillars: {dict(sorted(pillars.items()))}")
    print(f"dropped_out rate: {dropouts / len(records):.3f}")
    print(f"Sample keys: {list(records[0].keys())}")


if __name__ == "__main__":
    main()
