-- =============================================================================
-- Silver layer — beneficiary identity graph
-- Idempotent. Synthetic data only (no real PII).
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS silver;

-- Static demographic attributes (seeded from synthetic_beneficiaries.json).
-- historical_dropouts_in_family mimics a sensitive attribute — SYNTHETIC ONLY.
-- pillar = Inuka programme; dropped_out = historical synthetic ML target.
CREATE TABLE IF NOT EXISTS silver.beneficiary_demographics (
    beneficiary_id                 TEXT PRIMARY KEY,
    region                         TEXT        NOT NULL,
    pillar                         TEXT        NOT NULL DEFAULT 'Scholarship',
    socioeconomic_index            NUMERIC(4, 2),
    historical_dropouts_in_family  INTEGER     NOT NULL DEFAULT 0,
    dropped_out                    SMALLINT    NOT NULL DEFAULT 0
        CHECK (dropped_out IN (0, 1)),
    enrolled_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent upgrades for volumes created before pillar / dropped_out existed.
ALTER TABLE silver.beneficiary_demographics
    ADD COLUMN IF NOT EXISTS pillar TEXT NOT NULL DEFAULT 'Scholarship';
ALTER TABLE silver.beneficiary_demographics
    ADD COLUMN IF NOT EXISTS dropped_out SMALLINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_silver_demographics_region
    ON silver.beneficiary_demographics (region);
CREATE INDEX IF NOT EXISTS idx_silver_demographics_pillar
    ON silver.beneficiary_demographics (pillar);

COMMENT ON TABLE silver.beneficiary_demographics IS
    'Silver: static synthetic demographics. pillar = Inuka programme; '
    'dropped_out = historical synthetic outcome for ML; '
    'historical_dropouts_in_family is SYNTHETIC ONLY.';

-- Postgres CREATE OR REPLACE VIEW cannot reorder/rename columns. Drop dependents
-- first so pillar / dropped_out can be inserted into the view definition.
DROP VIEW IF EXISTS gold.regional_alert_stats;
DROP VIEW IF EXISTS gold.regional_telemetry_hourly;
DROP VIEW IF EXISTS gold.pillar_regional_stats;
DROP VIEW IF EXISTS gold.regional_risk_stats;
DROP VIEW IF EXISTS silver.beneficiary_identity_graph;
DROP VIEW IF EXISTS silver.latest_telemetry;

-- Latest telemetry event per beneficiary (identity resolution / dedup).
CREATE VIEW silver.latest_telemetry AS
SELECT DISTINCT ON (beneficiary_id)
    beneficiary_id,
    event_timestamp,
    ingested_at,
    payload->>'region'                              AS region,
    payload->>'pillar'                              AS pillar,
    (payload->>'attendance_rate')::DOUBLE PRECISION AS attendance_rate,
    (payload->>'grade_average')::DOUBLE PRECISION   AS grade_average,
    (payload->>'assignment_completion')::DOUBLE PRECISION AS assignment_completion,
    (payload->>'travel_distance_km')::DOUBLE PRECISION    AS travel_distance_km,
    (payload->>'socioeconomic_index')::DOUBLE PRECISION   AS socioeconomic_index,
    (payload->>'historical_dropouts_in_family')::INTEGER  AS historical_dropouts_in_family,
    (payload->>'dropped_out')::SMALLINT                   AS dropped_out,
    payload
FROM bronze.telemetry_events
WHERE topic = 'beneficiary.telemetry'
  AND beneficiary_id IS NOT NULL
ORDER BY beneficiary_id, event_timestamp DESC NULLS LAST, ingested_at DESC;

COMMENT ON VIEW silver.latest_telemetry IS
    'Deduped: one row per beneficiary_id from the newest telemetry event.';

-- Canonical identity graph: demographics ⊕ latest telemetry.
-- Prefers demographic region/pillar/outcome/socioeconomic/family flags when present;
-- falls back to payload values for telemetry-only beneficiaries.
CREATE VIEW silver.beneficiary_identity_graph AS
WITH ids AS (
    SELECT beneficiary_id FROM silver.beneficiary_demographics
    UNION
    SELECT beneficiary_id FROM silver.latest_telemetry
)
SELECT
    i.beneficiary_id,
    COALESCE(d.region, t.region) AS region,
    COALESCE(d.pillar, t.pillar, 'Scholarship') AS pillar,
    t.attendance_rate,
    t.grade_average,
    t.assignment_completion,
    t.travel_distance_km,
    COALESCE(d.socioeconomic_index::DOUBLE PRECISION, t.socioeconomic_index)
        AS socioeconomic_index,
    -- SYNTHETIC ONLY — not real personal/family data.
    COALESCE(d.historical_dropouts_in_family, t.historical_dropouts_in_family, 0)
        AS historical_dropouts_in_family,
    -- Historical synthetic outcome for supervised ML (canonical from demographics).
    COALESCE(d.dropped_out, t.dropped_out, 0)::SMALLINT AS dropped_out,
    t.event_timestamp AS last_event_at,
    t.ingested_at     AS last_ingested_at,
    CASE
        WHEN t.attendance_rate IS NULL THEN 'UNKNOWN'
        WHEN t.attendance_rate < 0.55
          OR COALESCE(t.travel_distance_km, 0) > 20
          OR COALESCE(d.historical_dropouts_in_family, t.historical_dropouts_in_family, 0) >= 2
            THEN 'HIGH'
        WHEN t.attendance_rate < 0.70
          OR COALESCE(t.travel_distance_km, 0) > 12
          OR COALESCE(d.socioeconomic_index::DOUBLE PRECISION, t.socioeconomic_index, 5) < 2.5
            THEN 'MEDIUM'
        ELSE 'LOW'
    END AS risk_tier
FROM ids i
LEFT JOIN silver.beneficiary_demographics d USING (beneficiary_id)
LEFT JOIN silver.latest_telemetry t USING (beneficiary_id);

COMMENT ON VIEW silver.beneficiary_identity_graph IS
    'Canonical one-row-per-beneficiary graph for ML + /evaluate lookups. '
    'dropped_out is the supervised target; risk_tier remains a heuristic until model scores land.';
