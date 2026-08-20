/**
 * D1 schema, applied idempotently on first use.
 *
 * Kept as statements rather than a migration runner because the deployment
 * target ships one worker file and has no migration step of its own. The
 * `migrations/` directory holds the same statements for platforms that do.
 */
export const SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS catalog_models (
     id TEXT PRIMARY KEY,
     data_json TEXT NOT NULL,
     updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS source_evidence (
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
   )`,
  `CREATE TABLE IF NOT EXISTS registry_snapshots (
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
   )`,
  `CREATE TABLE IF NOT EXISTS application_blueprints (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     payload_json TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS application_users (
     id TEXT PRIMARY KEY,
     email TEXT NOT NULL,
     display_name TEXT,
     account_tier TEXT NOT NULL DEFAULT 'free',
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
     last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS application_blueprint_owners (
     blueprint_id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (blueprint_id) REFERENCES application_blueprints(id) ON DELETE CASCADE,
     FOREIGN KEY (user_id) REFERENCES application_users(id) ON DELETE CASCADE
   )`,
  `CREATE INDEX IF NOT EXISTS idx_blueprints_created ON application_blueprints (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_blueprint_owners_user
   ON application_blueprint_owners (user_id, assigned_at DESC)`,
];
