CREATE TABLE IF NOT EXISTS `catalog_models` (
  `id` text PRIMARY KEY NOT NULL,
  `data_json` text NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `application_blueprints` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `payload_json` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
