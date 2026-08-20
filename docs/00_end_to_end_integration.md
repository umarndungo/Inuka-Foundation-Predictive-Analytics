# Inuka Foundation Predictive Analytics
**Purpose:** Shows how the five role-based workstreams (Data Engineer, Data Scientist, Backend Engineer, Frontend Engineer, Project Manager) fit together into one system, where their contracts meet, and what has to be true at each integration point for the 72-hour sprint to converge on Day 3.

Read this alongside the five individual task breakdown docs — this file is the map; those are the turn-by-turn directions.

---

## 1. The System in One Picture

```
 FIELD DATA                                                    DEMO / JUDGES
     |                                                               ^
     v                                                               |
[Kafka Producer] --> [Kafka: beneficiary.telemetry] --> [Kafka Consumer] --> [PostgreSQL: Bronze]
 (Data Eng)                                              (Data Eng)                |
                                                                                    v
                                                                     [PostgreSQL: Silver — Identity Graph]
                                                                                    |
                                                                                    v
                                                                     [PostgreSQL: Gold — Aggregates]
                                                                             |            |
                                                                             v            v
                                                              [ML: predict.py]   [Demand forecast]
                                                                (Data Sci)          (Data Sci)
                                                                             |            |
                                                                             v            v
                                                          [FastAPI: /api/v1/evaluate]  [/api/v1/demand]
                                                          [FastAPI: /api/v1/telemetry/stream]
                                                                       (Backend Eng)
                                                                    |            |
                                          risk_score > 0.75         |            |  REST + SSE
                                                |                   |            v
                                                v                   |     [Next.js Dashboard]
                                     [n8n webhook] --> [Twilio SMS]  \    (Frontend Eng)
                                          (Backend Eng)               \        |
                                                                        \       v
                                                                     [Offline-sync IndexedDB queue]
                                                                          (Frontend Eng)

     [Project Manager sits across all of this: contracts, UAT, Impact Memo, final deck]
```

---

## 2. The Four Integration Seams

Everything that can go wrong in a 72-hour sprint goes wrong at a seam between two roles, not inside a single role's code. There are four seams — own them explicitly.

### Seam 1 — Data Engineer ↔ Data Scientist
**What crosses this seam:** Clean Silver/Gold PostgreSQL tables with every field the model needs.

- The model's feature list (from EDA on Day 1) must match column names available in Silver/Gold — including `travel_distance_km`, which appears in the `/api/v1/evaluate` API contract but is **not** in the seed generator's synthetic fields. Data Engineer must add it to `seed_generator.py` and the Bronze/Silver schema before Data Scientist trains on it, or Data Scientist must train without it and drop it from the API contract — **this must be resolved explicitly on Day 1**, not discovered on Day 2.
- Gold-layer aggregation granularity (by region, by time window) must match what the demand-forecasting pipeline expects as input.
- **Failure mode to watch for:** Data Scientist trains against a local copy of `synthetic_beneficiaries.json` that silently drifts from what's actually landing in Postgres. Resolve by Day 2: Data Scientist reads from the real Silver/Gold tables, not the flat file, once they exist.

### Seam 2 — Data Scientist ↔ Backend Engineer
**What crosses this seam:** A stable Python function signature (`predict.py`) and an exact response schema.

- Backend Engineer's `/api/v1/evaluate` route should stub out a hardcoded response on Day 1 (matching the final JSON shape) so Frontend Engineer can start integrating immediately — then swap in the real `predict.py` call on Day 2 without changing the contract.
- The `drivers` field must be human-readable strings ("Low Attendance"), not raw feature names ("attendance_rate") — Data Scientist owns this translation inside `predict.py`, not Backend.
- The `risk_score > 0.75` automation threshold is shared knowledge — Data Scientist should calibrate the model with this cutoff in mind (roughly balanced precision/recall around that boundary), since it directly determines how often Backend's n8n webhook fires.
- **Failure mode to watch for:** `model.pkl` trained on one preprocessing pipeline but `predict.py` written against a different one (e.g. a rescaled feature). Keep training and inference code paths sharing the same preprocessing function, not duplicated.

### Seam 3 — Backend Engineer ↔ Frontend Engineer
**What crosses this seam:** The OpenAPI contract (REST + SSE) and the n8n/Twilio proof-of-automation trail.

- Backend should get `/docs` (OpenAPI/Swagger) live by end of Day 1, even with stub data, so Frontend can generate/hand-write matching TypeScript types early.
- Any change to a Pydantic schema after Day 1 must be broadcast immediately (Slack/standup) — Frontend's `lib/api-client.ts` types break silently otherwise.
- SSE endpoint (`/api/v1/telemetry/stream`) cadence (~2s) should be confirmed against what `RealtimeMetrics.tsx` actually needs — too fast wastes bandwidth on unreliable field connections, too slow feels broken in the live demo.
- **Failure mode to watch for:** CORS misconfiguration blocking the Next.js dev origin — verify this in the first Backend/Frontend joint test, not on Day 3.

