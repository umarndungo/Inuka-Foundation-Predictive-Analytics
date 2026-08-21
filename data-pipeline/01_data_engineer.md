# Inuka Foundation Predictive Analytics — Task Breakdown: Data Engineer
**Role focus:** Data Fabric / Plumbing
**Branch:** `feature/data-fabric`
**Owns:** `data-pipeline/`, `backend/app/services/kafka_consumer.py`, PostgreSQL schema (`data-pipeline/sql/`)

---

## 1. Scope of Ownership

You own the ingestion and storage backbone of the system: getting synthetic/real events from the field into Kafka, and landing them in PostgreSQL through the Bronze → Silver → Gold tiering model.

| Layer | Location | Purpose |
|---|---|---|
| Bronze | `01_bronze_schema.sql` | Raw, untouched JSON event logs from Kafka |
| Silver | `02_silver_identity_graph.sql` | Joined/deduplicated beneficiary identity graph |
| Gold | `03_gold_aggregates.sql` | Pre-aggregated stats for dashboard + ML consumption |

Kafka topics you standardize on:
- `beneficiary.telemetry`
- `system.alerts`

---

## 2. Day-by-Day Task Breakdown

### Day 1 — Foundation
**Deliverable:** Dockerized Kafka + PostgreSQL schemas initialized.

- [ ] Write `docker-compose.yml` services for Kafka/Redpanda + PostgreSQL (coordinate with Backend Engineer, who also depends on this file — merge carefully).
- [ ] Create Kafka topics `beneficiary.telemetry` and `system.alerts` (via init script or Redpanda console).
- [ ] Write and run `01_bronze_schema.sql` — raw JSON log table, indexed by ingestion timestamp.
- [ ] Build `data-pipeline/scripts/kafka_producer_sim.py` to feed synthetic events into `beneficiary.telemetry` at a configurable rate.
- [ ] Run `data-pipeline/scripts/seed_generator.py` to produce `synthetic_beneficiaries.json`, validate output shape matches the schema Backend/Data Science expect (`beneficiary_id`, `pillar`, `dropped_out`, `attendance_rate`, `region`, etc.).
- [ ] Confirm producer → topic → consumer round-trip works locally (simple print consumer is fine for Day 1).
- [ ] Push to `feature/data-fabric`, open draft PR early so Backend Engineer can see topic names/shapes.

### Day 2 — Integration
**Deliverable:** Unified Beneficiary Identity Graph (`02_silver_identity_graph.sql`).

- [ ] Design and write SQL views/materialized views joining Kafka-sourced Bronze events with static demographic tables (region, socioeconomic index, historical dropout flags).
- [ ] Implement dedup/identity-resolution logic (one `beneficiary_id` → one canonical record even with repeated telemetry events).
- [ ] Build `backend/app/services/kafka_consumer.py` (or hand off stub to Backend Engineer) that consumes `beneficiary.telemetry` and writes into Bronze in near real time.
- [ ] Coordinate with Backend Engineer on the SSE endpoint (`/api/v1/telemetry/stream`) — confirm your consumer's write cadence supports the ~2s polling interval.
- [ ] Draft `03_gold_aggregates.sql`: regional rollups (attendance averages, dropout risk counts) that Data Scientist's forecasting pipeline and Frontend's dashboard will both query.
- [ ] Validate `system.alerts` topic receives messages when Backend triggers n8n webhooks (confirm message contract with Backend Engineer).

### Day 3 — Testing & Hardening
**Deliverable:** Kafka-to-Dashboard end-to-end latency validation report (<500ms target).

- [ ] Stress-test ingestion under simulated burst traffic — increase producer throughput in `kafka_producer_sim.py`, measure lag.
- [ ] Measure and document end-to-end latency: producer → Kafka → consumer → PostgreSQL → API → dashboard.
- [ ] Verify Gold aggregates stay consistent under concurrent writes (no dirty reads breaking dashboard charts).
- [ ] Write the latency validation report (numbers + methodology) for the Project Manager's presentation deck.
- [ ] Final schema freeze — confirm no breaking changes will land after this point; communicate to Backend/Data Science.

---

## 3. Coding & Commit Conventions

- Commit format: `data(pipeline): <message>` e.g. `data(pipeline): add mock telemetry generator for Kafka stream`
- SQL files are numbered and idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE VIEW`).
- Never write synthetic data generation logic that could be mistaken for real PII handling — this project uses synthetic data only; flag clearly in code comments if a field mimics a sensitive attribute (e.g. `historical_dropouts_in_family`).
- Target `main` only via PR with 1 peer review.

---

## 4. Cross-Role Dependencies

| You need from | What |
|---|---|
| Backend Engineer | Confirmation of consumer service contract, `docker-compose.yml` service names |
| Data Scientist | Feature list required in Gold layer for model training |
| Frontend Engineer | Aggregation granularity needed for Demand Map / Risk Radar |

| They need from you | What |
|---|---|
| Backend Engineer | Working Kafka topics + consumer stub |
| Data Scientist | Clean Silver/Gold tables to train against |
| Frontend Engineer | Stable Gold aggregates for charts/maps |

---

## 5. AI Context Block

Paste this into your AI coding assistant (Claude Code, Cursor, etc.) at the start of a session to give it working context:

```
I'm the Data Engineer on a 72-hour hackathon project called "Inuka Risk Radar" —
a predictive intelligence platform for tracking at-risk program beneficiaries
(education dropout risk prediction) in Kenya.

STACK: Apache Kafka (Docker/Redpanda) for event streaming, PostgreSQL for storage,
using a Bronze/Silver/Gold tiering model. Backend is FastAPI + SQLAlchemy consuming
from Kafka. Frontend is Next.js reading from Gold aggregates via FastAPI.

MY SCOPE:
- data-pipeline/scripts/seed_generator.py — synthetic beneficiary data generator
- data-pipeline/scripts/kafka_producer_sim.py — simulated event producer
- data-pipeline/sql/01_bronze_schema.sql — raw event storage
- data-pipeline/sql/02_silver_identity_graph.sql — joined beneficiary identity graph
- data-pipeline/sql/03_gold_aggregates.sql — pre-aggregated regional stats
- backend/app/services/kafka_consumer.py — Kafka → Postgres consumer

KAFKA TOPICS: `beneficiary.telemetry` (field data events), `system.alerts` (risk
escalation events triggered by the backend).

KEY FIELDS in synthetic data: beneficiary_id, timestamp, region
(Nairobi/Kisumu/Nakuru/Mombasa/Eldoret), pillar (Scholarship|Plus|Vocational|Tech),
attendance_rate, grade_average, socioeconomic_index, historical_dropouts_in_family,
assignment_completion, travel_distance_km, dropped_out (0/1 historical synthetic
outcome for ML training).

NOTE: dropped_out is the supervised target — do not derive training labels only
from the same predictors. pillar must flow seed → Kafka → Silver → Gold.
Gold exposes gold.pillar_regional_stats (region × pillar) and dropout_rate.

CONSTRAINTS:
- Target end-to-end latency (Kafka → dashboard) under 500ms.
- SQL should be idempotent (CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE VIEW).
- All data is synthetic — no real PII.
- Commit format: data(pipeline): <message>

CURRENT TASK: [paste today's specific task from the breakdown here]
```
