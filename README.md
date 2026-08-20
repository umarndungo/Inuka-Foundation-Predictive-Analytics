# Inuka-Foundation-Predictive-Analytics


**Predictive Intelligence & Program Automation** — built for the Inuka Foundation Hackathon (Stage 2)

Inuka Sentinel identifies at-risk program beneficiaries (education dropout risk) from field telemetry, scores them with a trained ML model, and automatically triggers SMS outreach to field workers when risk crosses a threshold — all visualized on a real-time, offline-capable dashboard.

**Sprint duration:** 72 hours · **Team:** 5 roles (Data Engineer, Data Scientist, Backend Engineer, Frontend Engineer, Project Manager)

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Core API Contract](#core-api-contract)
- [Data Flow](#data-flow)
- [Team & Ownership](#team--ownership)
- [Branching & Commit Conventions](#branching--commit-conventions)
- [Integration Notes](#integration-notes)
- [Sprint Plan](#sprint-plan)
- [Documentation Index](#documentation-index)

---

## Architecture

```
FIELD DATA
     |
     v
[Kafka Producer] --> [Kafka: beneficiary.telemetry] --> [Kafka Consumer] --> [PostgreSQL: Bronze]
 (Data Eng)                                              (Data Eng)           |        |
                                                                               |        v
                                                            (near-real-time)   |  [PostgreSQL: Silver — Identity Graph]
                                                                               |        |
                                                                               |        v
                                                                               |  [PostgreSQL: Gold — Aggregates]
                                                                               |        |          |
                                                                               |        v          v
                                                                               |  [ML: predict.py]  [Demand forecast]
                                                                               |   (Data Sci)         (Data Sci)
                                                                               |        |             |
                                                                               v        v             v
                                                        [FastAPI: /api/v1/telemetry/stream]  [/api/v1/evaluate]  [/api/v1/demand]
                                                                        (Backend Eng — all three routes)
                                                                               |             |
                                                                    REST + SSE |             | risk_score > 0.75
                                                                               |             v
                                                                               |      [n8n webhook] --> [Twilio SMS]
                                                                               |           (Backend Eng)
                                                                               |             |
                                                                               |             v
                                                                               |     [Kafka: system.alerts] (Data Eng)
                                                                               v
                                                                     [Next.js Dashboard]
                                                                      (Frontend Eng)
                                                                         |      ^
                                                        field entry when v      | sync on reconnect
                                                        offline           [Offline-sync IndexedDB queue]
                                                                         (Frontend Eng)
                                                                               |
                                                                               v
                                                                    [POST /api/offline-sync] --> Backend
                                                                               |
                                                                               v
                                                                        DEMO / JUDGES
```

Five layers, open-source end to end (no paid SaaS dependencies):

1. **Ingestion** — Kafka / Redpanda (Docker)
2. **Storage & Processing** — PostgreSQL, Bronze → Silver → Gold tiering
3. **Intelligence** — FastAPI + XGBoost / Scikit-Learn + MLflow tracking
4. **Automation & Action** — n8n (self-hosted) → Twilio SMS
5. **Experience** — Next.js (App Router) + Tailwind + Shadcn UI + Recharts + MapLibre GL

---

## Tech Stack

| Layer | Technology | Replaces (proprietary) |
|---|---|---|
| Data Fabric | Apache Kafka / Redpanda + PostgreSQL | Snowflake / Databricks |
| Machine Learning | Scikit-Learn / XGBoost + MLflow | Proprietary AutoML |
| Backend & API | FastAPI + Uvicorn + SQLAlchemy | — |
| Automation | Self-hosted n8n | Zapier / Make |
| Frontend & Mapping | Next.js 14+ + MapLibre GL / Leaflet | Mapbox (paid tokens) |

---

## Repository Structure

```
inuka-sentinel/
├── docker-compose.yml
├── backend/
│   ├── main.py
│   └── app/
│       ├── core/          # config.py, db.py
│       ├── models/        # beneficiary.py, metrics.py
│       ├── api/v1/        # evaluate.py, demand.py, telemetry.py
│       ├── ml/            # train.py, predict.py, model.pkl
│       └── services/      # kafka_consumer.py, n8n_trigger.py
├── frontend/
│   └── src/
│       ├── app/dashboard/ # Overview, Risk Radar, Demand Map
│       ├── components/    # charts/, maps/, RealtimeMetrics.tsx
│       ├── lib/           # db-offline.ts, api-client.ts
│       └── hooks/         # useOfflineSync.ts
└── data-pipeline/
    ├── scripts/           # seed_generator.py, kafka_producer_sim.py
    └── sql/                # 01_bronze, 02_silver, 03_gold
```

See the [full monorepo layout](#) in the implementation spec for every file.

---

## Getting Started

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd inuka-sentinel

# 2. Start the data fabric (Kafka + PostgreSQL)
docker compose up -d kafka postgres

# 3. Generate synthetic data and seed the pipeline
python data-pipeline/scripts/seed_generator.py
python data-pipeline/scripts/kafka_producer_sim.py

# 4. Run schema migrations
psql -f data-pipeline/sql/01_bronze_schema.sql
psql -f data-pipeline/sql/02_silver_identity_graph.sql
psql -f data-pipeline/sql/03_gold_aggregates.sql

# 5. Start the backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload

# 6. Start the frontend
cd frontend && npm install
npm run dev

# 7. Start n8n (self-hosted, Docker)
docker compose up -d n8n
```

The API docs are available at `http://localhost:8000/docs` once the backend is running. The dashboard runs at `http://localhost:3000`.

> **Note:** All data used in this project is synthetic. No real beneficiary data is processed.

---

## Core API Contract

### `POST /api/v1/evaluate`

```json
// Request
{
  "beneficiary_id": "BEN-9021",
  "attendance_rate": 0.58,
  "assignment_completion": 0.42,
  "travel_distance_km": 14.5,
  "region": "Kisumu"
}

// Response
{
  "beneficiary_id": "BEN-9021",
  "risk_score": 0.88,
  "risk_tier": "HIGH",
  "drivers": ["Low Attendance", "High Travel Distance"],
  "recommended_action": "Automated Field Worker Outreach",
  "automation_triggered": true
}
```

`risk_score > 0.75` automatically triggers an n8n webhook, which sends an SMS to a field worker via Twilio.

### `GET /api/v1/telemetry/stream`

Server-Sent Events, ~2s cadence, streams the latest Kafka telemetry near-real-time.

### `GET /api/v1/demand`

Regional demand forecast (Nairobi, Kisumu, Nakuru, Mombasa, Eldoret) for the Demand Map.

> ⚠️ **Known gap:** the base synthetic data generator does not currently produce `travel_distance_km` or `assignment_completion`, both required by `/evaluate`. This must be resolved on Day 1 — either extend `seed_generator.py`, or adjust the contract. See the [Integration Notes](#integration-notes).

---

## Data Flow

1. Field events are simulated/produced onto the Kafka topic `beneficiary.telemetry`.
2. A Kafka consumer writes raw events into **PostgreSQL Bronze**.
3. Bronze is joined against static demographic data into **Silver** (the beneficiary identity graph).
4. Silver is aggregated into **Gold** (regional stats consumed by ML and the dashboard).
5. The XGBoost model (`predict.py`) scores beneficiaries on request via `/api/v1/evaluate`; a separate forecasting pipeline produces regional demand estimates via `/api/v1/demand`.
6. High-risk scores (`> 0.75`) trigger an n8n webhook → Twilio SMS → and log an event to the `system.alerts` Kafka topic.
7. The Next.js dashboard consumes all of this via REST + SSE, with an offline-first IndexedDB queue for field data entered without connectivity, syncing back via `/api/offline-sync` on reconnect.

---

## Team & Ownership

| Role | Branch | Owns |
|---|---|---|
| Data Engineer | `feature/data-fabric` | Kafka topics, Bronze/Silver/Gold schemas, ingestion pipeline |
| Data Scientist | `feature/ml-forecasting` | `train.py`, `predict.py`, `model.pkl`, demand forecasting |
| Backend Engineer | `feature/backend-api` | FastAPI routes, Pydantic schemas, n8n/Twilio trigger |
| Frontend Engineer | `feature/dashboard-ui` | Next.js dashboard, offline sync, charts, maps |
| Project Manager | `feature/qa-impact-docs` | Architecture sign-off, UAT, Quantified Impact Memo, final deck |

Full task breakdowns and role-specific AI-assistant context blocks live in the [Documentation Index](#documentation-index) below.

---

## Branching & Commit Conventions

- `main` is production-ready and locked — every merge requires 1 peer review.
- Commit format: `<type>(<scope>): <short descriptive message>`
  - `feat(api): add FastAPI endpoint for XGBoost scoring`
  - `fix(frontend): adjust IndexedDB schema for offline sync replay`
  - `docs(pm): update Quantified Impact Memo formulas`
  - `data(pipeline): add mock telemetry generator for Kafka stream`
- Recommended merge order into `main`: `feature/data-fabric` → `feature/ml-forecasting` → `feature/backend-api` → `feature/dashboard-ui`. `feature/qa-impact-docs` merges independently at any point.
- Recommended review pairing: Data Engineer ↔ Data Scientist; Backend Engineer ↔ Frontend Engineer.

---

## Integration Notes

The four seams between roles are where sprint risk concentrates. Each is documented in detail in [`00_end_to_end_integration.md`](#documentation-index); summary:

1. **Data Engineer ↔ Data Scientist** — Silver/Gold schema must contain every feature the model needs, including `travel_distance_km` and `assignment_completion` (currently missing from the base seed generator — resolve on Day 1).
2. **Data Scientist ↔ Backend Engineer** — `predict.py`'s output must match the `/evaluate` response shape exactly, with `drivers` as human-readable strings; the model should be calibrated with the `risk_score > 0.75` automation cutoff in mind.
3. **Backend Engineer ↔ Frontend Engineer** — OpenAPI docs live by end of Day 1 (even with stubbed data) so frontend types can be written early; any schema change is broadcast immediately.
4. **Everyone ↔ Project Manager** — every number in the final deck and Impact Memo must trace back to a real artifact (latency report, model metrics, audit logs, working demo) — never an estimate.

**Critical Day 2 checkpoint:** run one request through the entire system live — field event → Kafka → Postgres → model score → API response → dashboard update → SMS (if HIGH risk). If this doesn't work end-to-end by end of Day 2, there's no slack left on Day 3.

---

## Sprint Plan

| Day | Theme | Key Deliverables |
|---|---|---|
| **Day 1** | Foundation | Dockerized Kafka + Postgres, baseline model + feature importances, FastAPI skeleton, Next.js shell, signed-off architecture |
| **Day 2** | Integration | Silver identity graph, demand forecasting wired in, live n8n/Twilio triggers, dynamic dashboard, UAT scripts |
| **Day 3** | Testing & Polish | Latency validation report, final model metrics, audit logging, offline-sync verification, final deck + Impact Memo |

Full day-by-day task lists per role are in the individual breakdown docs.

---

## Documentation Index

| Doc | Contents |
|---|---|
| `00_end_to_end_integration.md` | System-wide architecture diagram, integration seams, shared contracts, convergence checklist |
| `01_data_engineer.md` | Data Engineer task breakdown + AI context block |
| `02_data_scientist.md` | Data Scientist task breakdown + AI context block |
| `03_backend_engineer.md` | Backend Engineer task breakdown + AI context block |
| `04_frontend_engineer.md` | Frontend Engineer task breakdown + AI context block |
| `05_project_manager.md` | Project Manager task breakdown + AI context block |

---

## Data & Privacy Note

All beneficiary data used in this project — training data, demo data, and any data shown during judging — is **synthetically generated** (`data-pipeline/scripts/seed_generator.py`). No real personal or beneficiary data is used or stored. The synthetic generator intentionally skews Kisumu dropout indicators for scenario-testing purposes only; this is a deliberate test scenario, not a claim about real-world regional patterns, and should be presented as such in any demo or documentation.