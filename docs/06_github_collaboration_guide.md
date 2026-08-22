# Inuka Risk Radar — GitHub Collaboration Guide
**Purpose:** Practical rules for the 5-person team to avoid merge conflicts during the 72-hour sprint. This is not general Git theory — it's specific to this repo's file ownership boundaries and the shared files everyone touches.

---

## 1. Why This Matters More Than Usual

In a normal sprint, conflicts cost you an hour. In a 72-hour hackathon, a bad merge conflict on Day 3 can cost you the demo. The goal here isn't "never have a conflict" — it's "never have a conflict on a file that matters at 11pm on Day 3."

Two kinds of files in this repo:
- **Owned files** — one role touches them almost exclusively (e.g. `backend/app/ml/predict.py` = Data Scientist). Conflicts here are rare and easy.
- **Shared files** — multiple roles touch the same file (e.g. `docker-compose.yml`, Pydantic schemas, `package.json`). Conflicts here are common and dangerous. This guide is mostly about those.

---

## 2. Branch Strategy

```
main                          (locked, 1 review required to merge)
├── feature/data-fabric       (Data Engineer)
├── feature/ml-forecasting    (Data Scientist)
├── feature/backend-api       (Backend Engineer)
├── feature/dashboard-ui      (Frontend Engineer)
└── feature/qa-impact-docs    (Project Manager)
```

