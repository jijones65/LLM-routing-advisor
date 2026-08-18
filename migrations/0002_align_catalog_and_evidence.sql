-- Remove derived rows from the superseded 2026.08.17 catalogue projection.
-- Saved application blueprints and registry snapshots are deliberately kept.
-- The worker repopulates catalog_models from the bundled, validated 109-model
-- release and seedEvidence repopulates the current official-source projection.

DELETE FROM catalog_models;

DELETE FROM source_evidence
WHERE scope_version <> '2026.08.18-2';
