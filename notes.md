 You already have most of the pieces; integration is about wiring a shared runtime and closing a few contract gaps — not rebuilding the stack.

  What you have vs what still needs wiring


```
  ┌───────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────┐
  │ Layer                                         │ Status                                                          │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Redpanda + Postgres (docker-compose.yml)      │ Ready                                                           │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Seed → Kafka → Bronze → Silver/Gold           │ Scripts + SQL ready; consumer must stay running                 │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ FastAPI /evaluate, /demand, /telemetry/stream │ Wired with stubs/fallbacks                                      │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ ML predict.py / train.py                      │ Code present; model.pkl missing → stub scoring                  │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Frontend                                      │ Built against mocks by default (NEXT_PUBLIC_USE_MOCK ≠ "false") │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ n8n workflow JSON                             │ Present; not in compose yet                                     │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ App Dockerfiles                               │ None — only infra is containerized                              │
  └───────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────┘

  ────────────────────────────────────────
```
  What you need first (before coding more)

  1. One shared env contract

     Host ports: Kafka localhost:19092, Postgres localhost:5433. Backend defaults already match. Align frontend NEXT_PUBLIC_API_URL=http://localhost:8000.

  2. Data fabric up and populated

     Without Bronze + demographics, /evaluate 404s (Identity Graph) and SSE is empty.

  3. Lock the live path to three APIs

     Frontend currently expects many routes (/beneficiaries, /alerts, /risk/...) that backend does not expose. For the demo, drive the UI off:
    • POST /api/v1/evaluate
    • GET /api/v1/demand
    • GET /api/v1/telemetry/stream

     Keep mocks for everything else, or add thin Gold-backed endpoints later.

  4. Train once

     python backend/app/ml/train.py so model.pkl exists; until then evaluate works but model_status: "stub".

  5. Decide process topology

     Minimum live demo processes:
    • docker compose (Redpanda + Postgres)
    • Bronze consumer (run_bronze_consumer.py or backend consumer)
    • Kafka producer (for live stream)
    • FastAPI
    • Next.js
    • Optional: n8n (+ Twilio creds)

  ────────────────────────────────────────

  Implementation plan

  Phase 0 — Bring up fabric (30–45 min)