- **Never commit directly to `main`.** All work happens on your feature branch.
- **Never commit directly to someone else's feature branch** without asking them first — even a "quick fix." Open a PR against their branch instead, or flag it in chat and let them pull it in.
- Keep your feature branch **short-lived in spirit** even though it lives the whole sprint — merge to `main` at the end of each day (see [Section 6](#6-merge-cadence-not-just-merge-order)), don't let 3 days of work pile into one Day 3 merge.

---

## 3. File Ownership Map

This is the single most effective conflict-avoidance tool: **know who owns what before you touch it.**

| Path | Primary Owner | Others who read it |
|---|---|---|
| `data-pipeline/`, `backend/app/services/kafka_consumer.py` | Data Engineer | Backend (imports it) |
| `backend/app/ml/` (`train.py`, `predict.py`, `model.pkl`) | Data Scientist | Backend (imports `predict.py`) |
| `backend/app/api/`, `backend/app/core/`, `backend/app/models/`, `backend/app/services/n8n_trigger.py` | Backend Engineer | Frontend (consumes the API) |
| `frontend/src/` | Frontend Engineer | — |
| Docs / Impact Memo / deck | Project Manager | Everyone (source of truth for numbers) |

**Rule of thumb:** if a file's path starts with another role's owned directory, you don't edit it — you ask them to, or you open a PR against *their* branch and let them merge it. This alone eliminates most conflicts.

---

## 4. Shared Files — The Real Danger Zone

These are the files where two or more roles legitimately need to make changes, often on the same day. Handle them explicitly.

### 4.1 `docker-compose.yml`
**Touched by:** Data Engineer (Kafka, Postgres services), Backend Engineer (backend service, env vars), occasionally Frontend Engineer (frontend service).

- One person (Data Engineer, since they add it first on Day 1) owns the file structurally. Everyone else **adds their own service block** at the end — don't reorder or reformat existing blocks.
- Before editing, `git pull` and check nobody else has an uncommitted change in flight — post in chat: "editing docker-compose.yml, back in 5."
- Never run an auto-formatter across the whole file — it turns a 3-line diff into a 200-line diff and guarantees a conflict for the next person.

### 4.2 Pydantic Schemas / API Contract (`backend/app/models/`, endpoint files)
**Touched by:** Backend Engineer (owns the file), but Data Scientist and Frontend Engineer depend on its exact shape.

- Backend Engineer is the only one who edits these files. If Data Scientist or Frontend Engineer needs a field added or changed, they **request it in writing** (issue/chat message with the exact field name and type) rather than editing the schema themselves.
- Any schema change is announced in the team channel the moment it's merged — this is a "stop what you're doing and check" message for Frontend and Data Science.

### 4.3 `package.json` / `requirements.txt`
**Touched by:** Whoever adds a new dependency, which can be anyone.

- Add dependencies with the actual install command (`npm install <pkg>`, `pip install <pkg> && pip freeze > requirements.txt`), never by hand-editing the version number — hand-edits drift from what's actually installed and cause conflicts that look resolved but aren't.
- Pull immediately before adding a dependency; these files conflict easily because everyone edits the same few lines.

### 4.4 `README.md` and other cross-cutting docs
**Touched by:** Project Manager primarily, but engineers update their own section when something changes.

- Keep the doc split by section per role (as in this repo's README) so two people editing different sections rarely land on the same lines.
- PM does a final consolidation pass on Day 3 rather than everyone editing continuously.

### 4.5 Kafka topic names / API route paths / env var names
**Not a file conflict — a naming conflict.** These are the strings that appear in *multiple* files across *multiple* branches (`beneficiary.telemetry`, `/api/v1/evaluate`, `NEXT_PUBLIC_API_URL`, etc.).

- These are locked once agreed (see the integration doc's shared contracts) — renaming one after Day 1 means a coordinated find-and-replace across every branch, not a silent local rename. Announce before you rename anything on this list.

---

## 5. PR Workflow

1. **Before opening a PR:** `git pull origin main` and rebase or merge `main` into your feature branch locally, resolve any conflicts *there* — never let GitHub's web UI resolve a conflict for you blindly.
2. **PR size:** small and frequent beats large and rare. Open a PR at the end of each task in the day-by-day breakdown, not one PR per day.
3. **PR description:** state what files you touched, especially if any are outside your owned directory (per Section 3) — this is the reviewer's first thing to check.
4. **Review pairing** (from the integration doc): Data Engineer ↔ Data Scientist review each other's PRs; Backend Engineer ↔ Frontend Engineer review each other's. This works because each pair shares the seam most likely to break.
5. **Merge, don't force-push over `main`.** If your branch is behind, merge `main` in, resolve locally, push, then merge the PR — never `git push --force` to `main` under any circumstances.

---

## 6. Merge Cadence (Not Just Merge Order)

The integration doc specifies merge *order* (`data-fabric` → `ml-forecasting` → `backend-api` → `dashboard-ui`). Just as important is *cadence*: merge to `main` at the end of **each day**, not just once at the end of the sprint.

| Day | End-of-day action |
|---|---|
| Day 1 | Each role merges their Day 1 deliverable to `main` in the documented order, even if it's a stub (e.g. Backend merges a stubbed `/evaluate` route). |
| Day 2 | Each role rebases onto the now-updated `main` first thing, then merges their Day 2 work in the same order at end of day. |
| Day 3 | Final merges happen well before the deadline — never in the last hour. Lock `main` once the deck/demo is confirmed working against it. |

Merging daily means each conflict you hit is against ~1 day of drift, not 3. This is the single biggest lever for avoiding a nasty Day 3 conflict.

---

## 7. When a Conflict Happens Anyway

1. **Don't panic-resolve in the GitHub web editor.** Pull the conflict down locally:
   ```bash
   git checkout feature/your-branch
   git pull origin main
   # or: git merge main
   ```
2. **Read both sides of the conflict marker before choosing.** For shared files (Section 4), the "wrong" side is often subtly wrong, not obviously wrong — e.g. two people both add a docker-compose service in slightly different formats.
3. **If the conflict is in a file you don't own** (per Section 3), don't resolve it solo — ping the owner and resolve it together, even if it takes 10 minutes. A wrong resolution in `predict.py` or the API schema can break a downstream role silently.
4. **After resolving, re-run the relevant seam check** from the integration doc (e.g. if you resolved a conflict in `evaluate.py`, re-test the full `/api/v1/evaluate` round trip) before pushing — a clean merge is not the same as a working merge.
5. **Commit the resolution with a clear message:** `fix(merge): resolve docker-compose service conflict with backend`.

---

## 8. Quick Reference — Do / Don't

**Do:**
- Pull before you start work, every session.
- Merge to `main` daily, in the documented order.
- Announce in chat before editing a shared file (Section 4).
- Ask before editing outside your owned directory.
- Resolve conflicts locally, read both sides, re-test after.

**Don't:**
- Commit directly to `main` or someone else's branch.
- Run a whole-file auto-formatter on a shared file mid-sprint.
- Hand-edit dependency versions in `package.json` / `requirements.txt`.
- Rename a locked contract (topic name, route path, env var) without a team-wide announcement.
- Resolve a conflict in someone else's owned file without them in the loop.
- Force-push over `main`.
