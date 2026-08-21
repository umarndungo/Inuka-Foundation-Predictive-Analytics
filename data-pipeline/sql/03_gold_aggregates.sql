-- =============================================================================
-- Gold layer — pre-aggregated regional / pillar stats for dashboard + demand
-- Idempotent views (always consistent under Postgres MVCC reads).
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS gold;

DROP VIEW IF EXISTS gold.regional_alert_stats;
DROP VIEW IF EXISTS gold.regional_telemetry_hourly;
DROP VIEW IF EXISTS gold.pillar_regional_stats;
DROP VIEW IF EXISTS gold.regional_risk_stats;

-- Regional rollups for Risk Radar / Demand Map / forecasting inputs.
-- Includes all enrolled beneficiaries; risk_* counts only scored rows (have telemetry).
-- dropout_* uses historical synthetic outcome (dropped_out), not heuristic risk_tier.
CREATE OR REPLACE VIEW gold.regional_risk_stats AS
SELECT
    region,
    COUNT(*)::BIGINT                                              AS beneficiary_count,
    COUNT(*) FILTER (WHERE last_event_at IS NOT NULL)::BIGINT     AS with_telemetry_count,
    ROUND(AVG(attendance_rate)::NUMERIC, 4)                       AS avg_attendance_rate,
    ROUND(AVG(grade_average)::NUMERIC, 2)                         AS avg_grade_average,
    ROUND(AVG(assignment_completion)::NUMERIC, 4)                 AS avg_assignment_completion,
    ROUND(AVG(travel_distance_km)::NUMERIC, 2)                    AS avg_travel_distance_km,
    ROUND(AVG(socioeconomic_index)::NUMERIC, 2)                   AS avg_socioeconomic_index,
    COUNT(*) FILTER (WHERE dropped_out = 1)::BIGINT               AS dropout_count,
    ROUND(AVG(dropped_out)::NUMERIC, 4)                           AS dropout_rate,
    COUNT(*) FILTER (WHERE risk_tier = 'HIGH')::BIGINT            AS high_risk_count,
    COUNT(*) FILTER (WHERE risk_tier = 'MEDIUM')::BIGINT          AS medium_risk_count,
    COUNT(*) FILTER (WHERE risk_tier = 'LOW')::BIGINT             AS low_risk_count,
    COUNT(*) FILTER (WHERE risk_tier = 'UNKNOWN')::BIGINT         AS unknown_risk_count,
    MAX(last_event_at)                                            AS last_event_at,
    MAX(last_ingested_at)                                         AS last_ingested_at
FROM silver.beneficiary_identity_graph
WHERE region IS NOT NULL
GROUP BY region;

COMMENT ON VIEW gold.regional_risk_stats IS
    'Gold: one row per region for dashboard charts/maps and demand-forecast features. '
    'dropout_rate is from historical synthetic dropped_out, not risk_tier.';

-- Region × pillar rollups — required so analytics can distinguish the four Inuka pillars.
CREATE OR REPLACE VIEW gold.pillar_regional_stats AS
SELECT
    region,
    pillar,
    COUNT(*)::BIGINT                                              AS beneficiary_count,
    COUNT(*) FILTER (WHERE last_event_at IS NOT NULL)::BIGINT     AS with_telemetry_count,
    ROUND(AVG(attendance_rate)::NUMERIC, 4)                       AS avg_attendance_rate,
    ROUND(AVG(grade_average)::NUMERIC, 2)                         AS avg_grade_average,
    ROUND(AVG(assignment_completion)::NUMERIC, 4)                 AS avg_assignment_completion,
    ROUND(AVG(travel_distance_km)::NUMERIC, 2)                    AS avg_travel_distance_km,
    ROUND(AVG(socioeconomic_index)::NUMERIC, 2)                   AS avg_socioeconomic_index,
    COUNT(*) FILTER (WHERE dropped_out = 1)::BIGINT               AS dropout_count,
    ROUND(AVG(dropped_out)::NUMERIC, 4)                           AS dropout_rate,
    COUNT(*) FILTER (WHERE risk_tier = 'HIGH')::BIGINT            AS high_risk_count,
    COUNT(*) FILTER (WHERE risk_tier = 'MEDIUM')::BIGINT          AS medium_risk_count,
    COUNT(*) FILTER (WHERE risk_tier = 'LOW')::BIGINT             AS low_risk_count,
    COUNT(*) FILTER (WHERE risk_tier = 'UNKNOWN')::BIGINT         AS unknown_risk_count,
    MAX(last_event_at)                                            AS last_event_at,
    MAX(last_ingested_at)                                         AS last_ingested_at
FROM silver.beneficiary_identity_graph
WHERE region IS NOT NULL
  AND pillar IS NOT NULL
GROUP BY region, pillar;

COMMENT ON VIEW gold.pillar_regional_stats IS
    'Gold: region × pillar (Scholarship/Plus/Vocational/Tech) for programme analytics.';

-- Hourly regional telemetry volume (time-series input for demand forecasting).
CREATE OR REPLACE VIEW gold.regional_telemetry_hourly AS
SELECT
    date_trunc('hour', COALESCE(event_timestamp, ingested_at)) AS hour_bucket,
    COALESCE(payload->>'region', 'UNKNOWN')                    AS region,
    COALESCE(payload->>'pillar', 'UNKNOWN')                    AS pillar,
    COUNT(*)::BIGINT                                           AS event_count,
    ROUND(AVG((payload->>'attendance_rate')::DOUBLE PRECISION)::NUMERIC, 4)
        AS avg_attendance_rate,
    ROUND(AVG((payload->>'travel_distance_km')::DOUBLE PRECISION)::NUMERIC, 2)
        AS avg_travel_distance_km,
    COUNT(DISTINCT beneficiary_id)::BIGINT                     AS unique_beneficiaries
FROM bronze.telemetry_events
WHERE topic = 'beneficiary.telemetry'
GROUP BY 1, 2, 3;

COMMENT ON VIEW gold.regional_telemetry_hourly IS
    'Gold: hourly regional (+ pillar) event volumes for Data Scientist demand forecasting.';

-- Latest alert summaries by region (system.alerts landed in Bronze).
CREATE OR REPLACE VIEW gold.regional_alert_stats AS
SELECT
    COALESCE(payload->>'region', g.region, 'UNKNOWN') AS region,
    COALESCE(payload->>'pillar', g.pillar, 'UNKNOWN') AS pillar,
    COUNT(*)::BIGINT                                  AS alert_count,
    MAX(COALESCE(event_timestamp, ingested_at))       AS last_alert_at
FROM bronze.telemetry_events e
LEFT JOIN silver.beneficiary_identity_graph g
    ON g.beneficiary_id = e.beneficiary_id
WHERE e.topic = 'system.alerts'
GROUP BY 1, 2;

COMMENT ON VIEW gold.regional_alert_stats IS
    'Gold: escalation counts from system.alerts for automation proof / dashboard badges.';
