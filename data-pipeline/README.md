# Data Pipeline — Day 1 quickstart

Synthetic-only data fabric for Inuka Risk Radar.

## Prerequisites

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r data-pipeline/requirements.txt
docker compose up -d redpanda redpanda-init postgres
```

| Service | Host access | In-compose |
|---|---|---|
| Redpanda (Kafka API) | `localhost:19092` | `redpanda:9092` |
| PostgreSQL | `localhost:5433` | `postgres:5432` |

DB credentials: `inuka` / `inuka` / `inuka_risk_radar`

> Host Postgres port is **5433** so it does not clash with a system Postgres on 5432.

## Generate seed + publish

```bash
python data-pipeline/scripts/seed_generator.py          # → data/synthetic_beneficiaries.json
python data-pipeline/scripts/kafka_producer_sim.py --count 50 --rate 5
python data-pipeline/scripts/kafka_print_consumer.py --max-messages 10
```

## Schema

```bash
# Applied automatically on first Postgres boot via docker-entrypoint-initdb.d
psql "postgresql://inuka:inuka@localhost:5433/inuka_risk_radar" -f data-pipeline/sql/01_bronze_schema.sql
```

## Topics

- `beneficiary.telemetry` — field events (3 partitions)
- `system.alerts` — risk escalation events (1 partition)

## Seam 1 (Day 1 resolved)

Seed records include `travel_distance_km` and `assignment_completion` so `/evaluate` and ML training stay aligned.
