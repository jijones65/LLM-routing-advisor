# LLM Application Routing Advisor

Plan the application first. Choose models second.

The advisor turns an application brief into alternative model teams. It separates what the application must do from its business goal, industry, knowledge area, risk and operating limits. It then recommends a primary model, supporting models, checkers, fallback choices and any non-model tools the application may need.

Live site: [llm-routing-advisor.ji-jones.chatgpt.site](https://llm-routing-advisor.ji-jones.chatgpt.site)

## What is included

- 107 distinct model variants supported by official provider pages
- Quality-first, Balanced and Cost-first model teams, plus eight additional plan styles
- Computer vision, geospatial, voice, coding, research, automation, privacy and safety capabilities
- Industry, business-goal, knowledge-area and risk context
- Provider website and Ollama links where available
- Six independently labelled model-listing sources with visible overlap
- Official-source evidence, catalogue coverage and update layers
- D1 storage for source snapshots, evidence checks and saved application plans

The recommendations are rule-based shortlists. They do not claim independently tested performance, and complete model teams should be tested on real application work before launch.

## Project structure

- `worker/index.js` — application, catalogue and Cloudflare Worker routes
- `drizzle/` — D1 database migrations
- `scripts/` — deterministic build and validation checks
- `.openai/hosting.json` — existing Sites project identity and logical bindings

## Validate locally

```sh
npm run build
npm run validate
npm run test:registry
npm run test:planning
```

The build writes the deployable Worker to `dist/`. Edit `worker/index.js`, not the generated file in `dist/`.
