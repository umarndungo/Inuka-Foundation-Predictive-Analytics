#!/usr/bin/env python3
"""
Generate synthetic beneficiary records for Inuka Risk Radar.

All data is synthetic — no real PII. Field names that mimic sensitive attributes
(e.g. historical_dropouts_in_family) are flagged for clarity.

Resolves Day-1 Seam 1: includes travel_distance_km and assignment_completion
so Data Science / Backend /evaluate contracts stay aligned.
"""

from __future__ import annotations

import argparse
import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Reproducible by default for ML training / demo consistency.
DEFAULT_SEED = 42
REGIONS = ("Nairobi", "Kisumu", "Nakuru", "Mombasa", "Eldoret")

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


def _generate_one(rng: random.Random, beneficiary_id: str, base_ts: datetime) -> dict:
    region = rng.choice(REGIONS)

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

    event_ts = base_ts - timedelta(minutes=rng.randint(0, 60 * 24 * 14))

    return {
        "beneficiary_id": beneficiary_id,
        "timestamp": event_ts.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "region": region,
        "attendance_rate": round(attendance_rate, 4),
        "grade_average": round(grade_average, 2),
        "socioeconomic_index": round(socioeconomic_index, 2),
        # SYNTHETIC ONLY — not real personal/family data.
        "historical_dropouts_in_family": historical_dropouts_in_family,
        "assignment_completion": round(assignment_completion, 4),
        "travel_distance_km": round(travel_distance_km, 2),
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

    regions = {}
    for r in records:
        regions[r["region"]] = regions.get(r["region"], 0) + 1

    print(f"Wrote {len(records)} synthetic beneficiaries → {args.output}")
    print(f"Regions: {dict(sorted(regions.items()))}")
    print(f"Sample keys: {list(records[0].keys())}")


if __name__ == "__main__":
    main()
