# Data Pipeline — Quickstart

Synthetic-only data fabric for Inuka Risk Radar (Bronze → Silver → Gold).

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
for f in data-pipeline/sql/0{1,2,3}_*.sql; do
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

# Land Kafka → bronze.telemetry_events (Ctrl+C to stop)
python data-pipeline/scripts/run_bronze_consumer.py

# Or land a fixed batch then exit:
python data-pipeline/scripts/run_bronze_consumer.py --max-messages 50

# In another terminal — publish events
python data-pipeline/scripts/kafka_producer_sim.py --count 50 --rate 10
```

Check layers:

```bash
docker exec -it inuka-postgres psql -U inuka -d inuka_risk_radar -c \
  "SELECT count(*) FROM bronze.telemetry_events;"
docker exec -it inuka-postgres psql -U inuka -d inuka_risk_radar -c \
  "SELECT region, beneficiary_count, high_risk_count FROM gold.regional_risk_stats;"
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
- `system.alerts` — risk escalation events (1 partition)

## Seam 1 (resolved)

Seed records include `travel_distance_km` and `assignment_completion`.
