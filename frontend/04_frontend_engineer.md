# Inuka Foundation Predictive Analytics — Task Breakdown: Frontend Engineer
**Role focus:** UI / UX / Dashboard
**Branch:** `feature/dashboard-ui`
**Owns:** `frontend/` (Next.js App Router, components, offline sync)

---

## 1. Scope of Ownership

You build the dashboard experience: Risk Radar, Demand Map, real-time telemetry, and offline-first field data capture.

```
frontend/src/
├── app/
│   ├── layout.tsx, page.tsx
│   ├── dashboard/
│   │   ├── page.tsx (Overview)
│   │   ├── risk-radar/page.tsx
│   │   └── demand-map/page.tsx
│   └── api/offline-sync/route.ts
├── components/
│   ├── ui/ (Shadcn)
│   ├── charts/DemandChart.tsx
│   ├── maps/DemandMap.tsx
│   └── RealtimeMetrics.tsx
├── lib/ (db-offline.ts, api-client.ts)
└── hooks/useOfflineSync.ts
```

---

## 2. Day-by-Day Task Breakdown

### Day 1 — Foundation
**Deliverable:** Next.js App Router shell with Tailwind CSS and Shadcn UI navigation sidebar.

- [ ] Scaffold Next.js 14+ App Router project, configure `tailwind.config.js`, install Shadcn UI.
- [ ] Build the navigation sidebar/shell (`app/layout.tsx`) with routes for Overview, Risk Radar, Demand Map.
- [ ] Scaffold `dashboard/page.tsx`, `dashboard/risk-radar/page.tsx`, `dashboard/demand-map/page.tsx` as server components with placeholder content.
- [ ] Set up `lib/api-client.ts` — typed fetch wrapper for the FastAPI backend (base URL from `NEXT_PUBLIC_API_URL`).
- [ ] Confirm with Backend Engineer what the OpenAPI schema looks like so your TypeScript types can mirror the Pydantic models.
- [ ] Install mapping (MapLibre GL or Leaflet) and charting (Recharts) dependencies.

### Day 2 — Integration
**Deliverable:** Functional dynamic dashboard populated with Recharts and MapLibre GL heatmaps.

- [ ] Build `RealtimeMetrics.tsx` as a client component (`"use client"`) consuming the SSE hook.
- [ ] Implement `useTelemetryStream` hook (per the integration contract) connecting to `/api/v1/telemetry/stream`.
- [ ] Build `DemandChart.tsx` (Recharts) wired to `/api/v1/demand`.
- [ ] Build `DemandMap.tsx` (MapLibre GL / Leaflet) rendering regional heatmaps — Nairobi, Kisumu, Nakuru, Mombasa, Eldoret.
- [ ] Build Risk Radar view calling `/api/v1/evaluate` (or a batch-list variant) and rendering risk tiers (LOW/MEDIUM/HIGH) with the `drivers` explanation shown per beneficiary.
- [ ] Keep interactive charts/maps as client components; leave the page shells as server components for fast initial load.
- [ ] Sync with Backend Engineer as soon as real endpoints replace stubs — swap mock data for live fetches.

### Day 3 — Testing & Polish
**Deliverable:** Offline-sync capabilities using IndexedDB with queue replay mechanism.

- [ ] Implement `lib/db-offline.ts` using `idb` for local field-data caching.
- [ ] Implement `hooks/useOfflineSync.ts` — queues writes when offline, replays them against `app/api/offline-sync/route.ts` on reconnect.
- [ ] Register `public/sw.js` service worker for offline shell caching.
- [ ] Test disconnect/reconnect scenarios manually: go offline, submit field data, go back online, confirm the queue drains and syncs correctly with no duplicate submissions.
- [ ] Final visual polish pass — loading states, empty states, error states for all three dashboard pages.
- [ ] Support the Project Manager's UAT walk-throughs; fix UI issues surfaced during dry runs.

---

## 3. Coding & Commit Conventions

- Commit format: `fix(frontend): <message>` / `feat(frontend): <message>`
- Server components for initial page loads; `"use client"` only where interactivity/state is required (charts, maps, SSE, forms).
- Offline persistence via `idb`, never raw `localStorage`/`sessionStorage` for structured field data.
- Keep API types in sync with the backend's Pydantic schemas — regenerate/update `lib/api-client.ts` types whenever Backend Engineer changes a contract.

---

## 4. Cross-Role Dependencies

| You need from | What |
|---|---|
| Backend Engineer | Stable API contract (OpenAPI docs), SSE endpoint, `/api/v1/demand` shape |
| Data Scientist | What `drivers` and `recommended_action` values look like, to design the Risk Radar UI around them |
| Data Engineer | Gold-layer aggregation granularity for map/chart data |

| They need from you | What |
|---|---|
| Project Manager | Working demo for UAT walk-throughs and the final presentation |

---

## 5. AI Context Block

```
I'm the Frontend Engineer on a 72-hour hackathon project called "Inuka Risk Radar" —
a predictive intelligence dashboard for at-risk program beneficiaries in Kenya,
with real-time telemetry, a demand-forecast map, and offline-first field data entry.

STACK: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn UI, Recharts,
MapLibre GL / Leaflet, idb (IndexedDB wrapper) for offline persistence.

MY SCOPE:
- frontend/src/app/dashboard/ — Overview, Risk Radar, Demand Map pages
- frontend/src/components/charts/DemandChart.tsx
- frontend/src/components/maps/DemandMap.tsx
- frontend/src/components/RealtimeMetrics.tsx
- frontend/src/lib/db-offline.ts, api-client.ts
- frontend/src/hooks/useOfflineSync.ts

BACKEND CONTRACT I consume (FastAPI, base URL via NEXT_PUBLIC_API_URL):
- GET /api/v1/telemetry/stream — Server-Sent Events, ~2s cadence
- POST /api/v1/evaluate — returns {beneficiary_id, risk_score, risk_tier
  (LOW/MEDIUM/HIGH), drivers (string[]), recommended_action,
  automation_triggered}
- GET /api/v1/demand — regional demand forecast for Nairobi/Kisumu/Nakuru/
  Mombasa/Eldoret

PATTERN for SSE hook:
"use client";
useEffect(() => {
  const es = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/telemetry/stream`);
  es.onmessage = (e) => setData(JSON.parse(e.data));
  es.onerror = () => es.close();
  return () => es.close();
}, []);

CONSTRAINTS:
- Server components for page shells; "use client" only for interactive/stateful
  pieces (charts, maps, SSE, forms).
- Offline data goes through idb — never localStorage/sessionStorage.
- Commit format: feat(frontend): <message>

CURRENT TASK: [paste today's specific task from the breakdown here]
```
