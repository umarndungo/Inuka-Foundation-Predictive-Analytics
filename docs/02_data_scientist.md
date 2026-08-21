# Inuka Foundation Predictive Analytics — Task Breakdown: Data Scientist
**Role focus:** Modeling / Predictive Intelligence
**Branch:** `feature/ml-forecasting`
**Owns:** `backend/app/ml/` (train.py, predict.py, model.pkl), demand forecasting pipeline

---

## 1. Scope of Ownership

You build the risk-scoring model (dropout/at-risk prediction) that powers `/api/v1/evaluate`, and the regional demand-forecasting pipeline that feeds the Demand Map dashboard.

Key contract you must satisfy — the `/api/v1/evaluate` response shape:
```json
{
  "beneficiary_id": "BEN-9021",
  "risk_score": 0.88,
  "risk_tier": "HIGH",
  "drivers": ["Low Attendance", "High Travel Distance"],
  "recommended_action": "Automated Field Worker Outreach",
  "automation_triggered": true
}
```

---

## 2. Day-by-Day Task Breakdown

### Day 1 — Foundation
**Deliverable:** Feature importance matrix and initial XGBoost model file (`model.pkl`).

- [ ] Run EDA on `synthetic_beneficiaries.json` (from Data Engineer) — distributions of `attendance_rate`, `grade_average`, `socioeconomic_index`, `historical_dropouts_in_family` by region.
- [ ] Establish and document the correlation between attendance drop-off and dropout rate (this becomes a headline stat for the PM's Impact Memo).
- [ ] Engineer a `risk_tier` label (LOW/MEDIUM/HIGH) from the synthetic data for supervised training — define clear thresholds.
- [ ] Train baseline XGBoost classifier with `random_state=42` for reproducibility.
- [ ] Compute feature importances; write up which features drive risk (attendance, travel distance, socioeconomic index).
- [ ] Save trained pipeline (preprocessing + model together) to `backend/app/ml/model.pkl` via `joblib`.
- [ ] Write `backend/app/ml/train.py` so the model can be retrained reproducibly from the synthetic dataset.
- [ ] Flag to Data Engineer/Backend any features you need added to the schema (e.g. `travel_distance_km` appears in the API contract but not in the seed generator — confirm it's added).

### Day 2 — Integration
**Deliverable:** Demand forecasting time-series pipeline integrated into backend API.

- [ ] Build `backend/app/ml/predict.py` — loads `model.pkl`, exposes a `score_beneficiary(payload) -> dict` function matching the `/api/v1/evaluate` response contract exactly (including `drivers` as human-readable strings, not raw feature names).
- [ ] Map risk score → `risk_tier` (e.g. HIGH ≥ 0.75) → `recommended_action` string, in coordination with Backend Engineer's n8n trigger threshold (`IF risk_score > 0.75 THEN trigger_n8n_webhook()`).
- [ ] Build a lightweight time-series/aggregate forecasting model (e.g. rolling averages or simple regression) for regional demand — Nairobi vs. Kisumu vs. Nakuru vs. Mombasa vs. Eldoret.
- [ ] Coordinate with Backend Engineer to expose forecasts via a `demand.py` endpoint for the Demand Map.
- [ ] Guard against data leakage: confirm all scalers/encoders are fit only on training data, never on full dataset before split.
- [ ] Hand off `drivers` explainability logic (e.g. top-N SHAP or feature-importance-based reasons) to Backend for wiring into the response.

### Day 3 — Testing & Polish
**Deliverable:** Final model performance sheet (Precision, Recall, ROC-AUC).

- [ ] Compute final model metrics: Precision, Recall, F1, ROC-AUC per risk tier.
- [ ] Document model parameters, feature list, and any fallback/default rules (e.g. what happens if a field is missing from a request).
- [ ] Sanity-check predictions against known edge cases (e.g. attendance_rate near 0 or 1, missing travel_distance_km).
- [ ] Write a one-page model card for the presentation deck: what it predicts, what data it was trained on (synthetic), known limitations, why `random_state=42` matters for reproducibility during judging.
- [ ] Support Backend Engineer with final `/api/v1/evaluate` load/edge-case testing.

---

## 3. Coding & Commit Conventions

- Commit format: `feat(ml): <message>` or `data(model): <message>`
- All stochastic processes set `random_state=42`.
- Model artifacts saved via `joblib`, not `pickle` directly.
- Never scale/normalize using statistics computed on the full dataset — fit only on train split, apply to test/inference.
- Keep `train.py` and `predict.py` cleanly separated: training-time code never runs at inference time.

---

## 4. Cross-Role Dependencies

| You need from | What |
|---|---|
| Data Engineer | Clean Silver/Gold PostgreSQL tables; confirmation of all fields in the API contract (esp. `travel_distance_km`) |
| Backend Engineer | Exact request/response Pydantic schema for `/api/v1/evaluate` and `/api/v1/demand` |

| They need from you | What |
|---|---|
| Backend Engineer | `predict.py` with a stable function signature to import directly |
| Frontend Engineer | Demand forecast numbers/shape for `DemandChart.tsx` and `DemandMap.tsx` |
| Project Manager | Model metrics + correlation findings for the Impact Memo and slide deck |

---

## 5. AI Context Block

```
I'm the Data Scientist on a 72-hour hackathon project called "Inuka Risk Radar" —
a predictive intelligence platform for identifying at-risk program beneficiaries
(education dropout risk) in Kenya, plus regional demand forecasting.

STACK: Scikit-Learn / XGBoost for modeling, MLflow for tracking (optional),
joblib for serialization. Model is consumed by a FastAPI backend.

MY SCOPE:
- backend/app/ml/train.py — training pipeline
- backend/app/ml/predict.py — inference function used by the FastAPI route
- backend/app/ml/model.pkl — serialized pipeline (joblib)

API CONTRACT I must satisfy (POST /api/v1/evaluate):
Request: { beneficiary_id, attendance_rate, assignment_completion,
travel_distance_km, region }
Response: { beneficiary_id, risk_score, risk_tier (LOW/MEDIUM/HIGH), drivers
(list of human-readable strings), recommended_action, automation_triggered (bool) }

TRAINING DATA fields (synthetic): beneficiary_id, timestamp, region
(Nairobi/Kisumu/Nakuru/Mombasa/Eldoret), pillar (Scholarship|Plus|Vocational|Tech),
attendance_rate, grade_average, socioeconomic_index, historical_dropouts_in_family,
assignment_completion, travel_distance_km, dropped_out (supervised target).

TARGET: train on dropped_out only — do not engineer labels from predictor thresholds.
pillar is an optional categorical feature (one-hot).

CONSTRAINTS:
- random_state=42 everywhere for reproducibility.
- No data leakage — scalers/encoders fit on train split only.
- risk_score > 0.75 triggers an automated n8n/Twilio SMS escalation downstream,
  so calibration around that threshold matters.
- Commit format: feat(ml): <message>

CURRENT TASK: [paste today's specific task from the breakdown here]
```
