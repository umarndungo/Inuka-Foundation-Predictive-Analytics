#!/usr/bin/env python3
"""
Load synthetic beneficiaries into silver.beneficiary_demographics.

Idempotent upsert on beneficiary_id. Synthetic data only — no real PII.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import psycopg2
except ImportError:
    print("Missing dependency: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

DEFAULT_DSN = os.getenv(
    "DATABASE_URL",
    "postgresql://inuka:inuka@localhost:5433/inuka_risk_radar",
)
DEFAULT_SEED = (
    Path(__file__).resolve().parent.parent / "data" / "synthetic_beneficiaries.json"
)

UPSERT_SQL = """
INSERT INTO silver.beneficiary_demographics (
    beneficiary_id,
    region,
    socioeconomic_index,
    historical_dropouts_in_family
) VALUES (%s, %s, %s, %s)
ON CONFLICT (beneficiary_id) DO UPDATE SET
    region = EXCLUDED.region,
    socioeconomic_index = EXCLUDED.socioeconomic_index,
    historical_dropouts_in_family = EXCLUDED.historical_dropouts_in_family
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Silver demographics from JSON.")
    parser.add_argument("--seed-file", type=Path, default=DEFAULT_SEED)
    parser.add_argument("--dsn", default=DEFAULT_DSN)
    args = parser.parse_args()

    if not args.seed_file.exists():
        print(f"Seed file not found: {args.seed_file}", file=sys.stderr)
        print("Run: python data-pipeline/scripts/seed_generator.py", file=sys.stderr)
        sys.exit(1)

    records = json.loads(args.seed_file.read_text(encoding="utf-8"))
    conn = psycopg2.connect(args.dsn)
    try:
        with conn.cursor() as cur:
            for row in records:
                cur.execute(
                    UPSERT_SQL,
                    (
                        row["beneficiary_id"],
                        row["region"],
                        row["socioeconomic_index"],
                        row["historical_dropouts_in_family"],
                    ),
                )
        conn.commit()
    finally:
        conn.close()

    print(f"Upserted {len(records)} demographics rows into silver.beneficiary_demographics")


if __name__ == "__main__":
    main()
