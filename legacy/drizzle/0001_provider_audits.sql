CREATE TABLE IF NOT EXISTS `provider_audits` (
  `provider` text PRIMARY KEY NOT NULL,
  `data_json` text NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
