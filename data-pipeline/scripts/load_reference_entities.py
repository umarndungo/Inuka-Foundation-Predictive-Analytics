#!/usr/bin/env python3
"""
Load synthetic field workers, beneficiary master data, and assignments into Silver.

Idempotent upsert on primary keys. Synthetic data only — no real PII.
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

UPSERT_WORKER_SQL = """
INSERT INTO silver.field_workers (
    field_worker_id, code, full_name, region, sub_county, phone_number, active, home_base_lat, home_base_lng
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (field_worker_id) DO UPDATE SET
    code = EXCLUDED.code,
    full_name = EXCLUDED.full_name,
    region = EXCLUDED.region,
    sub_county = EXCLUDED.sub_county,
    phone_number = EXCLUDED.phone_number,
    active = EXCLUDED.active,
    home_base_lat = EXCLUDED.home_base_lat,
    home_base_lng = EXCLUDED.home_base_lng
"""

UPSERT_BENEFICIARY_SQL = """
INSERT INTO silver.beneficiaries_master (
    beneficiary_id, full_name, region, sub_county, school_name, grade, age, gender,
    phone_number, pillar, enrollment_date, field_worker_id, home_lat, home_lng
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (beneficiary_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    region = EXCLUDED.region,
    sub_county = EXCLUDED.sub_county,
    school_name = EXCLUDED.school_name,
    grade = EXCLUDED.grade,
    age = EXCLUDED.age,
    gender = EXCLUDED.gender,
    phone_number = EXCLUDED.phone_number,
    pillar = EXCLUDED.pillar,
    enrollment_date = EXCLUDED.enrollment_date,
    field_worker_id = EXCLUDED.field_worker_id,
    home_lat = EXCLUDED.home_lat,
    home_lng = EXCLUDED.home_lng
"""

UPSERT_ASSIGNMENT_SQL = """
INSERT INTO silver.beneficiary_assignments (
    beneficiary_id, field_worker_id, assigned_at, active
) VALUES (%s, %s, NOW(), TRUE)
ON CONFLICT (beneficiary_id, field_worker_id) DO UPDATE SET
    active = TRUE,
    assigned_at = NOW()
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Silver reference entities from JSON.")
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
            seen_workers: set[str] = set()
            for row in records:
                worker = row["field_worker"]
                worker_id = worker["field_worker_id"]
                if worker_id not in seen_workers:
                    cur.execute(
                        UPSERT_WORKER_SQL,
                        (
                            worker_id,
                            worker["code"],
                            worker["full_name"],
                            worker["region"],
                            worker["sub_county"],
                            worker.get("phone_number"),
                            True,
                            worker["home_base_lat"],
                            worker["home_base_lng"],
                        ),
                    )
                    seen_workers.add(worker_id)

                cur.execute(
                    UPSERT_BENEFICIARY_SQL,
                    (
                        row["beneficiary_id"],
                        row["full_name"],
                        row["region"],
                        row["sub_county"],
                        row["school_name"],
                        row["grade"],
                        row["age"],
                        row["gender"],
                        row.get("phone_number"),
                        row.get("pillar", "Scholarship"),
                        row["enrollment_date"],
                        worker_id,
                        row["home_lat"],
                        row["home_lng"],
                    ),
                )
                cur.execute(
                    UPSERT_ASSIGNMENT_SQL,
                    (row["beneficiary_id"], worker_id),
                )
        conn.commit()
    finally:
        conn.close()

    print(f"Upserted {len(records)} beneficiary master rows and {len(seen_workers)} field workers")


if __name__ == "__main__":
    main()
