-- =============================================================================
-- Gold analytics artifacts — persisted beneficiary risk scores
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS gold;

CREATE TABLE IF NOT EXISTS gold.beneficiary_risk_scores (
    score_id              BIGSERIAL PRIMARY KEY,
    beneficiary_id        TEXT NOT NULL,
    scored_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    risk_score            NUMERIC(6, 4) NOT NULL,
    risk_tier             TEXT NOT NULL,
    drivers               JSONB NOT NULL,
    recommended_action    TEXT NOT NULL,
    model_version         TEXT NOT NULL DEFAULT 'v1',
    automation_triggered  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_gold_beneficiary_risk_scores_beneficiary
    ON gold.beneficiary_risk_scores (beneficiary_id, scored_at DESC);

CREATE INDEX IF NOT EXISTS idx_gold_beneficiary_risk_scores_scored_at
    ON gold.beneficiary_risk_scores (scored_at DESC);

CREATE INDEX IF NOT EXISTS idx_gold_beneficiary_risk_scores_tier
    ON gold.beneficiary_risk_scores (risk_tier);

CREATE TABLE IF NOT EXISTS gold.demand_forecasts (
    forecast_id           BIGSERIAL PRIMARY KEY,
    forecast_date         DATE NOT NULL,
    region                TEXT NOT NULL,
    horizon_days          INTEGER NOT NULL,
    historical            JSONB NOT NULL,
    predicted             JSONB NOT NULL,
    confidence            JSONB NOT NULL,
    dates                 JSONB NOT NULL,
    expected_change       NUMERIC(8, 2) NOT NULL DEFAULT 0,
    peak_day              DATE,
    summary_confidence    INTEGER NOT NULL DEFAULT 0,
    risk_factor           NUMERIC(8, 4) NOT NULL DEFAULT 0,
    predicted_demand      NUMERIC(8, 2) NOT NULL DEFAULT 0,
    generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_gold_demand_forecasts UNIQUE (forecast_date, region, horizon_days)
);

CREATE INDEX IF NOT EXISTS idx_gold_demand_forecasts_region_horizon
    ON gold.demand_forecasts (region, horizon_days, forecast_date DESC);

CREATE INDEX IF NOT EXISTS idx_gold_demand_forecasts_generated_at
    ON gold.demand_forecasts (generated_at DESC);

CREATE TABLE IF NOT EXISTS gold.risk_trend_daily (
    snapshot_date         DATE PRIMARY KEY,
    low_count             INTEGER NOT NULL DEFAULT 0,
    medium_count          INTEGER NOT NULL DEFAULT 0,
    high_count            INTEGER NOT NULL DEFAULT 0,
    critical_count        INTEGER NOT NULL DEFAULT 0,
    total_count           INTEGER NOT NULL DEFAULT 0,
    overall_ratio         NUMERIC(8, 4) NOT NULL DEFAULT 0,
    generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gold_risk_trend_daily_generated_at
    ON gold.risk_trend_daily (generated_at DESC);
