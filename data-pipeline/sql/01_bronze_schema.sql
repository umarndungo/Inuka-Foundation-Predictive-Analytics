-- =============================================================================
-- Bronze layer — raw Kafka event landing zone
-- Idempotent: safe to re-run. All data is synthetic (no real PII).
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS bronze;

-- Raw, untouched JSON event logs from Kafka topics.
CREATE TABLE IF NOT EXISTS bronze.telemetry_events (
    event_id          BIGSERIAL PRIMARY KEY,
    topic             TEXT        NOT NULL,
    partition_id      INTEGER,
    kafka_offset      BIGINT,
    beneficiary_id    TEXT,
    event_timestamp   TIMESTAMPTZ,          -- timestamp from the event payload
    ingested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload           JSONB       NOT NULL
);

-- Fast lookups by ingestion time (consumer lag / latency checks).
CREATE INDEX IF NOT EXISTS idx_bronze_telemetry_ingested_at
    ON bronze.telemetry_events (ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_bronze_telemetry_beneficiary_id
    ON bronze.telemetry_events (beneficiary_id);

CREATE INDEX IF NOT EXISTS idx_bronze_telemetry_event_timestamp
    ON bronze.telemetry_events (event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_bronze_telemetry_payload_gin
    ON bronze.telemetry_events USING GIN (payload);

-- Idempotent unique key for Kafka offsets (avoids duplicate landings on restart).
CREATE UNIQUE INDEX IF NOT EXISTS uq_bronze_telemetry_kafka_offset
    ON bronze.telemetry_events (topic, partition_id, kafka_offset)
    WHERE partition_id IS NOT NULL AND kafka_offset IS NOT NULL;

COMMENT ON TABLE bronze.telemetry_events IS
    'Bronze: raw Kafka payloads (beneficiary.telemetry / system.alerts). Synthetic data only.';
