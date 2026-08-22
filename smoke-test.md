# Inuka Risk Radar Smoke Test Checklist

Use this after:

```bash
docker compose up -d --build backend frontend
```

Optional log tails:

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

---

## 1. Infrastructure sanity

### Check containers
```bash
docker compose ps
```

You want at least:
- `backend` up
- `frontend` up
- `postgres` up
- `redpanda` up
- `bronze-consumer` up

### Backend health
Open:

- `http://localhost:8000/health`

Expected:

```json
{"status":"ok"}
```

### Swagger/OpenAPI
Open:

- `http://localhost:8000/docs`

Expected:
- page loads
- routes visible
- no 500 on load

---

## 2. Demand endpoints

### `GET /api/v1/demand`
In Swagger or curl test:

#### National
```bash
curl "http://localhost:8000/api/v1/demand?region=National&days=7"
```

Expected shape:
- `region`
- `historical` array
- `predicted` array
- `confidence` array
- `dates` array
- `summary`

#### Nairobi
```bash
curl "http://localhost:8000/api/v1/demand?region=Nairobi&days=7"
```

Check:
- `historical.length > 0`
- `predicted.length == 7`
- `dates.length == historical.length + predicted.length`

### `GET /api/v1/demand/breakdown`
```bash
curl "http://localhost:8000/api/v1/demand/breakdown?days=7"
```

Expected:
- array of regions
- each item has:
  - `region`
  - `predicted_demand`
  - `historical_trend`
  - `risk_factor`
  - `dates`
  - `summary`

---

## 3. Risk endpoints

### `GET /api/v1/risk/distribution`
```bash
curl "http://localhost:8000/api/v1/risk/distribution"
```

Expected:
- `low`
- `medium`
- `high`
- `critical`
- `total`

Check:
- numbers are integers
- `total >= low + medium + high`

### `GET /api/v1/risk/trend`
```bash
curl "http://localhost:8000/api/v1/risk/trend?period=7d"
```

Also test:
```bash
curl "http://localhost:8000/api/v1/risk/trend?period=24h"
curl "http://localhost:8000/api/v1/risk/trend?period=30d"
```

Expected:
- array response
- each item has:
  - `date`
  - `overall`
  - `highRisk`
  - `critical`
  - `low`
  - `medium`

Check:
- 7 items for `7d`
- 1 item for `24h`
- 30 items for `30d`

---

## 4. Beneficiary endpoints

### `GET /api/v1/beneficiaries`
```bash
curl "http://localhost:8000/api/v1/beneficiaries?page=1&pageSize=10"
```

Expected:
- `items`
- `total`
- `page`
- `pageSize`
- `totalPages`

Check one item includes:
- `id`
- `code`
- `name`
- `region`
- `riskScore`
- `riskTier`
- `riskDrivers`
- `coordinates`

### Filtering
```bash
curl "http://localhost:8000/api/v1/beneficiaries?riskTier=high&page=1&pageSize=20"
curl "http://localhost:8000/api/v1/beneficiaries?region=Kisumu&page=1&pageSize=20"
curl "http://localhost:8000/api/v1/beneficiaries?search=BEN&page=1&pageSize=20"
```

Expected:
- no 500
- filtered results

### Single beneficiary
Take one `code`/`beneficiary_id` from the list and test:

```bash
curl "http://localhost:8000/api/v1/beneficiaries/BEN-1000"
```

Expected:
- full beneficiary object
- no 404 if ID exists

If you use a fake one:

```bash
curl "http://localhost:8000/api/v1/beneficiaries/DOES-NOT-EXIST"
```

Expected:
- 404

---

## 5. KPI / map / system / workers endpoints

### `GET /api/v1/metrics/kpi`
```bash
curl "http://localhost:8000/api/v1/metrics/kpi"
```

Expected:
- array
- around 4 KPI cards
- each item has:
  - `label`
  - `value`
  - `change`
  - `description`
  - `icon`

### `GET /api/v1/map/regions`
```bash
curl "http://localhost:8000/api/v1/map/regions"
```

