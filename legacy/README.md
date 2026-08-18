# Legacy prototype

The original single-file prototype, kept for reference while the rewrite settles.

- `worker-index.js` — the whole application as it was: catalogue, scoring, D1 access, registry reconciliation and the entire interface in one 213KB file
- `db-schema.ts` — the old schema, superseded by `src/server/db/schema.ts` and `migrations/`
- `drizzle/` — the old migration files, consolidated into `migrations/0001_initial.sql`
- `build.sh` — the old copy-based build, superseded by `scripts/build.mjs`
- `test-*.mjs`, `validate-artifact.mjs` — the old smoke checks, superseded by `test/`

Nothing here is imported or executed. Once you are satisfied with the rewrite,
`git rm -r legacy` — the history keeps it either way.