```
  docker compose up -d redpanda redpanda-init postgres
  # wait for healthy
  python data-pipeline/scripts/seed_generator.py
  python data-pipeline/scripts/load_demographics.py
  python data-pipeline/scripts/run_bronze_consumer.py   # leave running
  # other terminal:
  python data-pipeline/scripts/kafka_producer_sim.py --count 50 --rate 5
```

  Verify Bronze/Silver/Gold row counts in Postgres.

  Phase 1 — Backend ↔ data/ML

  1. Start API: cd backend && uvicorn main:app --reload
  2. Hit /health and /docs
  3. Train model → retest /evaluate with a real beneficiary_id from Silver
  4. Confirm HIGH risk fires Kafka system.alerts (and n8n if up)
  5. Confirm SSE shows new Bronze events while the producer runs

  Phase 2 — Frontend ↔ API

  1. Set NEXT_PUBLIC_USE_MOCK=false and NEXT_PUBLIC_API_URL=http://localhost:8000
  2. Wire Risk Radar → evaluateRisk, Demand Map → getDemandForecast, live panel → EventSource on /api/v1/telemetry/stream
  3. Leave non-existent list/KPI endpoints on mocks until you add Gold-backed routes

  Phase 3 — Automation

  1. Add n8n to compose (or run separately on :5678)
  2. Import backend/n8n/workflows/risk_alert_workflow.json
  3. Point Twilio (or a mock HTTP sink for demo safety)
  4. End-to-end: produce high-risk event → evaluate → SMS/webhook + alert in Kafka

  Phase 4 — Hardening for demo

  • One script (scripts/demo_up.sh) that starts fabric + consumer + API + notes for frontend
  • Backup screen recording if Twilio/SSE flakes
  • Merge order: data-fabric → ml → backend → frontend

  ────────────────────────────────────────

  Containerization notes

  Today: compose only runs Redpanda + Postgres (plus topic init). Apps run on the host. That is fine for the hackathon.

  Recommended next step (not Day-1 blocking):

  ┌───────────────────┬──────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Service           │ Image / build            │ Notes                                                                                                           │
  ├───────────────────┼──────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ redpanda,         │ Already in compose       │ Keep host ports 19092 / 5433                                                                                    │
  │ postgres          │                          │                                                                                                                 │
  ├───────────────────┼──────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ backend           │ Dockerfile from backend/ │ Env: DATABASE_URL=...@postgres:5432, KAFKA_BOOTSTRAP=redpanda:9092 (internal listeners, not localhost)          │
  ├───────────────────┼──────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ bronze-consumer   │ Same image, different    │ Or a long-lived task in the backend image                                                                       │
  │                   │ CMD                      │                                                                                                                 │
  ├───────────────────┼──────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ frontend          │ Multi-stage Next build   │ NEXT_PUBLIC_API_URL must be the URL the browser can reach (often http://localhost:8000, not                     │
  │                   │                          │ http://backend:8000)                                                                                            │
  ├───────────────────┼──────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ n8n               │ Official n8nio/n8n       │ Mount workflow or import once; secrets via env                                                                  │
  └───────────────────┴──────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  Gotchas specific to this repo:
  • Host vs in-compose addresses: host scripts use localhost:19092 / :5433; containers must use redpanda:9092 / postgres:5432.
  • README still says docker compose up -d kafka postgres — service name is redpanda, not kafka.
  • SQL init runs only on first Postgres volume. Schema changes need docker exec … psql < file or volume wipe.
  • No Dockerfiles yet — don’t block integration on full containerization; containerize after the live path works on the host.
  • Don’t put model.pkl generation inside image build unless you bake a train step or mount the artifact.

  Pragmatic compose target for demo day: keep Redpanda/Postgres (+ optional n8n) in Docker; run API, consumer, producer, and Next locally. Full multi-service
  compose is polish, not the critical path.

  ────────────────────────────────────────

  Issues you’re likely to hit

  1. 404 on /evaluate — beneficiary not in Identity Graph (demographics not loaded, or telemetry never landed for that ID).
  2. Empty SSE — consumer not running, or producer not publishing; SSE reads Bronze, not Kafka directly.
  3. Stub scores forever — missing model.pkl; looks “integrated” but isn’t ML.
  4. Frontend still mocked — USE_MOCK defaults on; live API never called.
  5. API surface mismatch — dashboard calls routes that don’t exist → 404s when mocks are off.
  6. CORS — wrong origin or credentials; fix early with Next on :3000.
  7. Port conflicts — local Postgres on 5432 (hence 5433); another Kafka on 9092.
  8. Stale Postgres volume — new SQL files don’t apply until re-init.
  9. n8n/Twilio — webhook URL wrong, workflow inactive, or SMS fails; treat as best-effort (backend already doesn’t fail the request).
  10. Train/serve skew — model trained on flat JSON that drifts from Silver; prefer training from the same fields Silver exposes.
  11. Two consumers, same group — duplicate writers or “stolen” partitions if both run_bronze_consumer.py and a second consumer share KAFKA_GROUP_ID.
  12. Timestamp/timezone — mix of Z / naive ISO breaks ordering or joins.
  13. Demand fallback vs forecast — without seed JSON / forecast path, you get gold_fallback (fine for demo; label it honestly).

  ────────────────────────────────────────

  Critical Day-2 checkpoint

  One live chain:

  producer → Kafka → Bronze → Silver/Gold → /evaluate (real model) → dashboard → (if HIGH) n8n + system.alerts

  If that chain doesn’t work once, don’t add features — fix the seam that’s broken.

  I can turn this into a concrete demo_up.sh + minimal compose additions (backend + n8n) next if you want.
