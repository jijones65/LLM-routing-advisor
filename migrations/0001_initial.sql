-- Initial schema. Mirrors SCHEMA_STATEMENTS in src/server/db/schema.ts, which is
-- what the worker applies at runtime; this file exists for platforms that run
-- migrations as a deployment step.

CREATE TABLE IF NOT EXISTS catalog_models (
  id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS source_evidence (
  source_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  family TEXT NOT NULL,
  source_url TEXT NOT NULL,
  cadence_hours INTEGER NOT NULL,
  expected_ids_json TEXT NOT NULL,
  scope_version TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  last_checked_at TEXT,
  last_http_status INTEGER,
  last_fingerprint TEXT,
  drift_status TEXT NOT NULL DEFAULT 'reviewed',
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS registry_snapshots (
  source_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  catalog_url TEXT NOT NULL,
  cadence_hours INTEGER NOT NULL,
  models_json TEXT NOT NULL DEFAULT '[]',
  last_checked_at TEXT,
  last_http_status INTEGER,
  last_fingerprint TEXT,
  drift_status TEXT NOT NULL DEFAULT 'uninitialized',
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS application_blueprints (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blueprints_created ON application_blueprints (created_at DESC);
