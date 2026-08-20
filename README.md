# LLM Application Routing Advisor

Plan the application first. Choose models second.

The advisor turns an application brief into alternative model teams. It separates what the application must do from its business goal, industry, knowledge area, risk and operating limits, then proposes leading candidates for the primary model, supporting jobs, checkers, fallbacks and the non-model tools the application will also need.

Live site: [llm-application-routing-advisor.jeff-jones-7064.chatgpt.site](https://llm-application-routing-advisor.jeff-jones-7064.chatgpt.site)

## What it does

- **112 model variants** across 27 providers, each carrying its source URL, review date and sourcing state
- **26 reviewed SLMs, 26 edge language models and 10 edge vision-language models**, with dedicated explorer filters and clear boundaries between language models, perception tools and device runtimes
- **25 starting application types plus a custom type field**, including real-time asset tracking, predictive maintenance and edge vision safety
- **Generic project-document import** — upload any readable project document as PDF or DOCX; the importer indexes its structure, selects a bounded evidence set, maps generic specification concepts with visible confidence, retains useful unmapped sections under their original headings, leaves weak guesses for review, keeps existing team/model architecture separate from advisor candidates, and does not retain the original file
- **Downloadable concept-paper template** — a Markdown starter covering objective, context, inputs, output format, constraints, evaluation criteria, edge cases and verification steps
- **14 plan styles** — Quality, Balanced, Cost, Visible ecosystem reach, Broad capability range and Focused specialist team as headline choices, plus eight more
- **Published pricing** where providers publish it, driving the cost score instead of an estimate
- **Full scoring breakdown** on every recommendation: each term, its value and its reasoning
- **No hidden exclusions** — missing capabilities and deployment preferences lower fit and remain visible; only withdrawn models leave current rankings
- **Four separate readings** for model fit, source confidence, ecosystem visibility and measured performance
- **Visible close-call tie-breakers** — raw-score gaps below one point keep their raw order while measured evidence, application specialisation and then ecosystem reach provide an explicit candidate choice
- **User choice inside a three-point band** — every eligible job offers the same dropdown in both the six headline team cards and the detailed job cards; an override is labelled, saved and never presented as a scoring win
- **Provider-concentration warning** — when one provider leads most headline plans, the interface explains that this is a pattern in the current inputs rather than measured proof of general superiority
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
    concepts/              structured PDF/DOCX extraction, source mapping and the starter template
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
.openai/hosting.json          # d1: DB, project_id: appgprj_6a851a9f65…
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

The catalogue was reviewed against official provider pages on 19 August 2026. Of 112 entries, 49 are confirmed against their provider page and 63 carry over from an earlier review; the coverage check reports the split rather than presenting them as equal.

The edge review added FunctionGemma 270M and Qwen3-VL 2B and 4B. It also made the application boundary explicit: sensors and positioning provide authoritative events, perception models detect and track, runtimes execute on the target hardware, and language or vision-language models interpret, explain or choose approved actions. The advisor recommends these non-model components separately rather than counting every vendor runtime or detector as a language model.

That review corrected several entries:

- **xAI** — Grok 4.20, Grok 4.5 and the multi-agent preview were withdrawn; `docs.x.ai` lists a single flagship, Grok 4.6, at 500K context and $2/$6 per million tokens.
- **Alibaba** — Qwen 3.7 Max was superseded by Qwen3.8-Max, which ships open weights.
- **Cohere** — Command A+, Command A and Command A Reasoning were marked downloadable. Cohere's docs list them as proprietary. This mattered: the wrong flag was helping Command A+ win the cost and capability-range plan styles.
- **Amazon** — Nova 2 Pro Preview is no longer listed on `aws.amazon.com/nova/models`.
- **Missing entries** — GPT-5.6 Cyber, GPT-Realtime 2.1 Mini, Ministral 3 8B and Gemini 3.6 Flash were added, along with Xiaomi MiMo-V2.5, which was absent entirely despite ranking fourth by routed tokens on OpenRouter.

Withdrawn models are listed in **Update centre** rather than silently dropped, so a falling count stays explainable.

Pricing is published for 10 entries so far. Where a provider publishes per-token pricing the cost class is derived from it; elsewhere it is an estimate, the interface says so, and the cost term is discounted in scoring. Extending the published-pricing coverage is the highest-value data work remaining.

### Measured performance

`src/data/capability-tests.data.ts` holds published benchmark results, one row per
figure, each with the source that published it. As of 19 August 2026 that is 65
figures covering 19 of the 112 models across seven benchmarks. Where a result
exists it replaces the general quality estimate for that job and earns a higher
evidence factor in the ranking; where none exists the model is scored as an
estimate and the interface says so.

Read the coverage as a map of which vendors publish evaluations, not of which
models are good. Because a measured result carries more ranking weight than an
estimate, well-benchmarked models fill more plan slots than their 17% share of the
catalogue would suggest. The coverage check states this outright.

Three rules keep the layer honest, and each has tests:

- **Benchmarks are recorded as protocols**, meaning a benchmark plus its version
  and run conditions. Humanity's Last Exam with and without tools are separate
  protocols because the same models score 10-14 points apart. Terminal-Bench was
  investigated and excluded entirely: its results move 15-20 points with the agent
  scaffold rather than the model, so a cross-model table built from it would be
  comparing harnesses. Aider Polyglot and LiveCodeBench were dropped for lack of
  any current data.
- **Disagreement produces no result.** Vals AI and BenchLM report DeepSeek V4 Pro
  at 96.4% and 80.6% on the same SWE-bench snapshot. Averaging those to 88.5%
  would invent a figure nobody published, so no coding result is recorded and the
  disagreement is shown in the coverage check. Where several sources agree and one
  is far out — Claude Fable 5's GPQA is reported at 93.18, 92.6 and 55.56 — the
  majority is used and the outlier stays on the record.
- **Saturated benchmarks confirm without ranking.** Frontier models sit between
  88% and 95% on GPQA Diamond, a spread narrower than the benchmark's own variance
  on 198 questions. Raw figures are mapped through five coarse bands, so saturated
  models land level and the close-call tie-break moves on to something that
  actually separates them rather than inventing an order from a decimal place.

To add a result: append a row to `capability-tests.data.ts` and, if the benchmark
is new, add a protocol to `src/data/benchmarks.ts` with its bands and a caveat
saying what it does not show. The parser rejects a row with a missing source, a
non-HTTPS URL, an unknown protocol or an empty note, so a careless addition fails
`npm test` rather than shipping.
