import { BRAND_MARK } from "../../client/brand.js";

/**
 * The page markup.
 *
 * Server-rendered once per request as a static shell; every dynamic region is an
 * empty element the client bundle fills in. Keeping the markup here rather than
 * generating it in the client means the page has readable structure and a
 * meaningful document outline before any script runs.
 *
 * `{{...}}` placeholders are substituted in `page.ts`.
 */
export const BODY_MARKUP = `<section class="landing-page" id="landing-page">
<header class="landing-nav">
<a class="landing-brand" href="#landing-top" aria-label="LLM Application Routing Advisor home">
<span class="mark" aria-hidden="true"><img src="${BRAND_MARK}" alt=""></span>
<span>LLM Application Routing Advisor</span>
</a>
<nav aria-label="Landing page">
<a href="#landing-how">How it works</a>
<a href="#landing-included">What is included</a>
<button type="button" id="landing-header-sign-in">Sign in</button>
</nav>
</header>
<main class="landing-main" id="landing-top">
<section class="landing-hero">
<div class="landing-hero-copy">
<div class="eyebrow">Application-first AI planning</div>
<h1>Plan the application first.<br>Choose models second.</h1>
<p>Describe the work, choose the Skills it needs and compare model teams built for quality, cost, evidence and real operating constraints. Every recommendation is a candidate to test—not a claim of a proven winner.</p>
<div class="landing-actions">
<button type="button" id="landing-sign-in">Sign in or create a free account</button>
<a href="#landing-how">See how the Advisor works</a>
</div>
<small>Passwordless email sign-in. New users receive an account automatically.</small>
</div>
<div class="landing-preview" aria-label="Example application planning flow">
<span class="landing-preview-label">Example plan</span>
<strong>Document intelligence</strong>
<p>Application brief → Skills → model-team jobs → comparable candidates → trials</p>
<div class="landing-preview-team">
<article><b>Primary</b><span>Best fit for the user-facing work</span></article>
<article><b>Specialists</b><span>Models matched to focused jobs</span></article>
<article><b>Checker</b><span>Independent quality and safety review</span></article>
</div>
<small>Close choices remain visible so the user can compare and decide.</small>
</div>
</section>
<section class="landing-metrics" aria-label="Advisor coverage">
<article><strong>{{MODEL_COUNT}}</strong><span>distinct model variants</span></article>
<article><strong>{{PROVIDER_COUNT}}</strong><span>providers represented</span></article>
<article><strong>37</strong><span>plain-language Skills</span></article>
<article><strong>6</strong><span>headline plan styles</span></article>
</section>
<section class="landing-section" id="landing-how">
<div class="landing-section-head">
<div class="eyebrow">How it works</div>
<h2>Turn an application idea into a team you can test.</h2>
</div>
<div class="landing-steps">
<article><span>01</span><strong>Describe the work</strong><p>Start with an application type, select its Skills and add the business context, risks and operating limits.</p></article>
<article><span>02</span><strong>Compare model teams</strong><p>See quality, balanced, cost, ecosystem, broad-capability and specialist plans with the reason for every job choice.</p></article>
<article><span>03</span><strong>Test and save</strong><p>Record whole-team trials, save the plan and complete an editable draft application specification.</p></article>
</div>
</section>
<section class="landing-section landing-included" id="landing-included">
<div class="landing-section-head">
<div class="eyebrow">Inside your account</div>
<h2>Planning, evidence and project files in one workspace.</h2>
</div>
<div class="landing-feature-grid">
<article><strong>Application design</strong><p>Create model teams from the jobs the application must perform.</p></article>
<article><strong>Transparent choices</strong><p>Inspect fit, source confidence, ecosystem visibility, performance evidence and close alternatives separately.</p></article>
<article><strong>Saved plans</strong><p>Reopen, compare, edit, export or delete team plans and their draft specifications.</p></article>
<article><strong>Private project files</strong><p>Keep uploaded PDF and DOCX source documents in your account, then download or delete them when needed.</p></article>
<article><strong>Model and source checks</strong><p>Explore the main catalogue, outside registries, coverage gaps and update history.</p></article>
<article><strong>Whole-team trials</strong><p>Check hand-offs, complementarity, redundancy, routing, failures, quality, cost and speed.</p></article>
</div>
</section>
<section class="landing-final">
<div><div class="eyebrow">Start with the application</div><h2>Build a model team you can explain and test.</h2></div>
<button type="button" id="landing-final-sign-in">Sign in or create a free account</button>
</section>
</main>
<footer class="landing-footer"><span>LLM Application Routing Advisor</span><span>Candidates to test, not proven winners.</span></footer>
</section>
<div class="advisor-app" id="advisor-app" hidden>
<header class="topbar">
<div class="brand">
<span class="mark" aria-hidden="true">
<img src="${BRAND_MARK}" alt="">
</span>
<span>LLM application advisor</span>
</div>
<nav class="tabs" aria-label="Dashboard sections">
<button class="tab active" data-tab="design">Application design</button>
<button class="tab" data-tab="saved">Saved plans</button>
<button class="tab" data-tab="explore">Model explorer</button>
<button class="tab" data-tab="registry">Live registry</button>
<button class="tab" data-tab="audit-layer">Coverage check</button>
<button class="tab" data-tab="updates">Update centre</button>
<button class="tab" data-tab="about">About</button>
<button class="tab" data-tab="account">Account</button>
</nav>
<div class="topbar-actions">
<div class="live" id="live-state">
<i>
</i>Checks for updates · 60s</div>
<button class="account-button" type="button" id="account-button">Sign in</button>
<div class="account-user" id="account-user" hidden>
<span id="account-email"></span>
<button type="button" id="account-page-button">Account</button>
<button type="button" id="account-sign-out">Sign out</button>
</div>
</div>
</header>
<main>
<section class="page active" id="design-page">
<div class="workspace">
<aside class="brief">
<div class="eyebrow">01 · Describe the application</div>
<h1>Plan the application first. Choose models second.</h1>
<p class="lede">Describe the application, its work and its context. The advisor will then build different model teams for quality, balance, cost, ecosystem reach and capability range.</p>
<section class="concept-import" aria-labelledby="concept-import-title">
<div class="concept-import-head">
<div>
<span class="label" id="concept-import-title">Start with a project document</span>
<p>Upload any readable project document as PDF or DOCX. The advisor preserves the complete extracted text and its structure, then uses a smaller evidence set to suggest Skills and a reviewable brief. Every mapped and unmapped section remains in document order in the exported plan; weak guesses are flagged instead of treated as facts.</p>
</div>
<span class="concept-private" id="concept-storage-state">Stored in your account</span>
</div>
<label class="concept-file" for="concept-paper-file">
<span>Choose PDF or DOCX</span>
<input id="concept-paper-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
</label>
<div class="concept-import-actions">
<button type="button" id="import-concept-paper">Make a plan from this document</button>
<a href="/api/concept-paper-template" download>Download a starter template (.md)</a>
</div>
<p class="concept-import-status" id="concept-paper-status" role="status">PDF or DOCX · up to 8 MB · scanned PDFs need OCR</p>
<div class="concept-import-result" id="concept-paper-result" hidden></div>
</section>
<section class="brief-section">
<label class="label" for="archetype">Starting application type</label>
<select class="select" id="archetype">
</select>
<p class="help" id="archetype-help">
</p>
<div class="custom-type">
<label class="label" for="custom-application">Or name your own application type</label>
<input class="search" id="custom-application" maxlength="100" autocomplete="off" aria-describedby="custom-application-help" placeholder="For example: supplier comparison for a school">
<p class="help" id="custom-application-help">This name appears in the plan. The starting type above suggests common skills; adjust <strong>Skills</strong> below to build the AI model team.</p>
</div>
</section>
<section class="brief-section">
<div class="brief-section-head">
<span class="label">Skills</span>
<small id="case-count">
</small>
</div>
<p class="skills-intro">Choose only the skills required for a successful result. Roll over, focus or tap a title to see when to use it, examples and its boundary. The starting application type is a suggestion—you can add or remove any skill.</p>
<div class="capability-groups" id="capabilities">
</div>
<details class="taxonomy-note skill-taxonomy-note">
<summary>How skills affect the model team</summary>
<p>Skills create the jobs and requirements used to compare models. Industry and knowledge area change the test context, not a model's facts. A missing skill lowers model fit but does not automatically hide a model.</p>
<p>This is a plain-language application taxonomy informed by the OECD AI-system classification, NIST AI Risk Management Framework, ISO/IEC 22989 terminology and SFIA's task-oriented skills. It is not an official combined standard.</p>
<p>Illustrative AI-capability, business-process automation and SFIA process-reengineering examples were also reviewed for gaps. Specialised workflows appear as examples unless the model catalogue can genuinely distinguish them; people, change and governance work is not mislabelled as a model skill.</p>
<a href="https://www.oecd.org/en/publications/oecd-framework-for-the-classification-of-ai-systems_cb6d9eca-en.html" target="_blank" rel="noreferrer">OECD classification ↗</a> · <a href="https://airc.nist.gov/airmf-resources/airmf/5-sec-core/" target="_blank" rel="noreferrer">NIST AI RMF ↗</a> · <a href="https://www.iso.org/standard/74296.html" target="_blank" rel="noreferrer">ISO terminology ↗</a> · <a href="https://sfia-online.org/en/tools-and-resources/ai-skills-framework/ai-skills-framework-home" target="_blank" rel="noreferrer">SFIA AI skills ↗</a>
</details>
</section>
<section class="brief-section">
<div class="brief-section-head">
<span class="label">Where and why it will be used</span>
<small>Context changes the checks—not the facts about a model</small>
</div>
<div class="context-grid">
<label class="context-field">
<span class="label">Business goal</span>
<select class="select" id="business-goal">
</select>
</label>
<label class="context-field">
<span class="label">Industry</span>
<select class="select" id="industry">
</select>
</label>
<label class="context-field">
<span class="label">Knowledge area</span>
<select class="select" id="domain">
</select>
</label>
<label class="context-field">
<span class="label">Risk level</span>
<select class="select" id="risk-level">
</select>
</label>
</div>
<details class="taxonomy-note">
<summary>Where these categories come from</summary>
<p>Plain-language choices are adapted from widely used frameworks. They help describe the application; they do not claim that a model is automatically better for an industry.</p>
<a href="https://unstats.un.org/unsd/classifications/Econ/isic" target="_blank" rel="noreferrer">UN industry categories ↗</a> · <a href="https://www.apqc.org/process-frameworks" target="_blank" rel="noreferrer">APQC process framework ↗</a> · <a href="https://www.uis.unesco.org/en/methods-and-tools/isced" target="_blank" rel="noreferrer">UNESCO fields of study ↗</a> · <a href="https://www.oecd.org/en/publications/frascati-manual-2015_9789264239012-en.html" target="_blank" rel="noreferrer">OECD research fields ↗</a>
</details>
</section>
<section class="brief-section">
<div class="brief-section-head">
<span class="label">Choose a plan style</span>
<small>Six common starting points</small>
</div>
<div class="plan-style-grid" id="primary-styles">
</div>
<details class="signal-note">
<summary>How ecosystem visibility and capability range are measured</summary>
<p>
<strong>Visible ecosystem reach</strong> describes what this application can observe across public sources: source appearances, hosted listings, ways to run a model, Ollama availability, Hugging Face downloads where available, and a dated OpenRouter usage snapshot. It does not count total users, measure reliability or prove production use.</p>
<p>
<strong>Broad capability range</strong> asks whether fewer versatile models can cover the work. <strong>Focused specialist team</strong> asks whether several efficient specialists can cover it together. Specialists are judged on their own job. Missing capabilities lower a score but do not hide a model.</p>
<p>Model fit, source confidence, ecosystem visibility and measured performance are shown separately. These signals create a shortlist; they are not proof that a model gives better answers. The advisor has no hard-coded winning model or preferred provider.</p>
<a href="https://openrouter.ai/rankings" target="_blank" rel="noreferrer">OpenRouter usage source · data through 17 Aug 2026 · CC BY 4.0 ↗</a>
</details>
<label class="context-field more-style">
<span class="label">Other useful plan styles</span>
<select class="select" id="other-style">
</select>
</label>
</section>
<section class="brief-section">
<div class="brief-section-head">
<span class="label">Requirements and limits</span>
</div>
<div class="switches">
<label class="switch">
<span>
<strong>Keep data in a controlled setup</strong>
<small>Prefer models that can run in a private or local setup.</small>
</span>
<input id="data-control" type="checkbox">
</label>
<label class="switch">
<span>
<strong>Prefer downloadable models</strong>
<small>Prefer models whose weights can be downloaded.</small>
</span>
<input id="open-preferred" type="checkbox">
</label>
<label class="switch">
<span>
<strong>Use different providers</strong>
<small>Reduce reliance on only one company.</small>
</span>
<input id="multi-vendor" type="checkbox" checked>
</label>
</div>
</section>
</aside>
<section class="route">
<div class="route-head">
<div>
<div class="eyebrow">02 · Leading candidate model teams</div>
<h2 id="route-title">
</h2>
</div>
<div class="save-plan-actions">
<button class="save" id="save-blueprint">Save this team plan</button>
<button type="button" id="saved-markdown-link" hidden>Download draft specification (.md)</button>
</div>
</div>
<div class="team-compare" id="team-compare">
</div>
<div class="team-hypothesis"><strong>These are candidates to test, not proven winners.</strong> A group of focused, lower-cost or locally run models may cover the same application as one large model. Their scores do not simply add up: routing, coordination, cost, latency and failure handling must be tested on the same real examples.</div>
<div id="design-denominators">
</div>
<div class="stats" id="route-stats">
</div>
<div class="team-intro">
<div>
<div class="eyebrow" id="selected-style-label">Selected plan</div>
<h3 id="team-title">
</h3>
<p id="team-description">
</p>
</div>
</div>
<section class="quality-cost-plan" id="quality-cost-plan" aria-live="polite">
</section>
<section class="team-evaluation" id="team-evaluation" aria-live="polite">
</section>
<div class="ranking-key">
<strong>How to read this:</strong>
<span>Primary = the candidate main model that users meet</span>
<span id="rank-range">Each job has its own model order</span>
<span>Raw-score gaps below 1 point use visible evidence, specialisation and ecosystem tie-breakers</span>
<span>Models within 3 raw-score points can be chosen by the user without changing the scores</span>
</div>
<div class="node">
<span class="index">APPLICATION BRIEF</span>
<strong id="brief-summary">What users need</strong>
<small id="context-summary">Capabilities · context · risk · limits</small>
</div>
<div class="arrow">↓</div>
<div class="node router">
<span class="index">BUILD THE TEAM</span>
<strong>Match one model to each job</strong>
<small>Primary model · routine work · specialists · checker · fallback choices</small>
</div>
<div class="arrow">↓</div>
<div class="role-list" id="route-list">
</div>
<div class="tool-panel">
<div class="eyebrow">Tools outside the model team</div>
<h3>Other parts this application may need</h3>
<p>Some jobs need search, maps, databases, safety checks or human review. A language model cannot replace these systems.</p>
<div class="tool-list" id="tool-list">
</div>
</div>
<div class="arrow">↓</div>
<div class="node">
<span class="index">TEST BEFORE LAUNCH</span>
<strong>Use real examples from this application</strong>
<small>Compare quality, cost, speed, safety and failure cases before making a final choice.</small>
</div>
<div class="note">
<strong>Advisor summary</strong>
<p id="readout">
</p>
</div>
</section>
</div>
</section>
<section class="page inner" id="saved-page">
<div class="page-head saved-page-head">
<div>
<div class="eyebrow">Saved team plans and draft specifications</div>
<h1>Reopen, compare, edit, export or delete your plans.</h1>
<p class="lede">Every saved team includes the application brief, model choices, evidence readings, trial results and an editable Markdown specification. The draft fills in known facts and leaves decisions for you to complete.</p>
</div>
<div class="registry-stat">
<strong id="saved-plan-count">0</strong>
<span>saved team plans</span>
</div>
</div>
<div class="saved-toolbar">
<span id="saved-plan-status">Open this tab to load saved plans.</span>
<button type="button" id="refresh-saved-plans">Refresh</button>
</div>
<section class="saved-plan-compare" id="saved-plan-compare">
</section>
<div class="saved-plans-layout">
<div class="saved-plan-list" id="saved-plan-list">
</div>
<section class="saved-plan-detail" id="saved-plan-detail">
</section>
</div>
</section>
<section class="page inner" id="explore-page">
<div class="page-head">
<div>
<div class="eyebrow">Catalogue supported by official provider sources</div>
<h1>Explore the model catalogue.</h1>
<p class="lede">Official provider sources support each model’s name, current status and stated capabilities. The comparison scores are rule-based estimates until they are tested on real work.</p>
</div>
<div class="registry-stat">
<strong id="match-count">0</strong>
<span id="match-label">0 of {{MODEL_COUNT}} distinct model variants</span>
</div>
</div>
<div id="explore-denominators">
</div>
<section class="catalogue-language" aria-labelledby="catalogue-language-title">
<div>
<div class="eyebrow">What the {{MODEL_COUNT}} entries represent</div>
<h2 id="catalogue-language-title">How the {{MODEL_COUNT}} model variants are organised.</h2>
<p>The {{MODEL_COUNT}} count refers to distinct model variants, not companies, product names or every name used by a website or API. A model family can contain several variants. Other sources may use extra names for the same variant. ChatGPT is an OpenAI product that can offer different models; it is not counted as one model variant here.</p>
</div>
<div class="catalogue-hierarchy" aria-label="Example model hierarchy">
<div class="catalogue-level">
<strong>Provider</strong>
<span>OpenAI</span>
</div>
<span class="catalogue-arrow" aria-hidden="true">→</span>
<div class="catalogue-level">
<strong>Model family</strong>
<span>GPT-5.6</span>
</div>
<span class="catalogue-arrow" aria-hidden="true">→</span>
<div class="catalogue-level example">
<strong>Distinct model variants</strong>
<span>Sol · Terra · Luna</span>
</div>
<span class="catalogue-arrow" aria-hidden="true">→</span>
<div class="catalogue-level">
<strong>Other names and versions</strong>
<span>API names, dated releases and hosted copies</span>
</div>
</div>
<div class="term-grid">
<div class="term-card">
<strong>Official source confirmed</strong>
<span>The provider page was read on the review date. The model name, status and stated capabilities matched this record.</span>
</div>
<div class="term-card">
<strong>Why it is included</strong>
<span>The model has a current API or official downloadable weights, clear provider documentation and a useful language-model job.</span>
</div>
<div class="term-card">
<strong>One record per distinct variant</strong>
<span>The app gives each separately useful model option one main record. API aliases, dated releases and hosted copies link to it.</span>
</div>
<div class="term-card">
<strong>Rule-based shortlist</strong>
<span>The app compares variants using the user's application choices. The relative score helps make a shortlist; it does not prove real-world performance.</span>
</div>
</div>
</section>
<section class="edge-coverage" aria-labelledby="edge-coverage-title">
<div class="edge-coverage-copy">
<div class="eyebrow">Compact and edge coverage</div>
<h2 id="edge-coverage-title">Language models are one layer of an edge system.</h2>
<p>These labels help find models that can run near the data. “Edge” can mean a phone, gateway, industrial computer or accelerator—not necessarily a tiny sensor. A detector or tracker may find an object; a vision-language model can describe the scene; device software must still provide identity, position, timing and control.</p>
</div>
<div class="edge-coverage-stats">
<div><strong id="small-model-count">—</strong><span>small language models</span></div>
<div><strong id="edge-model-count">—</strong><span>edge language models</span></div>
<div><strong id="edge-vision-model-count">—</strong><span>edge vision-language models</span></div>
<div><strong id="device-action-model-count">—</strong><span>device-action specialists</span></div>
</div>
<div class="edge-layer-table" role="table" aria-label="Layers of an edge AI application">
<div role="row"><strong role="columnheader">Layer</strong><strong role="columnheader">What it does</strong><strong role="columnheader">Examples</strong></div>
<div role="row"><span role="cell">Sensors and identity</span><span role="cell">Produces authoritative events, positions and identifiers</span><span role="cell">RFID, BLE, UWB, GNSS, cameras</span></div>
<div role="row"><span role="cell">Runtime and perception</span><span role="cell">Runs models; detects, classifies and tracks</span><span role="cell">LiteRT, OpenVINO, Jetson, YOLO</span></div>
<div role="row"><span role="cell">Language or vision-language model</span><span role="cell">Explains, reasons, calls approved actions or coordinates work</span><span role="cell">Gemma, Qwen3-VL, Phi, compact GPT</span></div>
<div role="row"><span role="cell">Workflow and people</span><span role="cell">Applies rules, approvals, fallbacks and human review</span><span role="cell">IoT platform, alerting, audit and operators</span></div>
</div>
</section>
<div class="filters">
<input class="search" id="model-search" placeholder="Search model, provider, family or capability" aria-label="Search models">
<select class="select" id="provider-filter">
</select>
<select class="select" id="case-filter">
</select>
<select class="select" id="deployment-filter">
<option value="all">All ways to run a model</option>
<option value="hosted">Provider-hosted</option>
<option value="open-weight">Downloadable (open-weight)</option>
<option value="private cloud">Private cloud</option>
<option value="edge">On-device / edge</option>
</select>
<select class="select" id="model-profile-filter">
<option value="all">All compact and edge profiles</option>
<option value="small-language-model">Small language models (SLMs)</option>
<option value="edge-language-model">Language models for edge devices</option>
<option value="edge-vision-language-model">Vision-language models for edge devices</option>
<option value="device-action-model">On-device action models</option>
</select>
</div>
<div class="model-list" id="model-list">
</div>
</section>
<section class="page inner" id="registry-page">
<div class="page-head">
<div>
<div class="eyebrow">Listings collected from several sources</div>
<h1>Compare what different model lists contain.</h1>
<p class="lede">Six sources provide model listings and technical information. Every listing keeps its source label. A model variant enters the main catalogue only after an official provider page supports it.</p>
</div>
<div class="registry-stat">
<strong id="live-endpoint-count">—</strong>
<span>source listings</span>
</div>
</div>
<div class="registry-rationale">
<article class="rationale-card">
<span>01</span>
<strong>Keep source types separate</strong>
<p>Model marketplaces, hosting services and information lists answer different questions. Their counts stay separate before similar names are grouped.</p>
</article>
<article class="rationale-card">
<span>02</span>
<strong>Show where sources agree</strong>
<p>A model name counts as shared when it appears in at least two sources after similar names are grouped. The app shows which sources contain it.</p>
</article>
<article class="rationale-card">
<span>03</span>
<strong>Check an official source before adding</strong>
<p>Even agreement across all six sources is not enough. An official provider page must support the model’s name, current status and stated capabilities before it enters the main catalogue.</p>
</article>
</div>
<div class="live-registry-summary" id="live-registry-summary">
</div>
<section class="overlap-panel">
<div class="overlap-head">
<div>
<div class="eyebrow">Source agreement</div>
<h2>Models found in more than one source</h2>
<p>Agreement is measured after similar model names are grouped. It shows that several sources list a model; it does not prove quality, current support or provider approval.</p>
</div>
<div class="overlap-rate">
<strong id="overlap-rate">—</strong>
<span>model names found in 2+ sources</span>
</div>
</div>
<div class="overlap-grid">
<div class="overlap-block">
<strong>How many sources list each model</strong>
<div class="overlap-distribution" id="overlap-distribution">
</div>
</div>
<div class="overlap-block">
<strong>Where two sources list the same models</strong>
<div class="overlap-pairs" id="overlap-pairs">
</div>
</div>
</div>
<div class="source-ledger" id="source-ledger">
</div>
</section>
<div class="registry-controls">
<input class="search" id="registry-search" placeholder="Search model name or source label" aria-label="Search model listings">
<select class="select" id="registry-source">
<option value="all">All sources</option>
</select>
<select class="select" id="registry-provider">
<option value="all">All provider names</option>
</select>
<select class="select" id="registry-classification">
<option value="all">All source listings</option>
<option value="multi-source">Found in 2+ sources</option>
<option value="possible-match">Possible catalogue match</option>
<option value="review">Needs review</option>
<option value="excluded">Listings outside this catalogue</option>
</select>
<button id="registry-refresh-now" type="button">Refresh sources</button>
</div>
<div class="live-registry-meta">
<span id="live-registry-result">Open this tab to load the latest saved updates.</span>
<span>Checks every 60 seconds while open · sources update every 6–12 hours</span>
</div>
<div class="endpoint-list" id="endpoint-list" aria-live="polite">
</div>
<div class="registry-pager">
<button id="registry-prev" type="button">Previous</button>
<span id="registry-page-state">—</span>
<button id="registry-next" type="button">Next</button>
</div>
<div class="truth">
<strong>What these sources tell us</strong>
<p>Hosting and marketplace lists show where models may be available. Information lists help compare technical details. Official provider pages support the main catalogue records. None of these sources proves which model will perform best on a real task.</p>
</div>
</section>
<section class="page inner" id="audit-layer-page">
  <div class="page-head">
<div>
<div class="eyebrow">Check the catalogue against official sources</div>
<h1>See what is included and what still needs review.</h1>
<p class="lede">Official provider pages support the {{MODEL_COUNT}} distinct model variants in the main catalogue. Other lists can reveal possible missing models, extra names and hosted versions. Their counts stay separate.</p>
</div>
<div class="registry-stat">
<strong id="coverage-percent">—</strong>
<span>model variants checked</span>
</div>
</div>
<div id="audit-denominators">
</div>
<section class="layer-map" aria-label="How the four information layers differ">
<article>
<span>01</span>
<strong>Recommendation ranking</strong>
<p>Orders model variants for each team job using the user’s needs and selected plan style.</p>
</article>
<article>
<span>02</span>
<strong>Source-evidence layer</strong>
<p>Records the official provider pages supporting catalogue names, status and stated capabilities.</p>
</article>
<article>
<span>03</span>
<strong>Registry-snapshot layer</strong>
<p>Keeps the latest listings from six discovery sources so aliases, availability and overlap can be compared.</p>
</article>
<article>
<span>04</span>
<strong>Coverage-audit layer</strong>
<p>Checks the main catalogue against those records and makes gaps, extra names and review work visible.</p>
</article>
</section>
  <div class="scope-contract">
<section class="scope-card primary">
<div class="eyebrow">What this catalogue includes</div>
<h2>Models useful for application decisions</h2>
<p id="scope-statement">
</p>
<p id="scope-sla" style="margin-top:8px">
</p>
<span class="scope-version" id="scope-version">
</span>
</section>
<section class="scope-card">
<div class="eyebrow">Items not included</div>
<div class="scope-list" id="scope-list">
</div>
</section>
</div>
  <div class="deepseek-callout evidence-callout">
<div>
<strong id="evidence-state">Ongoing official-source check</strong>
<p>The app checks one official provider source during each update. If a page changes, it creates an item for review. It never changes model advice automatically.</p>
</div>
<button id="check-source" type="button">Check next official source</button>
</div>
  <section class="scope-card" style="margin: 0 0 18px">
<div class="eyebrow">How well sourced the catalogue is</div>
<h2>Not every entry is equally confirmed</h2>
<p class="lede">An entry is <em>confirmed</em> when its provider page was read on the review date and the name, status and stated capabilities matched. Entries carrying over from an earlier sweep are marked <em>recheck pending</em>. Source confidence is shown separately and does not add performance points to the ranking.</p>
<div class="coverage-summary" id="verification-summary">
</div>
</section>
  <section class="scope-card" style="margin: 0 0 18px">
<div class="eyebrow">Measured performance evidence</div>
<h2>Published benchmark results, and who has them</h2>
<p class="lede">Where a credible published benchmark result exists for a model, it replaces the general quality estimate for that job and carries more weight in the ranking. Coverage is thin and uneven, and the reason matters: a model has published results because its vendor ran and published them, not because it is better. Read the coverage figures below as a map of who publishes benchmarks, not of who performs well.</p>
<div class="coverage-summary" id="evidence-summary">
</div>
<div id="evidence-bias-note"></div>
<details>
<summary>Which benchmarks are accepted, and what each one cannot show</summary>
<div class="team-check-grid" id="protocol-list"></div>
</details>
<details>
<summary>Results excluded because published figures disagree</summary>
<p class="trial-note">When two credible sources report materially different figures for the same model on the same benchmark, no measured result is recorded. The disagreement is shown here instead of being averaged into a number nobody published.</p>
<div class="retired-list" id="contested-list"></div>
</details>
</section>
  <div class="coverage-summary" id="coverage-summary">
</div>
<div class="coverage-matrix" id="coverage-matrix">
</div>
  <section class="registry-panel">
<div class="registry-panel-head">
<div>
<div class="eyebrow">Extra listings from six sources</div>
<h2>Compare extra model listings</h2>
<p>The app groups similar model names from six updated sources. Models found in several sources show where lists agree. Models found in only one source may need more checking. No extra listing can be added to the main catalogue or ranked automatically.</p>
</div>
<div class="registry-actions">
<button id="refresh-registry" type="button">Refresh sources</button>
</div>
</div>
<div class="registry-summary" id="registry-summary">
</div>
<div class="registry-queue" id="registry-queue">
</div>
<small class="registry-status" id="registry-status">Waiting for the first comparison of source listings.</small>
</section>
  <div class="truth">
<strong>What this check can prove</strong>
<p>This check confirms what is listed and where the information came from. Quality, speed and cost scores are rule-based estimates until they are tested on real tasks.</p>
</div>
  <section class="watchlist-panel">
<div class="eyebrow">Providers still being checked</div>
<h2>Visible, but not yet included</h2>
<p class="lede">These providers stay visible while the app checks which current models they officially offer and whether those models are useful for applications.</p>
<div class="watchlist-grid" id="watchlist-grid">
</div>
</section>
</section>
<section class="page inner" id="updates-page">
<div class="page-head">
<div>
<div class="eyebrow">How the catalogue and planning framework stay current</div>
<h1>Updates are checked before they change the advice.</h1>
</div>
<div class="registry-stat">
<strong id="published-count">0</strong>
<span>distinct model variants supported by official sources</span>
</div>
</div>
<div class="loop">
<div class="loop-step">
<span>01</span>
<strong>Find</strong>
<small>Collect model lists and official provider pages</small>
</div>
<div class="loop-step">
<span>02</span>
<strong>Compare</strong>
<small>Group similar names and show where sources agree</small>
</div>
<div class="loop-step">
<span>03</span>
<strong>Confirm</strong>
<small>Check model names, categories and stated capabilities</small>
</div>
<div class="loop-step">
<span>04</span>
<strong>Test</strong>
<small>Test complete model teams on real application work</small>
</div>
</div>
<div class="update-grid">
<div class="panel">
<div class="panel-head">
<div>
<div class="eyebrow">Recent application updates</div>
<h2>What changed and why</h2>
</div>
<span class="fresh">Reviewed {{REVIEWED_LABEL}}</span>
</div>
<div class="events" id="events">
</div>
</div>
<aside class="panel">
<div class="eyebrow">Catalogue coverage</div>
<h2 id="provider-total">
</h2>
<p>Model availability, technical information, official provider pages and comparison scores are reported separately. Agreement between sources is useful, but it does not make a listing automatically correct.</p>
<div class="audit">
<div>
<strong>3</strong>
<span>model marketplace lists</span>
</div>
<div>
<strong>1 + 2</strong>
<span>hosting + information lists</span>
</div>
<div>
<strong>{{PROVIDER_COUNT}}</strong>
<span>official provider pages</span>
</div>
</div>
<div class="provider-counts" id="provider-counts">
</div>
</aside>
</div>
<section class="panel" style="margin: 0 0 22px">
<div class="panel-head">
<div>
<div class="eyebrow">Removed from the catalogue</div>
<h2>Models a provider has stopped listing</h2>
</div>
<span class="fresh" id="retired-count">—</span>
</div>
<p>These entries were removed because the provider page no longer lists them. They stay visible here so a falling model count is explainable, and so anyone who planned around one can see what replaced it.</p>
<div class="retired-list" id="retired-list">
</div>
</section>
<div class="framework-panel">
<article class="framework-card">
<span>Industry context</span>
<strong>UN ISIC</strong>
<small>Plain-language industry choices are mapped to a widely used international structure.</small>
<a href="https://unstats.un.org/unsd/classifications/Econ/isic" target="_blank" rel="noreferrer">Open source ↗</a>
</article>
<article class="framework-card">
<span>Business goals and work</span>
<strong>APQC Process Classification Framework</strong>
<small>Business-process choices are reviewed against current cross-industry process categories.</small>
<a href="https://www.apqc.org/process-frameworks" target="_blank" rel="noreferrer">Open source ↗</a>
</article>
<article class="framework-card">
<span>Learning and knowledge</span>
<strong>UNESCO ISCED-F</strong>
<small>Knowledge-area wording is compared with international fields of education and training.</small>
<a href="https://www.uis.unesco.org/en/methods-and-tools/isced" target="_blank" rel="noreferrer">Open source ↗</a>
</article>
<article class="framework-card">
<span>Research domains</span>
<strong>OECD Fields of Research and Development</strong>
<small>Scientific and technical domains are reviewed against the Frascati Manual structure.</small>
<a href="https://www.oecd.org/en/publications/frascati-manual-2015_9789264239012-en.html" target="_blank" rel="noreferrer">Open source ↗</a>
</article>
</div>
<div class="truth">
<strong>How updates work</strong>
<p>Model sources are checked frequently. Industry, business-process and knowledge categories are reviewed when their source frameworks change and at least once each quarter. A model-team rule is reviewed when model availability, cost, capabilities or test results change. Updates create visible review items; they do not silently rewrite saved plans.</p>
</div>
</section>
<section class="page inner" id="about-page">
<div class="page-head about-head">
<div>
<div class="eyebrow">A guide to the advisor</div>
<h1>What each tab does—and what it cannot prove.</h1>
<p class="lede">Use the advisor to form a clear, testable model-team plan. Its source checks and scores help create a shortlist. They do not replace trials using real work from your application.</p>
</div>
<div class="about-start">
<strong>Start here</strong>
<span>Application design</span>
<small>Describe the work before comparing models.</small>
</div>
</div>
<div class="about-grid">
<article class="about-card">
<span class="about-number">01</span>
<div>
<h2>Application design</h2>
<p>Describe the application, choose the Skills it needs, add its context and compare six main plan styles. This tab builds candidate teams, explains close calls, lets you choose another model inside the three-point choice band, and gives you team checks and trials to complete.</p>
<small><strong>It cannot prove:</strong> that a candidate team is the best one before you test the whole team on your own tasks.</small>
</div>
</article>
<article class="about-card">
<span class="about-number">02</span>
<div>
<h2>Saved plans</h2>
<p>Sign in with a secure, one-time email link. Then reopen or compare your saved teams, edit the plan name and draft application specification, export the specification as a Markdown file, or permanently delete a plan you no longer need. Each account sees only its own plans.</p>
<small><strong>It cannot do:</strong> complete the fill-in decisions or prove that the saved team works. The draft keeps the advisor's facts separate from choices and trial results you must supply.</small>
</div>
</article>
<article class="about-card">
<span class="about-number">03</span>
<div>
<h2>Account</h2>
<p>See the signed-in identity, free account tier, saved-plan count and private PDF or DOCX project files. Download or permanently delete an original file, or sign out.</p>
<small><strong>It cannot do:</strong> recover a deleted file or make the Supabase testing email service suitable for general users. Custom SMTP is required before public release.</small>
</div>
</article>
<article class="about-card">
<span class="about-number">04</span>
<div>
<h2>Model explorer</h2>
<p>Browse every distinct model variant in the main catalogue. Filter the list and open the provider or Ollama page where available.</p>
<small><strong>It cannot prove:</strong> that a model will be a good fit simply because it has many capabilities or appears in several places.</small>
</div>
</article>
<article class="about-card">
<span class="about-number">05</span>
<div>
<h2>Live registry</h2>
<p>Compare model names found across six outside discovery sources. See where lists overlap, where a name may match the main catalogue and where more checking is needed.</p>
<small><strong>It cannot prove:</strong> that an outside listing is official, current or high quality. Source overlap is a discovery clue, not confirmation.</small>
</div>
</article>
<article class="about-card">
<span class="about-number">06</span>
<div>
<h2>Coverage check</h2>
<p>See official provider pages, review dates, sourcing state and the four application layers: ranking, source evidence, registry snapshots and coverage audit.</p>
<small><strong>It cannot prove:</strong> measured quality, speed or reliability. It confirms what is listed, what was checked and where the information came from.</small>
</div>
</article>
<article class="about-card">
<span class="about-number">07</span>
<div>
<h2>Update centre</h2>
<p>Read what changed, why it changed, which models were removed and how the catalogue and planning categories are kept current.</p>
<small><strong>It cannot do:</strong> silently change a saved plan. A saved plan keeps the catalogue, scoring and category versions used to create it.</small>
</div>
</article>
</div>
<section class="about-decision" id="about-decision-flow" aria-labelledby="about-decision-title">
<div class="about-decision-head">
<div>
<div class="eyebrow">How model choices are made</div>
<h2 id="about-decision-title">The application brief changes the shortlist.</h2>
<p>No provider or model is the default winner. The advisor compares every current model variant separately for each job, then asks the user to test the most suitable candidates.</p>
</div>
<span>Shortlist → compare → trial → decide</span>
</div>
<div class="decision-flow" aria-label="Model choice decision flow">
<article><b>1</b><strong>Describe the application</strong><small>Starting type, selected Skills, context, risk, limits and plan style</small></article>
<i aria-hidden="true">→</i>
<article><b>2</b><strong>Define the jobs</strong><small>Primary, planning, routine work, specialists, checking and fallback</small></article>
<i aria-hidden="true">→</i>
<article><b>3</b><strong>Set the job policy</strong><small>Give every job a quality target, cost weight, route and escalation rule</small></article>
<i aria-hidden="true">→</i>
<article><b>4</b><strong>Keep readings separate</strong><small>Model fit, source confidence, ecosystem visibility and measured performance</small></article>
<i aria-hidden="true">→</i>
<article><b>5</b><strong>Explain close choices</strong><small>Visible tie-breakers below 1 point; user choice below 3 points</small></article>
<i aria-hidden="true">→</i>
<article><b>6</b><strong>Check the whole team</strong><small>Coverage, overlap, provider concentration, hand-offs, routing and failures</small></article>
<i aria-hidden="true">→</i>
<article><b>7</b><strong>Trial before deciding</strong><small>Use the same real examples to compare quality, cost, speed, safety and reliability</small></article>
</div>
<div class="decision-table-wrap">
<table class="decision-table">
<thead><tr><th>Choice or evidence</th><th>What it changes</th><th>What it does not prove</th></tr></thead>
<tbody>
<tr><th>Starting application type</th><td>Suggests a useful first set of Skills.</td><td>That the suggestion is complete or fixed.</td></tr>
<tr><th>Selected Skills</th><td>Creates the jobs and requirements used for model fit. Each team member traces those Skills to stated capabilities, recorded tests and visible gaps.</td><td>That a stated match is measured performance for your work.</td></tr>
<tr><th>Job quality and cost policy</th><td>Sets a soft quality target and gives routine work more cost weight than difficult, specialist or checking work.</td><td>That token volume alone equals useful or high-quality work.</td></tr>
<tr><th>Context and risk</th><td>Changes the examples, checks, controls and human review needed.</td><td>That one model is generally best for an industry.</td></tr>
<tr><th>Plan style</th><td>Changes the importance of quality, cost, visibility, breadth or specialisation.</td><td>That a small score difference is meaningful.</td></tr>
<tr><th>Sources and measurements</th><td>Change confidence, ecosystem visibility and measured-performance readings.</td><td>That public visibility equals users, reliability or quality.</td></tr>
<tr><th>Whole-team trials</th><td>Provide the evidence needed for the final decision.</td><td>That results will stay the same when the work or models change.</td></tr>
</tbody>
</table>
</div>
</section>
<section class="about-skills" aria-labelledby="about-skills-title">
<div class="about-skills-intro">
<div class="eyebrow">A structured Skills checklist</div>
<h2 id="about-skills-title">Choose Skills by asking eight simple questions.</h2>
<p>The list is organised around the work an application must complete—not an industry label or a favourite model. Start with the suggested Skills, remove anything unnecessary, and add anything needed for a successful result. Hover, focus or tap each title for a definition, examples and a boundary.</p>
</div>
<div class="about-skill-map">
<article><strong>Understand inputs</strong><span>What information will it receive?</span><small>Text, documents, images, video, voice or structured data</small></article>
<article><strong>Find and remember</strong><span>What knowledge must it reach or retain?</span><small>Private knowledge, current sources or approved memory</small></article>
<article><strong>Analyse and decide</strong><span>What judgement or calculation is required?</span><small>Reasoning, scenarios, numbers, classification, ranking or recommendations</small></article>
<article><strong>Create and communicate</strong><span>What must it produce?</span><small>Explanations, languages, code, visual interpretation or creative support</small></article>
<article><strong>Take action</strong><span>What must happen beyond an answer?</span><small>Tools, workflows, repeated work, monitoring or alerts</small></article>
<article><strong>Improve and operate</strong><span>How will it improve a process and remain dependable?</span><small>Process improvement, data quality, lineage, testing, drift and service monitoring</small></article>
<article><strong>Verify and protect</strong><span>What must be checked or controlled?</span><small>Claims, rules, standards, sensitive data, exceptions or escalation</small></article>
<article><strong>Work in place</strong><span>Does location or connectivity change the work?</span><small>Maps, routes, field work, mobile use, edge devices or offline operation</small></article>
</div>
<p class="about-framework-note">This plain-language structure is informed by the <a href="https://www.oecd.org/en/publications/oecd-framework-for-the-classification-of-ai-systems_cb6d9eca-en.html" target="_blank" rel="noreferrer">OECD AI-system classification</a>, <a href="https://airc.nist.gov/airmf-resources/airmf/5-sec-core/" target="_blank" rel="noreferrer">NIST AI Risk Management Framework</a>, <a href="https://www.iso.org/standard/74296.html" target="_blank" rel="noreferrer">ISO/IEC 22989 terminology</a> and <a href="https://sfia-online.org/en/tools-and-resources/ai-skills-framework/ai-skills-framework-home" target="_blank" rel="noreferrer">SFIA's task-oriented skills</a>. The supplied AI-capability matrix, business-process automation examples and SFIA process-reengineering map were reviewed for missing application behaviours. They are examples, not a complete standard. Specialised domain activities remain examples until the catalogue has evidence that can distinguish models for them.</p>
</section>
<section class="about-workflow" aria-labelledby="about-workflow-title">
<div>
<div class="eyebrow">A useful workflow</div>
<h2 id="about-workflow-title">From idea to a tested model team</h2>
</div>
<ol>
<li><strong>Describe</strong><span>Start with the application, the Skills it needs and its operating limits.</span></li>
<li><strong>Compare</strong><span>Review the candidate teams and inspect any models that are too close to call.</span></li>
<li><strong>Check</strong><span>Use the explorer, registry and coverage tabs to inspect sources, links and gaps.</span></li>
<li><strong>Trial</strong><span>Run the same five team trials for every serious candidate, including hand-offs and failures.</span></li>
<li><strong>Decide</strong><span>Record results, save the team, complete its draft specification and revisit it when a relevant update appears.</span></li>
</ol>
</section>
<div class="about-terms">
<article><strong>Candidate does not mean proven winner.</strong><span>It is a model or team worth testing next.</span></article>
<article><strong>Source confirmed does not mean performance tested.</strong><span>It means the official provider page supported the recorded facts when checked.</span></article>
<article><strong>A close call means less than one point.</strong><span>The raw order is kept. Measured evidence, application specialisation and then ecosystem reach provide visible tie-breakers; if they are also level, the result stays unresolved.</span></article>
<article><strong>Trials are recorded by the user.</strong><span>The advisor does not call model APIs or run the application tests for you.</span></article>
<article><strong>Useful-work efficiency is not token throughput.</strong><span>It means successful tasks meeting the output rubric per total dollar and elapsed minute, including tools, retries, fallbacks and corrections.</span></article>
</div>
</section>
<section class="page inner account-page" id="account-page">
<div class="page-head account-page-head">
<div>
<div class="eyebrow">Your Advisor account</div>
<h1>Plans and project files that belong to you.</h1>
<p class="lede">Your passwordless sign-in controls access to saved plans and original PDF or DOCX project files. Only your signed-in account can list, download or delete them.</p>
</div>
<button type="button" class="account-back" id="account-back">Back to application design</button>
</div>
<div class="account-grid">
<section class="account-card">
<div class="eyebrow">Profile</div>
<h2 id="account-profile-email">Signed-in user</h2>
<dl>
<div><dt>Plan</dt><dd id="account-tier">Free</dd></div>
<div><dt>Sign-in method</dt><dd>Passwordless email link</dd></div>
<div><dt>Saved plans</dt><dd id="account-plan-count">Open Saved plans to view</dd></div>
</dl>
<button type="button" id="account-page-sign-out">Sign out</button>
</section>
<section class="account-card account-files-card">
<div class="account-files-head">
<div><div class="eyebrow">Project file storage</div><h2>Your uploaded documents</h2></div>
<button type="button" id="refresh-account-files">Refresh</button>
</div>
<p>PDF and DOCX files imported into a plan are kept in private account storage. Deleting a file does not delete a saved plan or its extracted brief.</p>
<div class="account-storage-summary"><strong id="account-file-count">0 files</strong><span id="account-storage-used">0 bytes stored</span></div>
<div class="account-file-list" id="account-file-list"><div class="account-file-empty">No project files have been stored yet.</div></div>
<p class="account-file-status" id="account-file-status" role="status"></p>
</section>
</div>
<section class="account-privacy">
<strong>Storage and privacy</strong>
<p>Files are kept in a private Supabase Storage bucket under your account ID. The Advisor places the complete extracted text in the saved Markdown source appendix and uses a bounded evidence set only for suggestions. Images, diagrams and scanned material still require review in the original file. You can download or permanently delete that original here.</p>
</section>
</section>
</main>
</div>
<dialog class="auth-dialog" id="auth-dialog" aria-labelledby="auth-title">
<form method="dialog" class="auth-dialog-close"><button type="submit" aria-label="Close sign in">×</button></form>
<div class="eyebrow">Your Advisor account</div>
<h2 id="auth-title">Sign in or create your account</h2>
<p>Receive a secure, one-time sign-in link by email. Signing in opens the Advisor and your private plans and files. The Advisor does not store passwords.</p>
<form id="auth-email-form">
<label for="auth-email">Email address</label>
<input id="auth-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com">
<button class="save" type="submit">Email me a sign-in link</button>
</form>
<p class="auth-status" id="auth-status" role="status"></p>
<small>New users receive a free account automatically. Google sign-in may be added later.</small>
</dialog>
<div class="toast" id="toast" role="status">
</div>
`;
