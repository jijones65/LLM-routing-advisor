-- Add identity-aware plan ownership without rewriting existing saved plans.
-- Existing plans remain unassigned until the private owner signs in to the
-- authentication-enabled release, when the application can claim them safely.

CREATE TABLE IF NOT EXISTS application_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  account_tier TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS application_blueprint_owners (
  blueprint_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blueprint_id) REFERENCES application_blueprints(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES application_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blueprint_owners_user
ON application_blueprint_owners (user_id, assigned_at DESC);
