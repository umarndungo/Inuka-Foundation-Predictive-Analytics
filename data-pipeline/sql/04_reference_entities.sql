-- =============================================================================
-- Silver reference/master entities for end-to-end frontend authenticity
-- Synthetic only (no real PII)
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS silver;

CREATE TABLE IF NOT EXISTS silver.field_workers (
    field_worker_id   TEXT PRIMARY KEY,
    code              TEXT NOT NULL UNIQUE,
    full_name         TEXT NOT NULL,
    region            TEXT NOT NULL,
    sub_county        TEXT NOT NULL,
    phone_number      TEXT,
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    home_base_lat     DOUBLE PRECISION,
    home_base_lng     DOUBLE PRECISION,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS silver.beneficiaries_master (
    beneficiary_id    TEXT PRIMARY KEY,
    full_name         TEXT NOT NULL,
    region            TEXT NOT NULL,
    sub_county        TEXT NOT NULL,
    school_name       TEXT NOT NULL,
    grade             INTEGER NOT NULL,
    age               INTEGER NOT NULL,
    gender            TEXT NOT NULL,
    phone_number      TEXT,
    pillar            TEXT NOT NULL DEFAULT 'Scholarship',
    enrollment_date   DATE NOT NULL,
    field_worker_id   TEXT REFERENCES silver.field_workers(field_worker_id),
    home_lat          DOUBLE PRECISION,
    home_lng          DOUBLE PRECISION,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS silver.beneficiary_assignments (
    beneficiary_id    TEXT NOT NULL REFERENCES silver.beneficiaries_master(beneficiary_id),
    field_worker_id   TEXT NOT NULL REFERENCES silver.field_workers(field_worker_id),
    assigned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (beneficiary_id, field_worker_id)
);

CREATE INDEX IF NOT EXISTS idx_field_workers_region
    ON silver.field_workers(region);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_master_region
    ON silver.beneficiaries_master(region);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_master_field_worker
    ON silver.beneficiaries_master(field_worker_id);

CREATE INDEX IF NOT EXISTS idx_beneficiary_assignments_active
    ON silver.beneficiary_assignments(active);