### Seam 4 — Everyone ↔ Project Manager
**What crosses this seam:** Verified artifacts, not claims.

- PM does not write code but every number in the final deck traces back to something an engineer actually produced: Data Engineer's latency report, Data Scientist's model metrics, Backend's audit logs, Frontend's working demo.
- PM is the tie-breaker when two roles disagree on a contract (e.g. should `risk_tier` be a string enum or an integer 0/1/2?) — resolve fast and document the decision so it doesn't get re-litigated on Day 3.
- **Failure mode to watch for:** PM builds the Impact Memo narrative around a number "the model should be able to hit" rather than a number it actually hit. Every claim needs a source artifact.

---

## 3. Shared Contracts (Single Source of Truth)

These are the exact shapes every role must agree on. If any role needs to change one, it's a cross-team announcement, not a silent edit.

### 3.1 Kafka Topics
| Topic | Producer | Consumer | Payload |
|---|---|---|---|
| `beneficiary.telemetry` | `kafka_producer_sim.py` (Data Eng) | `kafka_consumer.py` → Postgres Bronze (Data Eng/Backend) | Synthetic beneficiary event (see 3.3) |
| `system.alerts` | Backend (on automation trigger) | Data Eng's alert consumer / dashboard | Risk escalation event |

### 3.2 `POST /api/v1/evaluate`
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
Owned end-to-end by: Data Scientist (scoring logic) → Backend Engineer (route, validation, automation trigger) → Frontend Engineer (Risk Radar display).

### 3.3 Synthetic Beneficiary Record (seed data / Bronze schema)
```json
{
  "beneficiary_id": "BEN-1000",
  "timestamp": "2026-08-01T12:00:00",
  "region": "Kisumu",
  "attendance_rate": 0.42,
  "grade_average": 61.3,
  "socioeconomic_index": 2.4,
  "historical_dropouts_in_family": 1
}
```
**Note:** `travel_distance_km` and `assignment_completion` are required by the `/evaluate` contract (3.2) but not present in the base seed generator shown in the implementation doc — Data Engineer must extend `seed_generator.py` to include them before Data Scientist trains, or the fields need to be computed/defaulted somewhere in the pipeline. Flag and resolve on Day 1.

### 3.4 `GET /api/v1/telemetry/stream` (SSE)
Emits the latest Kafka telemetry payload every ~2s as `data: <json>\n\n`. Owned by Backend Engineer, sourced from Data Engineer's consumer.

### 3.5 `GET /api/v1/demand`
Regional forecast output (Nairobi, Kisumu, Nakuru, Mombasa, Eldoret) — exact shape to be defined jointly by Data Scientist and Backend Engineer on Day 2, then locked for Frontend's `DemandChart.tsx` / `DemandMap.tsx`.

### 3.6 Automation Rule
`IF risk_score > 0.75 THEN trigger_n8n_webhook()` → n8n workflow → Twilio SMS to field worker. This single rule is the thread connecting Data Scientist's calibration, Backend's trigger logic, Data Engineer's `system.alerts` topic, and the PM's automation "proof" for judges.

---

## 4. Day-by-Day Convergence Plan

This is the cross-role version of the individual Day 1/2/3 plans — what must be true across the whole system at the end of each day for the sprint to stay on track.

### End of Day 1 — "Everything runs in isolation"
- [ ] Kafka + Postgres running in Docker; synthetic events flowing into Bronze (Data Eng).
- [ ] `model.pkl` exists with documented feature importances (Data Sci).
- [ ] FastAPI skeleton live with `/docs`, `/api/v1/evaluate` stubbed with the exact final response shape (Backend).
- [ ] Next.js shell live with sidebar nav and three page stubs (Frontend).
- [ ] Architecture signed off by all four engineers; sprint board set up (PM).
- [ ] **Explicit checkpoint:** confirm `travel_distance_km` / `assignment_completion` field gap (Seam 1) is resolved before Day 2 work starts.

### End of Day 2 — "Everything talks to everything"
- [ ] Silver identity graph joins Bronze events to demographics (Data Eng).
- [ ] Real `predict.py` wired into `/api/v1/evaluate`; demand forecast pipeline built (Data Sci).
- [ ] n8n + Twilio live; SSE and `/api/v1/demand` routes working against real data (Backend).
- [ ] Dashboard pulling live data — RealtimeMetrics, DemandChart, DemandMap, Risk Radar all rendering real values, not mocks (Frontend).
- [ ] UAT scripts written; first user walk-through completed and logged (PM).
- [ ] **Explicit checkpoint:** run one full request through the entire system live — field event → Kafka → Postgres → model score → API response → dashboard update → (if HIGH risk) SMS sent. If this chain doesn't work end-to-end by end of Day 2, Day 3 has no slack left to fix it.

