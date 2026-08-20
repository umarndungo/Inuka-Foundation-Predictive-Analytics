# Inuka Foundation Predictive Analytics — Task Breakdown: Backend Engineer
**Role focus:** API / Automation
**Branch:** `feature/backend-api`
**Owns:** `backend/` (FastAPI app, routes, Pydantic schemas, n8n triggers)

---

## 1. Scope of Ownership

You own the FastAPI service that ties everything together: exposes ML predictions via REST + SSE, enforces validation, and triggers the n8n/Twilio automation layer when risk crosses threshold.

```
backend/
├── main.py
├── app/
│   ├── core/ (config.py, db.py)
│   ├── models/ (beneficiary.py, metrics.py)
│   ├── api/v1/endpoints/ (evaluate.py, demand.py, telemetry.py)
│   ├── ml/ (owned by Data Scientist, you just import predict.py)
│   └── services/ (kafka_consumer.py, n8n_trigger.py)
```

---

## 2. Day-by-Day Task Breakdown

### Day 1 — Foundation
**Deliverable:** FastAPI skeleton running with CORS middleware and PostgreSQL database connections.

- [ ] Scaffold `main.py` with FastAPI app, CORS middleware (allow Next.js dev origin), and router registration.
- [ ] Build `app/core/config.py` (env-based settings) and `app/core/db.py` (SQLAlchemy engine/session against the Postgres from Data Engineer's `docker-compose.yml`).
- [ ] Define `app/models/beneficiary.py` and `app/models/metrics.py` SQLAlchemy models matching the Bronze/Silver/Gold schema.
- [ ] Implement `/api/v1/evaluate` route structure (`app/api/v1/endpoints/evaluate.py`) with Pydantic request/response schemas matching the contract exactly — wire a stub response first if Data Scientist's model isn't ready yet.
- [ ] Set up OpenAPI docs (`/docs`) — confirm it renders cleanly, useful for Frontend Engineer's integration.
- [ ] Standardize error handling: 404 via `HTTPException` when `beneficiary_id` not found in the identity graph.
- [ ] Confirm `docker-compose.yml` service wiring with Data Engineer (Postgres + Kafka reachable from the backend container).

### Day 2 — Integration
**Deliverable:** Live n8n webhook triggers connected to Twilio SMS API.

- [ ] Wire `app/api/v1/endpoints/evaluate.py` to actually call `backend/app/ml/predict.py` (Data Scientist's function) instead of the stub.
- [ ] Implement `app/services/n8n_trigger.py`: `IF risk_score > 0.75 THEN trigger_n8n_webhook()`, sent async via `httpx`.
- [ ] Stand up self-hosted n8n (Docker), build the workflow: webhook receiver → Twilio SMS API → field worker escalation.
- [ ] Implement `/api/v1/telemetry/stream` SSE route (`endpoints/telemetry.py`) using `EventSourceResponse`, pulling from Kafka via `fetch_latest_kafka_telemetry()` (coordinate with Data Engineer's `kafka_consumer.py`).
- [ ] Implement `/api/v1/demand` route (`endpoints/demand.py`) exposing Data Scientist's regional forecast output for the Demand Map.
- [ ] All external calls (Twilio, n8n, DB, Kafka) use `async/await`.
- [ ] Share final Pydantic schemas with Frontend Engineer so `api-client.ts` types match exactly.

### Day 3 — Testing & Hardening
**Deliverable:** API audit logging system and error handling logs.

- [ ] Implement request-logging middleware capturing method, path, status, latency, and (for `/evaluate`) the resulting `risk_tier` and whether automation fired — this becomes demo-day "proof of automation" evidence for the PM.
- [ ] Standardize error responses across all endpoints (consistent shape, correct status codes).
- [ ] Load-test `/api/v1/evaluate` and `/api/v1/telemetry/stream` under concurrent requests; confirm the SSE stream doesn't leak connections.
- [ ] Verify n8n → Twilio flow end-to-end with a real test message.
- [ ] Freeze API contract; communicate any last-minute schema changes to Frontend Engineer immediately.

---

## 3. Coding & Commit Conventions

- Commit format: `feat(api): <message>` / `fix(api): <message>`
- Every route has explicit Pydantic request/response models — no raw dicts in/out.
- All external I/O (DB, Kafka, Twilio, n8n) is `async`.
- Standard error handling:
```python
from fastapi import HTTPException, status

if not beneficiary_id:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Beneficiary ID not found in Identity Graph"
    )
```

---

## 4. Cross-Role Dependencies

| You need from | What |
|---|---|
| Data Engineer | Working Postgres schema + Kafka topics/consumer |
| Data Scientist | `predict.py` function signature + demand forecast output shape |

| They need from you | What |
|---|---|
| Frontend Engineer | Stable, documented API contract (OpenAPI/Swagger) + SSE endpoint |
| Project Manager | Audit logs as automation "proof" for the demo |

---

## 5. AI Context Block

```
I'm the Backend Engineer on a 72-hour hackathon project called "Inuka Sentinel" —
a predictive intelligence + automation platform for at-risk program beneficiaries
in Kenya. FastAPI is the integration hub between Kafka/Postgres, an XGBoost model,
and an n8n/Twilio automation layer.

STACK: FastAPI + Uvicorn + SQLAlchemy + Pydantic, PostgreSQL, Kafka (via a
consumer service), self-hosted n8n for workflow automation, Twilio for SMS.

MY SCOPE:
- backend/main.py — app entrypoint, CORS, router registration
- backend/app/core/ — config.py, db.py
- backend/app/models/ — beneficiary.py, metrics.py (SQLAlchemy)
- backend/app/api/v1/endpoints/ — evaluate.py, demand.py, telemetry.py
- backend/app/services/n8n_trigger.py — webhook trigger logic

KEY ENDPOINTS:
1. POST /api/v1/evaluate — request: {beneficiary_id, attendance_rate,
   assignment_completion, travel_distance_km, region}; response: {beneficiary_id,
   risk_score, risk_tier, drivers, recommended_action, automation_triggered}.
   Calls backend/app/ml/predict.py (owned by Data Scientist).
2. GET /api/v1/telemetry/stream — Server-Sent Events, ~2s interval, pulls from
   Kafka via a consumer service (owned by Data Engineer).
3. GET /api/v1/demand — regional demand forecast (owned by Data Scientist's
   pipeline).

AUTOMATION RULE: risk_score > 0.75 triggers an async call to an n8n webhook,
which sends an SMS via Twilio to a field worker.

CONSTRAINTS:
- Every route needs explicit Pydantic request/response schemas.
- All external I/O is async/await.
- Standard FastAPI HTTPException error handling (see pattern in project docs).
- Commit format: feat(api): <message>

CURRENT TASK: [paste today's specific task from the breakdown here]
```
