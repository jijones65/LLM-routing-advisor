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

CREATE INDEX IF NOT EXISTS registry_snapshots_status_idx
  ON registry_snapshots (drift_status, last_checked_at);
