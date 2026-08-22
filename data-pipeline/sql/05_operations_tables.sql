-- =============================================================================
-- Operations layer — alerts and interventions
-- Synthetic only (no real PII)
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS operations;

CREATE TABLE IF NOT EXISTS operations.alerts (
    alert_id           TEXT PRIMARY KEY,
    beneficiary_id     TEXT,
    field_worker_id    TEXT,
    severity           TEXT NOT NULL,
    type               TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'new',
    description        TEXT NOT NULL,
    location           TEXT NOT NULL,
    device_id          TEXT,
    metadata           JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_by    TEXT,
    acknowledged_at    TIMESTAMPTZ,
    resolved_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS operations.interventions (
    intervention_id        TEXT PRIMARY KEY,
    beneficiary_id         TEXT,
    field_worker_id        TEXT,
    triggered_by_alert_id  TEXT REFERENCES operations.alerts(alert_id),
    intervention_type      TEXT NOT NULL,
    status                 TEXT NOT NULL DEFAULT 'open',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at           TIMESTAMPTZ,
    notes                  TEXT
);

CREATE INDEX IF NOT EXISTS idx_operations_alerts_created_at
    ON operations.alerts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operations_alerts_status
    ON operations.alerts (status);

CREATE INDEX IF NOT EXISTS idx_operations_alerts_beneficiary
    ON operations.alerts (beneficiary_id);

CREATE INDEX IF NOT EXISTS idx_operations_interventions_created_at
    ON operations.interventions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operations_interventions_beneficiary
    ON operations.interventions (beneficiary_id);
