#!/usr/bin/env bash
# Bring up Inuka Risk Radar for a live demo:
#   Redpanda + Postgres + FastAPI + Bronze consumer + n8n + Next.js frontend
# then seed demographics, train model (if missing), and publish a telemetry batch.
#
# Usage:
#   ./scripts/demo_up.sh              # full bring-up + seed + train + sample produce
#   ./scripts/demo_up.sh --no-train   # skip model training (stub scoring OK)
#   ./scripts/demo_up.sh --no-seed    # skip seed / demographics / produce
#   ./scripts/demo_up.sh --produce    # only publish another telemetry batch
#   ./scripts/demo_up.sh --down       # stop and remove containers
#   ./scripts/demo_up.sh --logs       # follow backend + consumer logs
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose)
SYNC_DSN="postgresql://inuka:inuka@postgres:5432/inuka_risk_radar"
KAFKA_INTERNAL="redpanda:9092"
MODEL_PATH="$ROOT/backend/app/ml/model.pkl"
SEED_JSON="$ROOT/data-pipeline/data/synthetic_beneficiaries.json"

DO_SEED=1
DO_TRAIN=1
MODE="up"

usage() {
  sed -n '2,16p' "$0" | sed 's/^# \?//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-seed) DO_SEED=0 ;;
    --no-train) DO_TRAIN=0 ;;
    --produce) MODE="produce" ;;
    --down) MODE="down" ;;
    --logs) MODE="logs" ;;
    -h|--help) usage 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage 1
      ;;
  esac
  shift
done

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing dependency: $1" >&2
    exit 1
  }
}

wait_http() {
  local url="$1" name="$2" attempts="${3:-60}"
  echo "Waiting for $name ($url)…"
  for ((i = 1; i <= attempts; i++)); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "  $name is up."
      return 0
    fi
    sleep 2
  done
  echo "Timed out waiting for $name" >&2
  return 1
}

wait_compose_healthy() {
  local service="$1" attempts="${2:-60}"
  echo "Waiting for compose service '$service' to be healthy…"
  for ((i = 1; i <= attempts; i++)); do
    local status
    status="$("${COMPOSE[@]}" ps --format json "$service" 2>/dev/null | python3 -c '
import json, sys
raw = sys.stdin.read().strip()
if not raw:
    raise SystemExit(1)
# docker compose may emit one JSON object per line or a list
items = []
if raw.startswith("["):
    items = json.loads(raw)
else:
    for line in raw.splitlines():
        line = line.strip()
        if line:
            items.append(json.loads(line))
if not items:
    raise SystemExit(1)
print(items[0].get("Health") or items[0].get("State") or "")
' 2>/dev/null || true)"
    if [[ "$status" == "healthy" ]]; then
      echo "  $service is healthy."
      return 0
    fi
    sleep 2
  done
  echo "Timed out waiting for $service (last status: ${status:-unknown})" >&2
  "${COMPOSE[@]}" ps "$service" || true
  return 1
}

exec_backend() {
  "${COMPOSE[@]}" exec -T backend "$@"
}

produce_batch() {
  local count="${1:-50}"
  local rate="${2:-10}"
  echo "Publishing $count telemetry events @ ~${rate}/s…"
  exec_backend python /workspace/data-pipeline/scripts/kafka_producer_sim.py \
    --bootstrap "$KAFKA_INTERNAL" \
    --count "$count" \
    --rate "$rate"
  echo "Giving Bronze consumer a few seconds to land…"
  sleep 5
}

