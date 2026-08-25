#!/usr/bin/env python3
"""
Master orchestrator: seed the entire database from synthetic_beneficiaries.json.

Runs all data-pipeline scripts in dependency order:
  1. Generate synthetic JSON (if missing)
  2. Load silver reference entities (field workers, beneficiaries, assignments)
  3. Load silver demographics
  4. Produce telemetry events to Kafka for ALL beneficiaries (ETL entry point)
  5. Wait for Bronze consumer to land events
  6. Materialize demand forecasts into gold
  7. Backfill historical risk scores into gold
  8. Verify row counts

Usage:
  # Inside Docker (db-seed service):
  python data-pipeline/scripts/seed_database.py --dsn postgresql://inuka:inuka@postgres:5432/inuka_risk_radar

  # Local development:
  python data-pipeline/scripts/seed_database.py --dsn postgresql://inuka:inuka@localhost:5433/inuka_risk_radar
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

try:
    import psycopg2
except ImportError:
    print("Missing dependency: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = Path(__file__).resolve().parent
DEFAULT_SEED_JSON = REPO_ROOT / "data-pipeline" / "data" / "synthetic_beneficiaries.json"
DEFAULT_DSN = os.getenv(
    "DATABASE_URL",
    "postgresql://inuka:inuka@localhost:5433/inuka_risk_radar",
)
DEFAULT_KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:19092")


def wait_for_postgres(dsn: str, max_attempts: int = 30, delay: float = 2.0) -> None:
    """Wait for PostgreSQL to accept TCP connections."""
    print(f"Waiting for PostgreSQL to be ready ({dsn})...")
    for attempt in range(1, max_attempts + 1):
        try:
            conn = psycopg2.connect(dsn, connect_timeout=5)
            conn.close()
            print(f"  PostgreSQL is ready (attempt {attempt})")
            return
        except psycopg2.OperationalError:
            if attempt == max_attempts:
                print(f"  PostgreSQL not ready after {max_attempts} attempts, giving up.", file=sys.stderr)
                sys.exit(1)
            print(f"  Attempt {attempt}/{max_attempts}: PostgreSQL not ready, retrying in {delay}s...")
            time.sleep(delay)


def run_script(script: str, args: list[str], label: str) -> None:
    """Run a data-pipeline script as a subprocess."""
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    cmd = [sys.executable, str(SCRIPTS_DIR / script), *args]
    result = subprocess.run(cmd, capture_output=False)
    if result.returncode != 0:
        print(f"FAILED: {label} (exit code {result.returncode})", file=sys.stderr)
        sys.exit(result.returncode)


def generate_seed_json(seed_path: Path) -> None:
    """Generate synthetic_beneficiaries.json if it doesn't exist."""
    if seed_path.exists():
        count = len(json.loads(seed_path.read_text(encoding="utf-8")))
        print(f"Seed JSON already exists with {count} records: {seed_path}")
        return
    print(f"Generating seed JSON at {seed_path}...")
    run_script("seed_generator.py", [], "Generate synthetic seed data")


def load_silver_reference(dsn: str, seed_path: Path) -> None:
    """Load field workers, beneficiary master, and assignments into silver."""
    run_script(
        "load_reference_entities.py",
        ["--dsn", dsn, "--seed-file", str(seed_path)],
        "Load Silver reference entities",
    )


def load_silver_demographics(dsn: str, seed_path: Path) -> None:
    """Load demographics into silver.beneficiary_demographics."""
    run_script(
        "load_demographics.py",
        ["--dsn", dsn, "--seed-file", str(seed_path)],
        "Load Silver demographics",
    )


def produce_telemetry(kafka_bootstrap: str, seed_path: Path, count: int) -> None:
    """Produce telemetry events to Kafka for ALL beneficiaries."""
    run_script(
        "kafka_producer_sim.py",
        [
            "--bootstrap", kafka_bootstrap,
            "--seed-file", str(seed_path),
            "--count", str(count),
            "--rate", "20",
            "--no-refresh-ts",
        ],
        f"Produce {count} telemetry events to Kafka",
    )
    print("Waiting 8s for Bronze consumer to land events...")
    time.sleep(8)


