# LLM Application Routing Advisor

Plan the application first. Choose models second.

The advisor turns an application brief into alternative model teams. It separates what the application must do from its business goal, industry, knowledge area, risk and operating limits, then proposes leading candidates for the primary model, supporting jobs, checkers, fallbacks and the non-model tools the application will also need.

Live site: [llm-routing-advisor.ji-jones.chatgpt.site](https://llm-routing-advisor.ji-jones.chatgpt.site)

## What it does

- **109 model variants** across 27 providers, each carrying its source URL, review date and sourcing state
- **22 starting application types plus a custom type field**, with user-editable needs that determine the model-team jobs
- **14 plan styles** — Quality, Balanced, Cost, Visible ecosystem reach, Broad capability range and Focused specialist team as headline choices, plus eight more
- **Published pricing** where providers publish it, driving the cost score instead of an estimate
- **Full scoring breakdown** on every recommendation: each term, its value and its reasoning
- **No hidden exclusions** — missing capabilities and deployment preferences lower fit and remain visible; only withdrawn models leave current rankings
- **Four separate readings** for model fit, source confidence, ecosystem visibility and measured performance
- **Close-call decisions** — score gaps of one point or less show joint leaders and a real-task tie-breaker instead of a false winner
- **Complete-team validation** — structural checks plus recordable trials for hand-offs, conflicts, provider failure, cost, latency and peak load
- **Durable Saved plans** — reopen a brief, compare up to three teams, edit the plan name and draft specification, export it as Markdown, or delete it after confirmation
- **Fill-in application specifications** — every save creates a draft covering objective, context, inputs, output contract, constraints, evaluation, edge cases and verification
- **Six independent model lists** cross-referenced, with overlap between them reported and kept separate from provider confirmation
- **A coverage check** that polls official provider pages and raises a review item when one changes
- **A plain-language About tab** explaining every working tab, its limits and a five-step path from an application idea to a tested team

### What it is not

Recommendations are rule-based shortlists built from what providers publish. Quality and speed are versioned 1–5 estimates unless a relevant capability test is attached. Ecosystem visibility measures public-source reach and observed platform activity—not users, market share, reliability or quality. Test a complete model team, including coordination between specialists, on real work from your own application before committing to it.

## Project structure

```
src/
  shared/types.ts          the vocabulary everything else agrees on
  data/
    catalog.data.ts        the catalogue as a reviewable pipe-delimited table
    catalog.ts             parser, validation and derived fields
    providers.ts           official page per provider, version stamps, Ollama links
    taxonomy.ts            needs, archetypes, goals, industries, domains, risk
    roles.ts               the jobs a model team is made of
    strategies.ts          plan styles, as documented weight sets
    evidence.ts            scope, exclusions, watchlist, derived evidence sources
    registry-sources.ts    the six third-party lists
    usage-snapshot.ts      dated OpenRouter usage figures
  engine/
    signals.ts             ecosystem-visibility and capability-range signals
    scoring.ts             job-specific requirements and the explainable score
    planning.ts            team composition and plan rules
    team-evaluation.ts     structural team checks and shared real-task trials
    explain.ts             turning a breakdown into readable prose
  server/
    index.ts               worker entry and route table
    routes/api.ts          JSON endpoints
    blueprints/            Markdown application-specification generator
    db/                    D1 schema, access and repository
    registry/              fetch, parse, normalise and reconcile the six lists
    render/                page shell and HTML rendering
  client/
    main.ts                wiring and event handling
    views/                 one module per tab
    styles.css             the whole stylesheet
    brand.ts               the inlined app icon
test/                      unit and integration tests
scripts/                   build, dev server, browser test
migrations/                D1 schema as SQL
SPECIFICATION.md            product and implementation specification for future rebuilds
```

The deployable artefact is still a single ES module at `dist/server/index.js`, which is what `.openai/hosting.json` expects. The difference from the prototype is that the single file is now _generated_ from this tree rather than being the tree.

## Running it locally

Node 22 or newer (the test harness uses `node:sqlite`, and the build uses
`fs.glob`).

```sh
cd ~/Desktop/GitHub/LLM-routing-advisor
npm install
npm run dev
```

Then open <http://localhost:8787>. That builds the worker and serves it over plain
Node HTTP with an in-memory SQLite stand-in for D1, so every part of the app
works — page render, all seven tabs, the API routes, saved-plan editing and Markdown export.

`npm run dev` uses canned source payloads from `test/fixtures/registry.mjs`, so
the Live registry tab works offline and no third-party gateway is contacted while
you iterate. Use `npm run dev:live` to call the six real sources instead. The
local database is in-memory and resets when you restart.

## Working on it

```sh
npm test             # typecheck, compile, then unit and integration tests
npm run test:browser # drive the real interface in Chromium
npm run check        # everything above
npm run build        # produce dist/
npm run package      # build, then write site.tar.gz for upload
npm run format       # prettier over src, scripts and tests
```

`npm run test:browser` needs Chromium. `npx playwright install chromium` if it is
not already there; the script skips with a message rather than failing if
Playwright is missing entirely.

`npm run dev` uses canned source payloads from `test/fixtures/registry.mjs`, so the registry views work offline and no third-party gateway is called while you iterate. The local database is in-memory and resets on restart.

Edit `src/`, never `dist/`.

### Adding a model

Add one line to `CATALOG_TABLE` in `src/data/catalog.data.ts`. The column format is documented at the top of that file. The parser validates every column and throws on a bad row, so a typo fails `npm test` rather than shipping. If the provider is new, add its official page to `PROVIDER_SOURCES` in `src/data/providers.ts` — the evidence layer derives its poll list from the catalogue, so a new model is watched automatically.

Mark the entry `c` only if you have read the provider's page and the name, status and stated capabilities matched. Otherwise use `u`. The audit view reports these counts, and the whole point is that it is honest.

### Adding a plan style

Add an entry to `STRATEGIES` in `src/data/strategies.ts` and list its id in `PRIMARY_STRATEGY_IDS` or `OTHER_STRATEGY_IDS`. Weights are multipliers on normalised model attributes; `scoreModel` documents what each one applies to. No other file needs to change.

## Deploying

### To the existing OpenAI Sites project

```sh
npm run package
```

That writes `site.tar.gz` containing exactly what the Sites project expects:

```
server/index.js
.openai/hosting.json          # d1: DB, project_id: appgprj_6a826bc4cb…
.openai/drizzle/0001_initial.sql
.openai/drizzle/0002_align_catalog_and_evidence.sql
```

Upload that archive to the existing project the same way you did before — the
repo has never contained the upload step itself, only the artefact it produces.
The bundle shape is unchanged from the prototype's `scripts/build.sh`, so nothing
about the deployment needs to be reconfigured; the only difference is that the
worker is now generated from `src/` instead of being hand-edited.

The database is not reset by a deploy. The schema is applied idempotently on
first request (`ensureSchema`), so new tables appear without a migration step.

### To Cloudflare Workers instead

`wrangler.jsonc` is included so the identical artefact runs there:

```sh
wrangler d1 create llm-routing-advisor          # paste the id into wrangler.jsonc
wrangler d1 migrations apply llm-routing-advisor --remote
npm run build && wrangler deploy
```

This changes nothing about the current deployment — it exists so the option is
open, not because anything needs to move.

### After any deploy

The one path the test suite covers only with fixtures is the six live
third-party sources. Open **Live registry**, press **Refresh sources**, and
confirm all six report `current` with non-zero listing counts. If one reports
`error` the app keeps its last good snapshot and the catalogue and every
recommendation are unaffected — but it is worth knowing which one.

## Notes on the data

The catalogue was reviewed against official provider pages on 18 August 2026. Of 109 entries, 46 were confirmed against their provider page on that date and 63 carry over from an earlier review; the coverage check reports the split rather than presenting them as equal.

That review corrected several entries:

- **xAI** — Grok 4.20, Grok 4.5 and the multi-agent preview were withdrawn; `docs.x.ai` lists a single flagship, Grok 4.6, at 500K context and $2/$6 per million tokens.
- **Alibaba** — Qwen 3.7 Max was superseded by Qwen3.8-Max, which ships open weights.
- **Cohere** — Command A+, Command A and Command A Reasoning were marked downloadable. Cohere's docs list them as proprietary. This mattered: the wrong flag was helping Command A+ win the cost and capability-range plan styles.
- **Amazon** — Nova 2 Pro Preview is no longer listed on `aws.amazon.com/nova/models`.
- **Missing entries** — GPT-5.6 Cyber, GPT-Realtime 2.1 Mini, Ministral 3 8B and Gemini 3.6 Flash were added, along with Xiaomi MiMo-V2.5, which was absent entirely despite ranking fourth by routed tokens on OpenRouter.

Withdrawn models are listed in **Update centre** rather than silently dropped, so a falling count stays explainable.

Pricing is published for 10 entries so far. Where a provider publishes per-token pricing the cost class is derived from it; elsewhere it is an estimate, the interface says so, and the cost term is discounted in scoring. Extending the published-pricing coverage is the highest-value data work remaining.
