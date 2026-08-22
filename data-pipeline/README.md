# Data Pipeline — Quickstart

Synthetic-only data fabric for Inuka Risk Radar (Bronze → Silver → Gold).

## Architecture — streaming ETL (medallion)

This is a **streaming medallion pipeline**, not a classic batch ETL stack
(Airflow / dbt / Spark). Extract and load are event-driven via Kafka; transform
runs as idempotent Postgres views that refresh as soon as Bronze is written.

| Stage | What happens | Where |
|---|---|---|
| **Extract** | Synthetic beneficiary events published to Kafka | `scripts/seed_generator.py` → `scripts/kafka_producer_sim.py` |
| **Load** | Kafka payloads landed as raw JSON in Postgres | `backend/app/services/kafka_consumer.py` → `bronze.telemetry_events` |
| **Transform** | Dedup, join demographics, regional rollups | `sql/02_silver_identity_graph.sql`, `sql/03_gold_aggregates.sql` |

```
seed JSON → Kafka (beneficiary.telemetry / system.alerts)
         → Bronze (raw JSON events)
         → Silver (identity graph, one row per beneficiary)
         → Gold (regional_risk_stats, pillar_regional_stats, hourly volumes, alert stats)
```

| Layer | Objects | Purpose |
|---|---|---|
| **Bronze** | `bronze.telemetry_events` | Untouched Kafka payloads (telemetry + alerts) |
| **Silver** | `silver.beneficiary_demographics`, `silver.beneficiaries_master`, `silver.field_workers`, `silver.beneficiary_assignments`, `silver.latest_telemetry`, `silver.beneficiary_identity_graph` | Deduped canonical beneficiary records plus synthetic master/reference entities for ML / `/evaluate` / frontend |
| **Gold / Operations** | `gold.regional_risk_stats`, `gold.pillar_regional_stats`, `gold.regional_telemetry_hourly`, `gold.regional_alert_stats`, `gold.beneficiary_risk_scores`, `gold.demand_forecasts`, `gold.risk_trend_daily`, `operations.alerts`, `operations.interventions` | Pre-aggregates for dashboard + persisted demand/risk analytics, scoring artifacts, and operational alert/intervention state |

There is no separate ETL scheduler. Views are always consistent under Postgres
MVCC reads, which keeps Kafka → dashboard latency on the near-real-time path
(target <500ms once the API/SSE layer is wired).

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

## Apply schemas

On first Postgres boot, `data-pipeline/sql/*.sql` run via `docker-entrypoint-initdb.d`.
If the volume already exists, apply manually:

```bash
for f in data-pipeline/sql/0{1,2,3,4,5,6}_*.sql; do
  docker exec -i inuka-postgres psql -U inuka -d inuka_risk_radar < "$f"
done
```

## Day 1 — seed + Kafka round-trip

```bash
python data-pipeline/scripts/seed_generator.py
python data-pipeline/scripts/kafka_producer_sim.py --count 50 --rate 5
python data-pipeline/scripts/kafka_print_consumer.py --max-messages 10
```

## Day 2 — Bronze writer + Silver/Gold

```bash
# Static demographics for the identity graph
python data-pipeline/scripts/load_demographics.py

# Master beneficiary + field worker reference entities
python data-pipeline/scripts/load_reference_entities.py

# Materialize persisted demand forecast artifacts
python data-pipeline/scripts/materialize_demand_forecasts.py --days 7
# or, if already inside data-pipeline/
python scripts/materialize_demand_forecasts.py --days 7

# Land Kafka → bronze.telemetry_events (Ctrl+C to stop)
python data-pipeline/scripts/run_bronze_consumer.py

# Or land a fixed batch then exit:
python data-pipeline/scripts/run_bronze_consumer.py --max-messages 50

# In another terminal — publish events (preserve original synthetic timestamps)
python data-pipeline/scripts/kafka_producer_sim.py --count 50 --rate 10 --no-refresh-ts

# For realistic 7d/30d trend history in demos, backfill multi-day scores
python data-pipeline/scripts/backfill_risk_scores.py --days 30 --limit 250 --replace
# or, if already inside data-pipeline/
python scripts/backfill_risk_scores.py --days 30 --limit 250 --replace

# If you only want to recompute snapshots from already-persisted scores:
python data-pipeline/scripts/materialize_risk_trend_daily.py
# or, if already inside data-pipeline/
python scripts/materialize_risk_trend_daily.py
```

Check layers:

```bash
docker exec -it inuka-postgres psql -U inuka -d inuka_risk_radar -c \
  "SELECT count(*) FROM bronze.telemetry_events;"
docker exec -it inuka-postgres psql -U inuka -d inuka_risk_radar -c \
  "SELECT region, beneficiary_count, high_risk_count, dropout_rate FROM gold.regional_risk_stats;"
docker exec -it inuka-postgres psql -U inuka -d inuka_risk_radar -c \
  "SELECT region, pillar, beneficiary_count, dropout_rate FROM gold.pillar_regional_stats;"
```

### Backend SSE hook

```python
from app.services.kafka_consumer import fetch_latest_kafka_telemetry
events = fetch_latest_kafka_telemetry(limit=20)  # poll ~every 2s
```

### `system.alerts` contract (Backend → Kafka)

```json
{
  "alert_id": "ALT-001",
  "beneficiary_id": "BEN-9021",
  "risk_score": 0.88,
  "risk_tier": "HIGH",
  "region": "Kisumu",
  "triggered_at": "2026-08-20T12:00:00Z",
  "source": "evaluate/n8n"
}
```

## Topics

- `beneficiary.telemetry` — field events (3 partitions)

By default, demo bootstrap now publishes telemetry with `--no-refresh-ts` so Bronze/Silver rows preserve the original synthetic timestamps from `data/synthetic_beneficiaries.json`. Use the default timestamp refresh mode only when you explicitly want a "live replay" effect rather than strict seed provenance.
- `system.alerts` — risk escalation events (1 partition)

## Seam 1 (resolved)

Seed records include `travel_distance_km`, `assignment_completion`, `pillar`
(Scholarship | Plus | Vocational | Tech), `dropped_out` (historical synthetic
ML target), and reference/master fields used by the frontend (`full_name`,
`sub_county`, `school_name`, `grade`, `age`, `gender`, coordinates, and
field-worker assignment). Silver demographics + identity graph carry the ML
signals; Silver reference tables carry authentic synthetic profile/worker data;
Gold exposes `dropout_rate` and `gold.pillar_regional_stats` for programme analytics.

Persisted frontend-facing analytics now also live in:
- `gold.demand_forecasts` — chart-ready demand artifacts by `forecast_date`, `region`, and `horizon_days`
- `gold.risk_trend_daily` — daily snapshot history derived from `gold.beneficiary_risk_scores`

For demo-ready historical trend depth, use:
- `data-pipeline/scripts/backfill_risk_scores.py` — seeds multi-day synthetic score history into `gold.beneficiary_risk_scores` and refreshes `gold.risk_trend_daily`