def materialize_demand(dsn: str, horizon_days: int) -> None:
    """Materialize demand forecasts into gold.demand_forecasts."""
    run_script(
        "materialize_demand_forecasts.py",
        ["--dsn", dsn, "--days", str(horizon_days)],
        f"Materialize demand forecasts ({horizon_days}d)",
    )


def backfill_risk_scores(dsn: str, seed_path: Path, days: int, limit: int) -> None:
    """Backfill historical risk scores into gold."""
    run_script(
        "backfill_risk_scores.py",
        ["--dsn", dsn, "--seed-file", str(seed_path), "--days", str(days), "--limit", str(limit), "--replace"],
        f"Backfill risk scores ({days}d, {limit} beneficiaries)",
    )


def verify_counts(dsn: str) -> None:
    """Print row counts for all key tables/views."""
    print(f"\n{'='*60}")
    print("  Verification: row counts")
    print(f"{'='*60}")

    queries = [
        ("bronze.telemetry_events", "SELECT count(*) FROM bronze.telemetry_events"),
        ("silver.beneficiary_demographics", "SELECT count(*) FROM silver.beneficiary_demographics"),
        ("silver.beneficiaries_master", "SELECT count(*) FROM silver.beneficiaries_master"),
        ("silver.field_workers", "SELECT count(*) FROM silver.field_workers"),
        ("silver.beneficiary_identity_graph", "SELECT count(*) FROM silver.beneficiary_identity_graph"),
        ("silver.latest_telemetry", "SELECT count(*) FROM silver.latest_telemetry"),
        ("gold.demand_forecasts", "SELECT count(*) FROM gold.demand_forecasts"),
        ("gold.beneficiary_risk_scores", "SELECT count(*) FROM gold.beneficiary_risk_scores"),
        ("gold.risk_trend_daily", "SELECT count(*) FROM gold.risk_trend_daily"),
        ("gold.regional_risk_stats", "SELECT count(*) FROM gold.regional_risk_stats"),
    ]

    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            for label, query in queries:
                cur.execute(query)
                count = cur.fetchone()[0]
                status = "OK" if count > 0 else "EMPTY"
                print(f"  {label:45s} {count:>8,}  [{status}]")
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the entire database from synthetic data.")
    parser.add_argument("--dsn", default=DEFAULT_DSN, help="PostgreSQL connection string")
    parser.add_argument("--seed-file", type=Path, default=DEFAULT_SEED_JSON, help="Path to synthetic JSON")
    parser.add_argument("--kafka-bootstrap", default=DEFAULT_KAFKA_BOOTSTRAP, help="Kafka bootstrap servers")
    parser.add_argument("--telemetry-count", type=int, default=500, help="Number of telemetry events to produce")
    parser.add_argument("--risk-days", type=int, default=30, help="Days of risk score history to backfill")
    parser.add_argument("--risk-limit", type=int, default=500, help="Max beneficiaries for risk backfill")
    parser.add_argument("--demand-horizon", type=int, default=7, help="Demand forecast horizon in days")
    args = parser.parse_args()

    print(f"Database: {args.dsn}")
    print(f"Seed JSON: {args.seed_file}")
    print(f"Kafka: {args.kafka_bootstrap}")

    # Step 0: Wait for PostgreSQL to accept TCP connections
    wait_for_postgres(args.dsn)

    # Step 1: Generate seed JSON if missing
    generate_seed_json(args.seed_file)

    # Step 2-3: Load silver reference data (static, no Kafka needed)
    load_silver_reference(args.dsn, args.seed_file)
    load_silver_demographics(args.dsn, args.seed_file)

    # Step 4-5: Produce telemetry to Kafka (ETL entry point)
    produce_telemetry(args.kafka_bootstrap, args.seed_file, args.telemetry_count)

    # Step 6: Materialize demand forecasts
    materialize_demand(args.dsn, args.demand_horizon)

    # Step 7: Backfill historical risk scores
    backfill_risk_scores(args.dsn, args.seed_file, args.risk_days, args.risk_limit)

    # Step 8: Verify
    verify_counts(args.dsn)

    print(f"\n{'='*60}")
    print("  Database seeding complete!")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