### End of Day 3 — "It's a demo, not a pile of parts"
- [ ] Latency report (<500ms target) documented (Data Eng).
- [ ] Model performance sheet finalized (Data Sci).
- [ ] Audit logging shows automation firing correctly (Backend).
- [ ] Offline-sync verified working under real disconnect/reconnect testing (Frontend).
- [ ] Final deck + Impact Memo complete, every number traceable to a produced artifact, presentation rehearsed with a recorded backup demo (PM).
- [ ] `main` branch reflects the final reviewed state of all four feature branches; commits locked.

---

## 5. Branching & Merge Order

To avoid a Day 3 merge pile-up:

1. `feature/data-fabric` merges to `main` first each day (everything else depends on schema/topics existing).
2. `feature/ml-forecasting` merges next (Backend needs `predict.py` importable).
3. `feature/backend-api` merges next (Frontend needs live endpoints, not stubs).
4. `feature/dashboard-ui` merges last each day.
5. `feature/qa-impact-docs` (PM) merges independently at any point — docs-only, low conflict risk.

Each merge to `main` requires 1 peer review. Recommended reviewer pairing: Data Eng ↔ Data Sci review each other (both touch Postgres/features); Backend ↔ Frontend review each other (both touch the API contract).

---

## 6. Cross-Cutting Concerns (No Single Owner)

| Concern | Who's affected | Resolution |
|---|---|---|
| Synthetic data realism vs. bias | Data Eng (generates it), Data Sci (trains on it), PM (must caveat it in the deck) | `seed_generator.py` intentionally skews Kisumu dropout indicators for scenario testing — PM must present this as a deliberate test scenario, not real-world regional bias, in the demo narrative. |
| API contract changes after Day 1 | Backend, Frontend, Data Sci | Any schema change is announced in the team channel immediately; Frontend and Data Sci confirm receipt before Backend merges. |
| Timezone/timestamp consistency | Data Eng, Data Sci, Backend | All timestamps should be ISO 8601 UTC end-to-end; confirm Kafka producer, Postgres columns, and API responses agree. |
| Demo-day failure recovery | Everyone, owned by PM | Record a backup demo video by end of Day 2 in case live Kafka/SSE/Twilio has connectivity issues during judging. |

---

## 7. AI Context Block — Whole-System View

Use this version (instead of a single role's block) when you need an AI assistant to reason about integration issues that span roles — e.g. debugging why the dashboard isn't updating, or checking a schema change's downstream impact.

```
I'm working on "Inuka Sentinel," a 72-hour hackathon project: a predictive
intelligence + automation platform that identifies at-risk program beneficiaries
(education dropout risk) in Kenya and triggers automated SMS outreach to field
workers when risk is high.

FULL ARCHITECTURE:
1. Ingestion: Kafka (Docker/Redpanda), topics `beneficiary.telemetry` and
   `system.alerts`.
2. Storage: PostgreSQL, Bronze (raw events) / Silver (joined identity graph) /
   Gold (aggregates) tiering.
3. Intelligence: FastAPI + XGBoost (scikit-learn), model in
   backend/app/ml/model.pkl, trained with random_state=42.
4. Automation: self-hosted n8n webhooks -> Twilio SMS, triggered when
   risk_score > 0.75.
5. Experience: Next.js 14+ App Router dashboard (Risk Radar, Demand Map,
   real-time telemetry via SSE, offline-first field capture via IndexedDB/idb).

KEY SHARED CONTRACT (POST /api/v1/evaluate):
Request: {beneficiary_id, attendance_rate, assignment_completion,
travel_distance_km, region}
Response: {beneficiary_id, risk_score, risk_tier (LOW/MEDIUM/HIGH), drivers
(string[]), recommended_action, automation_triggered}

KNOWN GAP TO BE AWARE OF: the base synthetic data generator only produces
beneficiary_id, timestamp, region, attendance_rate, grade_average,
socioeconomic_index, historical_dropouts_in_family — it does NOT include
travel_distance_km or assignment_completion, which the /evaluate contract
requires. Any integration work touching this endpoint should check whether
that gap has been resolved (added to the generator/schema) or whether the API
contract was changed to drop those fields.

TEAM STRUCTURE: 5 roles, each on their own branch — feature/data-fabric,
feature/ml-forecasting, feature/backend-api, feature/dashboard-ui,
feature/qa-impact-docs. Merge order into main: data-fabric -> ml-forecasting ->
backend-api -> dashboard-ui, each with 1 peer review.

WHAT I NEED HELP WITH: [describe the integration issue, e.g. "the dashboard's
RealtimeMetrics isn't updating — help me trace whether the break is in the
Kafka consumer, the SSE route, or the frontend hook"]
```
