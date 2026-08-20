# Inuka Foundation Predictive Analytics — Task Breakdown: Project Manager
**Role focus:** QA / Impact Documentation / Presentation
**Branch:** `feature/qa-impact-docs`
**Owns:** Architecture sign-off, Quantified Impact Memo, UAT process, final presentation deck

---

## 1. Scope of Ownership

You're the glue: you keep the four engineering roles aligned on contracts and timeline, translate technical output into a compelling case for judges, and own the final deck and impact narrative.

---

## 2. Day-by-Day Task Breakdown

### Day 1 — Foundation
**Deliverable:** Signed-off architecture specification and baseline Quantified Impact Memo draft.

- [ ] Review the full architecture (Ingestion → Storage → Intelligence → Automation → Experience) with all four engineers; confirm everyone agrees on the API contracts (`/api/v1/evaluate` request/response shape especially).
- [ ] Set up the sprint board (branches: `feature/data-fabric`, `feature/ml-forecasting`, `feature/backend-api`, `feature/dashboard-ui`) with Day 1/2/3 deliverables as tracked cards.
- [ ] Confirm operational metrics formulas for the Impact Memo — e.g. how "risk score" translates to a real-world outcome (dropout prevention rate, cost per intervention, time-to-outreach).
- [ ] Draft the baseline Quantified Impact Memo: problem statement, target population, theory of change, and placeholder metrics to be filled in once the model (Day 1 Data Scientist deliverable) produces feature importances.
- [ ] Set commit-message and branching conventions expectations with the team (format: `<type>(<scope>): <message>`, `main` requires 1 peer review).

### Day 2 — Integration
**Deliverable:** UAT execution scripts and user testing feedback logs.

- [ ] Write UAT scripts: concrete user journeys through the dashboard (e.g. "field coordinator checks Risk Radar, sees a HIGH-risk beneficiary, confirms SMS escalation fired").
- [ ] Facilitate system walk-throughs with mock users (teammates or outside testers) once Frontend's dashboard is wired to live data.
- [ ] Log feedback and file it back to the relevant engineer (bug → Backend/Frontend, unclear risk driver → Data Scientist, missing region → Data Engineer).
- [ ] Update the Impact Memo with real numbers now available: model correlation findings (Data Scientist), latency figures (Data Engineer, if ready early), automation trigger examples (Backend Engineer).
- [ ] Start drafting the presentation deck outline — problem, architecture, live demo flow, impact numbers, roadmap.

### Day 3 — Testing & Polish
**Deliverable:** Final 10-Minute Presentation Deck and completed Quantified Impact Memo.

- [ ] Collect final artifacts from each role: model performance sheet (Data Scientist), latency validation report (Data Engineer), audit logs (Backend Engineer), working offline-sync demo (Frontend Engineer).
- [ ] Finalize the Quantified Impact Memo with real metrics throughout (no placeholders).
- [ ] Build and rehearse the 10-minute presentation deck: problem → architecture → live demo → impact → what's next.
- [ ] Run timed dry-runs of the presentation at least twice; tighten the live-demo segment so it can't fail silently (have a recorded backup demo video as a fallback).
- [ ] Lock all code commits ahead of the deadline; confirm `main` reflects the final, reviewed state of all four feature branches.
- [ ] Do a final pass checking every claim in the deck is backed by an artifact produced by the team (no unverified numbers).

---

## 3. Coordination Conventions

- Commit format for your own docs: `docs(pm): <message>` e.g. `docs(pm): update Quantified Impact Memo formulas`
- You are the tie-breaker on contract disagreements between roles (e.g. API schema disputes) — resolve fast, document the decision, communicate to all four engineers.
- Track deliverables against the Day 1/2/3 targets in the implementation doc; flag slippage early rather than at the Day 3 crunch.

---

## 4. Cross-Role Dependencies

You depend on artifacts from all four other roles by Day 3:

| From | Artifact for the deck/memo |
|---|---|
| Data Engineer | Kafka-to-dashboard latency report |
| Data Scientist | Model performance sheet (Precision/Recall/ROC-AUC), correlation findings |
| Backend Engineer | Audit logs proving automation actually fired |
| Frontend Engineer | Working, demo-ready dashboard with offline sync |

---

## 5. AI Context Block

```
I'm the Project Manager on a 72-hour hackathon project called "Inuka Sentinel" —
a predictive intelligence + automation platform that identifies at-risk program
beneficiaries (education dropout risk) in Kenya and triggers automated field-worker
outreach via SMS. I need help with the Quantified Impact Memo, UAT scripts, and the
final presentation deck — not with writing code.

PROJECT ARCHITECTURE: Kafka/Postgres ingestion → Bronze/Silver/Gold storage →
FastAPI + XGBoost intelligence layer → n8n/Twilio automation → Next.js dashboard
(Risk Radar, Demand Map, offline-first field capture).

KEY METRIC THE SYSTEM PRODUCES: a risk_score (0-1) per beneficiary, tiered
LOW/MEDIUM/HIGH, with human-readable "drivers" (e.g. "Low Attendance", "High
Travel Distance") and a recommended_action. risk_score > 0.75 auto-triggers an
SMS escalation to a field worker via n8n + Twilio.

WHAT I NEED HELP WITH TODAY: [e.g. "help me turn these model metrics into a
one-paragraph impact statement for judges" / "draft a UAT script for the Risk
Radar page" / "tighten this 10-minute deck outline"]

INPUTS I HAVE (paste as available):
- Data Scientist's model metrics / correlation findings: [paste]
- Data Engineer's latency report: [paste]
- Backend Engineer's audit log examples: [paste]
- Frontend Engineer's demo notes/screenshots description: [paste]

CONSTRAINTS:
- Every claim in the deck must be backed by an artifact the team actually
  produced — no invented numbers.
- Data used throughout the project is synthetic, not real beneficiary data —
  be accurate about this in the memo/deck framing.
- Commit format for docs: docs(pm): <message>
```
