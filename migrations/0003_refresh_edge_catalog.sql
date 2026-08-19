-- Refresh only derived catalogue and official-source projections for release 2026.08.19-1.
-- Saved plans and registry snapshots are deliberately preserved.
DELETE FROM catalog_models;
DELETE FROM source_evidence WHERE scope_version <> '2026.08.19-1';
