CREATE TABLE IF NOT EXISTS `source_evidence` (
  `source_id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `family` text NOT NULL,
  `source_url` text NOT NULL,
  `cadence_hours` integer NOT NULL,
  `expected_ids_json` text NOT NULL,
  `scope_version` text NOT NULL,
  `reviewed_at` text NOT NULL,
  `last_checked_at` text,
  `last_http_status` integer,
  `last_fingerprint` text,
  `drift_status` text DEFAULT 'reviewed' NOT NULL,
  `error_message` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `source_evidence_status_idx` ON `source_evidence` (`drift_status`, `last_checked_at`);