Expected:
- array of regions
- each item has:
  - `name`
  - `code`
  - `coordinates`
  - `beneficiaries`
  - `highRisk`
  - `riskScore`

### `GET /api/v1/system/status`
```bash
curl "http://localhost:8000/api/v1/system/status"
```

Expected:
- `isOnline`
- `lastSync`
- `syncStatus`
- `devicesOnline`
- `devicesTotal`
- `ingestionRate`
- `apiLatency`

### `GET /api/v1/field-workers`
```bash
curl "http://localhost:8000/api/v1/field-workers"
```

Expected:
- array
- each item has:
  - `id`
  - `code`
  - `name`
  - `region`
  - `phoneNumber`
  - `assignedBeneficiaries`
  - `lastSync`
  - `isOnline`

---

## 6. Core evaluate endpoint

### `POST /api/v1/evaluate`
Use Swagger or curl:

```bash
curl -X POST "http://localhost:8000/api/v1/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiary_id":"BEN-1000",
    "attendance_rate":0.25,
    "assignment_completion":0.20,
    "travel_distance_km":25,
    "region":"Kisumu"
  }'
```

Expected:
- `beneficiary_id`
- `risk_score`
- `risk_tier`
- `drivers`
- `recommended_action`
- `automation_triggered`

Check:
- high-risk payload returns `automation_triggered: true`

---

## 7. Telemetry endpoint

### SSE stream
Open in browser or use curl:

```bash
curl "http://localhost:8000/api/v1/telemetry/stream"
```

Expected:
- repeated SSE messages
- heartbeat events
- telemetry events if data exists

If quiet, re-publish telemetry using your existing flow.

---

## 8. Frontend page checks

Open:

- `http://localhost:3000`

Then verify page by page.

### Dashboard page
Expected:
- no crash
- KPI cards visible
- demand chart visible
- risk distribution visible
- beneficiary table visible

If broken:
- check backend logs for `/metrics/kpi`, `/demand`, `/risk/distribution`, `/beneficiaries`

### Risk page
Open the risk route in the app.

Expected:
- risk distribution chart loads
- beneficiary table loads
- no “This page couldn’t load”

### Forecasts page
Expected:
- national forecast chart renders
- Nairobi/Kisumu forecast charts render
- no `.length` error anymore

### Map page
Expected:
- regional cards render
- field worker list renders
- active worker count displays

### Beneficiaries page
Expected:
- table renders
- search/filter works
- no server error

---

## 9. What to watch in logs

### Backend
Look for:
- 404s on routes you expect to exist
- Pydantic response validation errors
- SQL errors
- missing table/view errors

Command:
```bash
docker compose logs -f backend
```

### Frontend
Look for:
- `fetch failed`
- `Cannot read properties of undefined`
- hydration/runtime render errors

Command:
```bash
docker compose logs -f frontend
```

---

## 10. Quick pass/fail matrix

### Backend routes
- [ ] `/health`
- [ ] `/docs`
- [ ] `/api/v1/demand`
- [ ] `/api/v1/demand/breakdown`
- [ ] `/api/v1/risk/distribution`
- [ ] `/api/v1/risk/trend`
- [ ] `/api/v1/beneficiaries`
- [ ] `/api/v1/beneficiaries/{id}`
- [ ] `/api/v1/metrics/kpi`
- [ ] `/api/v1/map/regions`
- [ ] `/api/v1/system/status`
- [ ] `/api/v1/field-workers`
- [ ] `/api/v1/evaluate`
- [ ] `/api/v1/telemetry/stream`

### Frontend pages
- [ ] Dashboard
- [ ] Risk
- [ ] Forecasts
- [ ] Map
- [ ] Beneficiaries

---

## 11. Most likely remaining failure modes

If something still breaks, it’ll probably be one of these:

1. **response shape mismatch**
   - backend field name differs from frontend expectation

2. **beneficiary ID mismatch**
   - frontend requests `BEN-...` but backend seeded data differs

3. **empty DB-derived data**
   - views populated but no telemetry/demographics loaded yet

4. **unbuilt frontend image**
   - stale container still serving old code

If in doubt, rebuild:

```bash
docker compose up -d --build backend frontend
```