print_summary() {
  cat <<EOF

════════════════════════════════════════════════════════════
  Inuka Risk Radar — demo stack is ready
════════════════════════════════════════════════════════════
  API docs:     http://localhost:8000/docs
  Health:       http://localhost:8000/health
  SSE stream:   http://localhost:8000/api/v1/telemetry/stream
  n8n UI:       http://localhost:5678
  Kafka (host): localhost:19092
  Postgres:     localhost:5433  (inuka / inuka / inuka_risk_radar)

  Frontend:      http://localhost:3000

  Frontend container uses internal backend URL: http://backend:8000

  Frontend dev override (optional):
    cd frontend && npm install
    NEXT_PUBLIC_API_URL=http://localhost:8000 NEXT_PUBLIC_USE_MOCK=false npm run dev

  n8n automation (optional SMS):
    1. Open http://localhost:5678 and create owner account (first run)
    2. Import workflow: backend/n8n/workflows/risk_alert_workflow.json
       (also mounted at /workflows inside the n8n container)
    3. Add Twilio Basic Auth credential (Account SID / Auth Token)
    4. Set env in .env (TWILIO_* + FIELD_WORKER_PHONE_NUMBER) and
       docker compose up -d n8n
    5. Activate the workflow so POST /webhook/inuka-risk-alert is live

  Re-publish telemetry:  ./scripts/demo_up.sh --produce
  Follow logs:           ./scripts/demo_up.sh --logs
  Tear down:             ./scripts/demo_up.sh --down
════════════════════════════════════════════════════════════
EOF
}

case "$MODE" in
  down)
    need docker
    echo "Stopping demo stack…"
    "${COMPOSE[@]}" down
    exit 0
    ;;
  logs)
    need docker
    "${COMPOSE[@]}" logs -f backend bronze-consumer n8n
    exit 0
    ;;
  produce)
    need docker
    produce_batch 50 10
    echo "Done."
    exit 0
    ;;
esac

need docker
need curl
need python3

if [[ -f "$ROOT/.env.example" && ! -f "$ROOT/.env" ]]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "Created .env from .env.example (Twilio fields optional)."
fi

echo "Building / starting Redpanda, Postgres, backend, bronze-consumer, n8n, frontend…"
"${COMPOSE[@]}" up -d --build redpanda redpanda-init postgres backend bronze-consumer n8n frontend

wait_compose_healthy postgres
wait_compose_healthy redpanda
wait_http "http://localhost:8000/health" "backend"
wait_http "http://localhost:3000" "frontend"

if [[ "$DO_SEED" -eq 1 ]]; then
  echo "Generating synthetic seed…"
  exec_backend python /workspace/data-pipeline/scripts/seed_generator.py

  echo "Loading Silver demographics…"
  exec_backend python /workspace/data-pipeline/scripts/load_demographics.py --dsn "$SYNC_DSN"

  produce_batch 50 10

  echo "Layer checks:"
  docker exec inuka-postgres psql -U inuka -d inuka_risk_radar -c \
    "SELECT count(*) AS bronze_events FROM bronze.telemetry_events;"
  docker exec inuka-postgres psql -U inuka -d inuka_risk_radar -c \
    "SELECT count(*) AS demographics FROM silver.beneficiary_demographics;"
fi

if [[ "$DO_TRAIN" -eq 1 ]]; then
  if [[ -f "$MODEL_PATH" ]]; then
    echo "model.pkl already present — skipping train (delete it to retrain)."
  else
    if [[ ! -f "$SEED_JSON" ]]; then
      echo "Seed JSON missing at $SEED_JSON — generating before train…"
      exec_backend python /workspace/data-pipeline/scripts/seed_generator.py
    fi
    echo "Training model → backend/app/ml/model.pkl …"
    exec_backend python -m app.ml.train
  fi
fi

# Smoke: pick one beneficiary from demographics and hit /evaluate
BEN_ID="$(docker exec inuka-postgres psql -U inuka -d inuka_risk_radar -Atc \
  "SELECT beneficiary_id FROM silver.beneficiary_demographics LIMIT 1;" || true)"
if [[ -n "${BEN_ID:-}" ]]; then
  echo "Smoke POST /api/v1/evaluate for $BEN_ID …"
  curl -sf "http://localhost:8000/api/v1/evaluate" \
    -H "Content-Type: application/json" \
    -d "{\"beneficiary_id\":\"$BEN_ID\",\"attendance_rate\":0.42,\"assignment_completion\":0.35,\"travel_distance_km\":22.0,\"region\":\"Kisumu\"}" \
    | python3 -m json.tool || echo "(evaluate smoke failed — check Identity Graph / logs)"
else
  echo "No demographics rows yet — skip evaluate smoke."
fi

print_summary
