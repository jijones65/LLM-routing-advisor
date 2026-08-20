# LLM Application Routing Advisor — Product and Implementation Specification

**Specification version:** 2.1
**Current implementation baseline:** 19 August 2026 · catalogue `2026.08.19-1` · scoring `2026.08.19-1` · taxonomy `2026.08.19-3`
**Status:** Living specification for refinement, maintenance, and future rebuilds

## 1. Purpose

The LLM Application Routing Advisor helps a user design an AI application before choosing models. Its guiding principle is:

> Plan the application first. Choose models second.

The product turns an application brief into a proposed **model team**. It can recommend one broadly capable model or several models with separate jobs, such as planning, routine processing, coding, research, vision, voice, private work, and checking.

The advisor is a decision-support tool. It produces transparent shortlists and testable hypotheses. It must never imply that a rule-based score proves that one model is objectively best.

This specification follows a specification-engineering approach: define concepts, contracts, constraints, fallbacks, metrics, versioning, and acceptance tests before relying on implementation details. It was prompted by the project owner's reference to [“Specification Engineering: The New Skill After Prompt Engineering”](https://www.kdnuggets.com/specification-engineering-the-new-skill-after-prompt-engineering). A related accessible KDnuggets discussion recommends explicit contracts, modular boundaries, evaluation-driven iteration, fallbacks, metrics, and versioning rather than relying on a single prompt or untested assumption: [The Evolution From Prompt Engineering to Concept Engineering](https://www.kdnuggets.com/the-evolution-from-prompt-engineering-to-concept-engineering).

## 2. Intended users and language standard

The interface must be understandable to:

- High-school students
- University students
- Teachers and researchers
- Business and public-sector users
- International users who may use English as an additional language
- Technical users who want to inspect the underlying evidence

Use short sentences, familiar terms, and direct explanations. Define specialist terms at the point of use. Avoid unexplained terms such as “canonical,” “verified,” “curated,” “recommendation-ready,” or “proven.”

Preferred terminology:

- **Distinct model variant:** one separately useful model option, such as a particular model tier or size.
- **Model family:** related variants released under a broader name.
- **Provider:** the organisation responsible for the model.
- **Provider product:** a user-facing product, such as ChatGPT, that may offer several model variants.
- **Official provider documentation:** a first-party page that supports the model's name, status, and stated capabilities.
- **Rule-based shortlist:** a ranked comparison produced by documented rules, not proof of real-world superiority.
- **Small language model (SLM):** an officially described compact language model or a reviewed variant with roughly ten billion parameters or fewer. “Small” describes footprint, not proven quality.
- **Edge language model:** a language model whose official material supports local use on a phone, gateway, industrial computer or other edge computer. It does not imply that the model fits on a tiny sensor.
- **Edge vision-language model:** an edge-capable language model that can interpret images or video as well as text. It is not automatically a real-time detector or tracker.

## 3. Product principles

1. **Application requirements come first.** Model rankings must respond to what the application must do.
2. **Models form teams.** A model may be suitable for one job without being suitable for every job.
3. **Specialists are judged on their speciality.** A coding model is compared on coding-related requirements; a checker is compared on checking-related requirements.
4. **Missing capabilities do not automatically exclude a model.** They reduce its score and remain visible.
5. **There are no absolute scores.** Positions and percentages are relative to the current catalogue, application brief, plan style, and scoring version.
6. **Different kinds of evidence remain separate.** Model fit, source confidence, ecosystem visibility, and measured performance are not interchangeable.
7. **Public visibility is not market share.** Gateway listings, downloads, and platform traffic do not prove total users, quality, reliability, or production success.
8. **Provider diversity is enabled by default.** Its current threshold is provisional and must be visible and versioned.
9. **Estimates can improve.** Quality, speed, cost, capabilities, and thresholds must be versioned so they can be replaced by better measurements.
10. **Complete teams must be tested.** Specialist scores do not simply add together; routing and coordination can introduce cost, latency, and failure.
11. **High-quality output and cost optimisation belong together.** Every job has a soft output-quality target. Cost is reduced through job-specific routing and escalation, not by giving every task to the cheapest model.
12. **Throughput means useful completed work.** Measure successful tasks meeting the output rubric per total cost and elapsed time, including tools, retries, fallbacks and human correction. Token volume alone is not quality or productivity.
13. **An edge application has several layers.** Sensors and identity, device runtimes, perception models, language or vision-language models, workflows and people remain separate so each part is chosen for its real job.

## 4. Main product areas

### 4.1 Application Design

The user defines an application and receives alternative model teams.

Inputs:

- Optional PDF or DOCX concept paper, application brief, requirements document or implementation specification in any layout, up to 8 MB
- Application type
- Skills the application needs
- Business goal
- Industry context
- Knowledge or scientific domain
- Risk level
- Data-control preference
- Downloadable-model preference
- Provider-diversity preference
- Plan style

Outputs:

- A reviewable brief inferred from the concept paper, where supplied
- Application requirements derived from the input
- Alternative model teams for six main plan styles
- Complete list of jobs and selected models for every team
- Detailed recommendation for the selected plan
- A skill-fit rationale for every proposed team member, including partial gaps and the distinction between stated capabilities and measured evidence
- Three fallback choices for every job
- Separate fit, source, visibility, and performance readings
- Provider and Ollama links where applicable
- External tools the application may require
- A reminder to test on real examples before launch

Project-document import requirements:

- Accept genuine PDF and DOCX files; reject renamed or unsupported files.
- Read the file only for the current import. Do not retain the original bytes.
- For PDFs, read the selectable text layer. If little text is present, explain that a scanned paper needs OCR rather than inventing a plan.
- Preserve DOCX heading levels and use named sections before phrase matching. Process at least 500,000 extracted characters so ordinary long specifications are not silently reduced to their opening pages.
- Recognise whether the source is a concept paper, application brief, requirements document or implementation specification and show that classification for review.
- Infer a starting application type, Skills, business goal, industry, knowledge area, risk and operating preferences. These remain editable suggestions; negated preferences such as “do not use a local model” must not be reversed.
- Extract bounded text for objective, context, users, inputs, outputs, constraints, out-of-scope work, evaluation criteria, edge cases and verification steps.
- Record the source heading or opening label and a mapping-confidence label for every populated draft area. Leave an area blank when a long structured document has no sufficiently clear section rather than substituting an unrelated phrase match.
- Detect and preserve an existing application-team architecture and model-per-role guidance. Advisor candidates must be labelled as a comparison or refinement layer, not as a silent replacement for a team already specified by the source.
- When the team is saved, retain the filename, extraction metadata and bounded inferred fields in the plan payload. Do not retain the complete source document.
- Prefill the matching Markdown specification fields, include a source-mapping table, and leave unsupported decisions as explicit `[Fill in: …]` items.
- Provide a downloadable Markdown concept-paper template based on the eight-part structure in the referenced specification-engineering article: objective, context, inputs, output format, constraints, evaluation criteria, edge cases and verification steps.

### 4.2 Model Explorer

The explorer presents all distinct model variants in the main catalogue.

Required features:

- Clear total count
- Search by model, provider, family, summary, and capability
- Filters for provider, capability, deployment method, SLMs, edge language models, edge vision-language models and device-action models
- Provider website link for every model
- Ollama link when the model is available on Ollama
- Status, context, modalities, deployment methods, stated capabilities, and usual jobs
- Transparent quality, speed, and cost estimates
- Visible public-source signals without presenting them as proof of quality

### 4.3 Live Registry

The Live Registry retains every model listing collected from the discovery sources. These records are not automatically ranked as catalogue models.

Current discovery sources:

1. Requesty model list
2. OpenRouter model list
3. Vercel AI Gateway
4. Hugging Face Inference catalogue
5. Models.dev
6. LiteLLM model catalogue

Required behaviour:

- Keep every source label
- Keep raw source listings separate from grouped identities
- Normalize likely aliases without claiming certainty
- Show how many sources contain a grouped model name
- Show pairwise overlap between sources
- Label records as possible catalogue matches, review items, exclusions, or multi-source identities
- Require official provider documentation before admission to the main catalogue
- Never treat source overlap as provider confirmation or performance evidence

The number of source records is dynamic and may be much larger than the main catalogue. The interface must always explain the different denominators.

### 4.4 Coverage Audit

The Coverage Audit compares the main catalogue against official provider pages.

It must show:

- Providers included
- Official provider pages
- Model variants listed by those providers
- Model variants present in the catalogue
- Possible gaps
- Items needing review
- Current, reviewed, changed, stale, and error states
- Providers still on the watchlist
- Scope rules and explicit exclusions

The audit confirms names, status, and stated capabilities. It does not confirm benchmark quality.

### 4.5 Update Center

The Update Center explains how the platform changes and records significant corrections.

Update loop:

1. **Find:** collect source lists and provider pages.
2. **Compare:** group similar names and show source overlap.
3. **Confirm:** check first-party names, status, and capability claims.
4. **Test:** evaluate models and complete teams on representative application work.

Updates must not silently rewrite saved application plans. Saved plans retain their scoring and catalogue version.

## 5. Application taxonomy

### 5.1 Application types

The baseline application types include:

- Knowledge assistant
- Customer support copilot
- Document intelligence
- Software engineering agent
- Research and evidence system
- Field operations assistant
- High-stakes decision support
- Business process improvement
- Product comparison tool
- Procurement and supplier analyst
- Meeting and action assistant
- Learning and tutoring assistant
- Sales and proposal assistant
- Compliance and policy review assistant
- Data insight and reporting assistant
- Content and localisation assistant
- Cybersecurity triage assistant
- Retail and commerce assistant
- Financial analysis assistant
- Scientific research assistant
- Art and design studio assistant
- Geospatial planning assistant
- Real-time asset tracking
- Predictive maintenance and condition monitoring
- Edge vision and safety monitoring

The taxonomy is extensible. Each application type provides a starting set of requirements that the user can modify.

The UI also accepts a plain-language custom application type of up to 100 characters. A custom name is a label, not an inferred capability claim. The selected suggested type continues to provide the starting Skills, and the user adjusts those Skills before the model team is built. The custom label, starter type, selected Skills, derived requirements, and taxonomy version are saved together.

### 5.2 Skills

Skills describe the work the application must complete. They are not model names, job titles, industry labels or claims of measured model performance. The starting application type suggests a first set; the user can add or remove any Skill before the team is built.

The baseline contains 37 choices grouped around eight plain-language questions:

1. **Understand inputs — What information will the application receive?**
   - Read text and documents
   - Understand images or video
   - Listen and speak
   - Work with tables and structured data
   - Use sensor or IoT data
2. **Find and remember — What knowledge must it reach or retain?**
   - Use private knowledge
   - Search current sources
   - Keep context across interactions
3. **Analyse and decide — What judgement, comparison or calculation is required?**
   - Make complex decisions
   - Compare or forecast scenarios
   - Calculate and analyse numbers
   - Classify, match or prioritise
   - Personalise or recommend
   - Detect anomalies, fraud or threats
   - Optimise routes, schedules or resources
   - Model or simulate systems
4. **Create and communicate — What must it produce for a person or another system?**
   - Write and explain
   - Work in many languages
   - Write and test code
   - Create images, media or designs
   - Create synthetic or test data
5. **Take action — What must happen beyond producing an answer?**
   - Use software and tools
   - Coordinate many steps
   - Run workflows and approvals
   - Connect systems and data
   - Repeat work at high volume
   - Monitor events and spot changes
6. **Improve and operate — How will it improve a process and remain dependable?**
   - Find and improve process steps
   - Check data quality and lineage
   - Test and monitor AI operation
7. **Verify and protect — What must be checked, controlled or escalated?**
   - Check claims and outputs
   - Apply policies, rules or standards
   - Handle sensitive data
   - Support human review and escalation
8. **Work in place — Do location, mobility or offline operation change the work?**
   - Use maps or geospatial data
   - Work in the field or offline
   - Support physical or edge systems

These user-facing choices map to internal capabilities such as reasoning, knowledge work, coding, retrieval, research, vision, voice, automation, private deployment, multilingual work, software agents, and safety/checking.

Every Skill control must show only its short title in the checklist. Hover, keyboard focus and tap must open an accessible pop-up containing:

- a short test for when to choose the Skill;
- concrete application examples; and
- a boundary that distinguishes it from a nearby Skill or states where a specialised tool, control or human remains necessary.

The taxonomy is an application-specific, plain-language synthesis informed by:

- OECD Framework for the Classification of AI Systems, especially the distinction between context, data/input, model, and task/output;
- NIST AI Risk Management Framework, especially the iterative Govern, Map, Measure, and Manage functions;
- ISO/IEC 22989 terminology and concepts for AI systems; and
- SFIA's task-oriented approach to describing skills and responsibility.

The project owner's supplied reference examples add three further design inputs:

- an AI-capabilities matrix spanning technical and domain examples;
- business-process automation activities across common organisational functions; and
- an illustrative SFIA-oriented map covering process, operations, people, data, technology and governance.

These supplied files are examples rather than instructions, a complete list or an authoritative standard. Use them to identify missing transferable application behaviours. Do not automatically turn every industry workflow, scientific field or named technology into a Skill. Domain-specific activities remain examples unless the model catalogue contains evidence that can distinguish variants for that activity. People, change management, accountability and governance remain implementation responsibilities and context requirements rather than model Skills.

The advisor does not claim that this combined taxonomy is an official standard or certification. It uses the sources as design references and keeps context, risk, model facts, estimated fit, source confidence and measured performance separate.

The About tab must show both the eight-question Skills structure and a visual decision map. The decision map must explain how the brief creates team jobs, how each current model variant is scored separately for each job, how model fit, source confidence, ecosystem visibility and measured performance remain separate, how close calls are handled, how the complete team is checked, and why real trials are required before a final choice.

### 5.3 Context frameworks

Context choices should be reviewed against recognised structures while retaining plain-language labels:

- Industry: UN ISIC
- Business work: APQC Process Classification Framework
- Learning and knowledge: UNESCO ISCED-F
- Research domains: OECD Fields of Research and Development

Industry and domain choices set evaluation context. They must not create unsupported claims that a model is inherently best for an industry.

## 6. Model-team jobs

The advisor can derive the following jobs:

- Primary model
- Planning and coordination
- Routine-task model
- Coding specialist
- Research specialist
- Image and document specialist
- Voice specialist
- Private or local model
- Geospatial reasoning specialist
- Quality and safety checker
- Independent evidence checker

### 6.1 Job-specific capability rules

The primary model is judged against the complete application requirement set. Specialists are judged only against the subset relevant to their job.

Baseline mappings:

| Job           | Relevant capability subset                              |
| ------------- | ------------------------------------------------------- |
| Planning      | Reasoning, agents, coding, automation                   |
| Routine work  | Automation, knowledge, retrieval, multilingual, private |
| Checking      | Safety, reasoning, research, knowledge                  |
| Coding        | Coding, agents, reasoning, safety                       |
| Research      | Research, retrieval, knowledge, reasoning               |
| Vision        | Vision, knowledge, reasoning, retrieval                 |
| Voice         | Voice, multilingual, agents                             |
| Private/local | Private, safety, knowledge                              |
| Geospatial    | Vision, reasoning, automation, knowledge                |

These mappings are versioned configuration, not permanent truths.

## 7. Plan styles

### 7.1 Six main styles

1. **Quality First:** sets the highest planning quality target for every job, while still reporting price, speed and lower-cost routes.
2. **Balanced:** uses job-specific quality targets, then balances quality, estimated cost and estimated speed.
3. **Cost Optimised:** starts defined, repeatable work with efficient models while retaining stronger models and checking for difficult, uncertain or high-impact jobs.
4. **Visible Ecosystem Reach:** starts with requirement fit, then modestly favours models visible across more public sources and deployment channels.
5. **Broad Capability Range:** tests whether fewer versatile models can cover more of the application.
6. **Focused Specialist Team:** assembles several focused, lower-cost models and tests whether the complete team can match a broader model.

### 7.2 Additional styles

- Speed First
- Private or Local
- Simple One-Provider Team
- Resilient Multi-Provider Team
- Downloadable Models
- Hosted and Widely Available
- High Assurance
- Smallest Practical Team

## 8. Ranking contract

### 8.1 Separate readings

Every recommendation must display four distinct results:

1. **Model fit:** the number of stated capabilities matching the requirements for this job.
2. **Source confidence:** the kind and freshness of evidence supporting the model record.
3. **Ecosystem visibility:** a public-source proxy described below.
4. **Measured performance:** capability-specific evaluation results, or a clear “not measured yet” state.

Only the documented ranking calculation determines the shortlist. The four readings explain different aspects of that result and must not be presented as equivalent.

Every selected team member must also show a **skill-fit rationale**. The rationale traces:

1. each selected plain-language Skill relevant to the assigned job;
2. the internal capability building blocks implied by that Skill;
3. which of those capabilities the model's catalogue record states;
4. which relevant capabilities are missing or only partially covered; and
5. whether any capability-specific test result is recorded.

The rationale explains why the model is a reasonable candidate for the job; it does not add a new score or prove that the model will perform well. Provider-stated capabilities, source confidence and capability-specific tests must remain visibly distinct. If no relevant performance test exists, the explanation must say that the match is stated or estimated and still requires application testing.

### 8.2 Baseline scoring formula

For each model and job:

```text
score =
  job capability fit
  usual-job evidence
  job quality value × plan quality weight × job quality multiplier
  quality-target shortfall penalty
  lower-cost estimate × plan cost weight × job cost multiplier × 0.75
  speed estimate × plan speed weight × 0.65
  ecosystem visibility × plan visibility weight
  breadth or focus adjustment
  selected constraint adjustments
  model-status adjustment
```

Capability fit:

- Required capability present: +7
- Required capability missing: −4
- A missing capability never removes the model

Usual-job evidence:

- Provider-stated usual job matches the team job: +2
- No usual-job label: +0; the model remains in the ranking

The provider job label is supporting context, not performance evidence. Its contribution is deliberately smaller than one matched capability.

Status:

- Current model: +2
- Preview: −1
- Older model: −2

Constraint adjustments:

- Controlled/private deployment: +9 when available, −14 when unavailable
- Downloadable preference: +7 when available, −3 when unavailable
- Hosted preference: +4 when available, −2 when unavailable
- Safety capability in high-assurance contexts: +4

### 8.3 Plan-style weights

| Style                   | Quality | Cost | Speed | Visibility | Extra       |
| ----------------------- | ------: | ---: | ----: | ---------: | ----------- |
| Quality First           |       8 | 0.25 |  0.25 |       0.01 | —           |
| Balanced                |       3 |    3 |     2 |       0.03 | —           |
| Cost Optimised          |       1 |    8 |     1 |       0.01 | —           |
| Visible Ecosystem Reach |       3 |    1 |     1 |       0.08 | —           |
| Broad Capability Range  |       2 |    2 |     2 |       0.02 | Breadth 1.6 |
| Focused Specialist Team |       2 |    4 |     2 |       0.02 | Focus 2.2   |

All weights are configuration values tied to a scoring-version identifier. They must be treated as hypotheses and refined through evaluation.

### 8.4 Job-specific quality and cost policy

Plan-style weights are adjusted by the job because a routine extraction call, a specialist analysis and an independent check do not have the same consequences.

| Job               | Operating mode                    | Base quality target | Quality multiplier | Cost multiplier |
| ----------------- | --------------------------------- | ------------------: | -----------------: | --------------: |
| Primary           | Adaptive lead                     |              4.00/5 |               1.25 |            0.75 |
| Planner           | Quality-critical coordination     |              4.10/5 |               1.30 |            0.70 |
| Routine worker    | High-throughput first route       |              3.50/5 |               1.00 |            1.50 |
| Quality checker   | Assurance gate                    |              4.25/5 |               1.35 |            0.55 |
| Research/evidence | Evidence-sensitive specialist     |              4.10/5 |               1.25 |            0.75 |
| Coding            | Task-specific specialist          |              4.10/5 |               1.25 |            0.80 |
| Vision            | Task-specific specialist          |              4.00/5 |               1.20 |            0.85 |
| Voice             | Responsive adaptive route         |              3.90/5 |               1.15 |            0.90 |
| Private/local     | Controlled quality-critical route |              3.90/5 |               1.20 |            0.85 |

Quality First raises each target by 0.25. High risk raises each target by 0.25. Cost Optimised lowers only the routine-worker target by 0.25. Low risk lowers only the routine-worker target by 0.15. Targets remain between 3.25 and 4.75.

A model below the target receives a versioned penalty proportional to the shortfall and the evidence factor. The model remains visible because the quality value may be estimated or incomplete. Meeting a target is not proof of quality; it is a planning state that must be tested.

Every selected job records:

- operating mode and target;
- effective quality and cost weights;
- default routing rule;
- escalation rule; and
- useful-work measure.

The interface and saved specification must show these job policies. Cost optimisation should normally route defined, repeatable work to an efficient worker and escalate uncertainty, failed checks, unusual inputs and high-impact decisions to a stronger model, checker or human.

### 8.5 Quality, speed, and cost

Current quality, speed, and cost values are versioned 1–5 estimates. They are not presented as independently tested facts.

The data model must support capability-specific test results:

```json
{
  "modelId": "example-model",
  "capability": "coding",
  "score": 4.2,
  "evaluationId": "software-agent-eval-v3",
  "datasetVersion": "2026-09-01",
  "testedAt": "2026-09-05",
  "sampleSize": 200,
  "evaluator": "named-method-or-organisation",
  "notes": "limitations and operating conditions"
}
```

Evidence factors limit the influence of untested quality values:

- General catalogue estimate only: 0.6
- Some relevant capabilities tested: 0.8
- Every relevant capability tested: 1.0

When only some relevant capability tests exist, tested scores are combined with the general estimate for the untested requirements. A partial test must not be presented as complete measured performance. When no relevant test exists, the UI shows “Estimated only.”

### 8.6 Capability evolution

Capabilities remain binary in the baseline catalogue because false precision would be worse than a clear limitation. The schema should evolve without breaking old records by allowing an optional capability profile:

```json
{
  "capability": "coding",
  "supported": true,
  "claimSource": "official-provider-documentation",
  "confidence": "reviewed",
  "testedScore": null,
  "testedAt": null
}
```

This supports gradual refinement from “stated” to “tested” without inventing unsupported numeric detail.

### 8.7 Ecosystem visibility

Ecosystem visibility is the rounded average of:

- **Public-source reach:** status, number of deployment modes, number of discovery sources, Ollama availability, and hosted-plus-downloadable availability.
- **Observed platform activity:** dated OpenRouter token activity where available, discovery-source presence, number of public listings, and Hugging Face downloads where available.

The score is capped at 100. It remains part of the ranking but its maximum effect is limited by the plan-style weight.

Required warning:

> Ecosystem visibility is a public-data proxy. It does not count total users or prove market share, quality, reliability, or production use.

Correlated signals should be identified and reduced over time. Platform-specific top-ten cut-offs should be replaced by fuller distributions when reliable data becomes available.

### 8.8 Relative rank and percentage

- Rank #1 means the highest score for this job, brief, plan style, catalogue version, and scoring version.
- The displayed percentage is the model's relative position from the lowest to the highest score in the current ranked set. The top position is 100%; the lowest is 0%.
- It is not a probability, confidence interval, or claim that the model will succeed.

### 8.9 Close calls and decision guidance

A difference of less than one score point is inside the close-call band. The raw rank and score remain visible but are not treated as meaningful evidence of a better model.

The advisor applies these tie-breakers in order without rewriting the raw score:

1. **Measured performance evidence:** complete relevant tests outrank partial tests, which outrank catalogue estimates.
2. **Application specialisation:** 70% requirement coverage, 20% concentration of the model's stated capabilities on the assigned job, and 10% provider-stated job positioning.
3. **Ecosystem reach:** the separate ecosystem-visibility reading described above.

Application specialisation is still based on stated catalogue capabilities, not an independent performance test. Ecosystem reach is still a visibility proxy, not a user count or proof of quality. If these readings do not separate the candidates, the result remains unresolved and requires a real-task trial.

There is also a wider **user-choice band** for models less than three raw-score points from the leader. For every team job with two or more candidates in this band, the interface shows a dropdown that:

- Defaults to the advisor's automatic choice
- Lists every eligible model with its raw rank and score
- Allows the user to override the automatic choice
- Labels the result **Selected by you**
- Keeps the advisor choice, raw rank, raw score and automatic tie-break unchanged and visible
- Rejects a stored override if the model is no longer inside the three-point band
- Clears recorded trial outcomes for that plan style when the team changes, because results for the previous roster do not validate the new roster

The three-point band is a choice boundary, not another claim that all candidates are equal. The sub-one-point band remains the automatic close-call rule.

Every eligible job dropdown must be visible in both places where a team is presented:

- Inside each of the six headline plan cards, next to that job
- Inside the selected plan's detailed job card

Changing a dropdown in a headline card selects that plan style, immediately updates its headline roster and detailed job cards, and uses the same saved override and trial-clearing rules as the detailed dropdown. A user must not have to scroll past the headline comparison to discover that close alternatives can be chosen.

The interface must:

- Label a resolved result **Close-call tie-break applied** and an unresolved result **Too close to call**
- Show up to four close candidates with raw ranks, raw scores, performance-evidence level, application-specialisation reading, and ecosystem-reach reading
- Mark the selected candidate and name the reading that separated it
- State that the raw score was not rewritten and that the selected model remains a candidate to test
- Recommend the same minimum ten representative tasks for every close candidate
- Break an observed tie by task completion and corrections first, then measured total cost, response time, deployment fit and failure recovery

The six headline plan cards must also report when one provider supplies the primary choice in at least half of them. This is labelled a **primary-choice concentration**, not proof that the provider is generally better. The note directs the user to the close-call readings and real-task trials.

When a provider-diversity or one-provider policy selects a model other than the raw leader, label it **Selected by a team policy** and show both models and the score gap.

## 9. Provider-diversity rule

Provider diversity is on by default to reduce dependence on one organisation and make fallbacks more useful.

Current working rule:

- Rank models for a job.
- Prefer an unused provider when its normalised relative-fit position is at least 82%.
- Show the model's unadjusted rank and label the diversity adjustment.

The 82% threshold is provisional. It does not yet have a validated empirical rationale. It remains visible, versioned, and listed as an open refinement rather than being presented as an established standard.

Future evaluation should compare thresholds using:

- End-to-end task quality
- Additional operating cost
- Latency
- Provider-outage resilience
- Integration complexity
- Rate-limit resilience
- User preference

## 10. Broad model versus specialist team

The product must make this comparison explicit.

### Broad-model hypothesis

Fewer versatile models may reduce routing, integration, and coordination failures.

### Specialist-team hypothesis

Several focused, lower-cost, or locally run models may collectively cover the application's jobs as well as, or better than, one large frontier model.

### Comparison contract

Do not add model scores together. Run both teams on the same versioned application evaluation set and compare:

- Requirement coverage
- End-to-end output quality
- Capability-specific quality
- Routing accuracy
- Handoff and coordination failures
- Total cost per completed task
- End-to-end latency
- Safety and checking failures
- Local infrastructure cost
- Provider availability and resilience
- Operational complexity

Only add a specialist job when its intermediate result is used or validated. Avoid unnecessary fragmentation that increases latency and compounds errors.

### Team validation contract

The application must keep structural facts separate from behavioural claims.

Structural checks can immediately report:

- Requirement coverage
- Whether each member states a capability needed for its assigned job
- Unique capability contributions and duplicated coverage
- Reuse of the same model across several jobs
- Independence of the primary and checker
- Number of jobs, providers and routing hand-offs
- Availability of a fallback from another provider

The interface must not claim that members work well together from catalogue facts. It must provide the same five recordable trials for every plan style:

1. Ten representative application tasks
2. Routing and multi-member hand-offs
3. Conflicting, uncertain and escalation cases
4. Member, provider and primary-model failures
5. End-to-end cost, latency and peak-load behaviour

Trial outcomes are user-recorded observations: Pass, Needs work or Fail. The advisor does not claim it ran model APIs. A saved plan retains structural checks, trial instructions, outcomes, catalogue version, scoring version and brief.

The load trial must report **useful-work efficiency**: successful tasks that meet the agreed output rubric per total dollar and elapsed minute. It must include model calls, tools, retries, fallbacks and human corrections. A cheaper route fails the comparison if its lower apparent price is created by more failures, corrections or escalations.

### Research basis and limits

The quality-and-cost routing hypothesis is informed by:

- [Vercel's July 2026 AI Gateway Production Index](https://vercel.com/blog/ai-gateway-production-index-july-2026), which observed open-weight models handling 29% of gateway tokens on under 4% of spend while high-stakes spend remained concentrated in frontier models;
- [OECD's 2026 _Benefits of AI Openness_](https://www.oecd.org/content/dam/oecd/en/publications/reports/2026/05/benefits-of-ai-openness_40eaff39/746e8c9a-en.pdf), which reports stronger quality-to-price ratios for many open-weight models while showing that self-hosting economics depend heavily on workload scale and operational capacity;
- [RouteLLM](https://arxiv.org/abs/2406.18665), which learns when to route between stronger and weaker models using preference data; and
- [FrugalGPT](https://arxiv.org/abs/2305.05176), which studies cascades that escalate selectively between models.

These sources support testing routing and cascades. Their gateway shares, quality ratios and reported savings must not be copied into an application forecast. They describe particular datasets, periods, gateways, models and evaluation settings.

## 11. Catalogue contract

The current baseline contains 112 distinct model variants across 27 providers. The count is a release fact, not a permanent product limit.

Each catalogue record requires:

```text
id
name
provider
family
tier
status
context window description
stated capabilities[]
usual jobs[]
deployment methods[]
modalities[]
profiles[]
quality estimate
speed estimate
cost estimate
official provider URL
optional Ollama URL
source review date
catalogue version
optional capability tests{}
```

Admission rules:

- A current provider API or official downloadable weights
- Clear official documentation
- A useful language-model role in an application
- One main record for each distinct model variant
- Dated releases and gateway aliases grouped when they do not represent a materially different choice

### 11.1 Compact, edge and IoT boundary

The catalogue includes 26 reviewed SLMs, 26 edge-capable language models and 10 edge vision-language models. These groups overlap; they are discovery labels, not performance scores. A model belongs only when an official source supports the distinct variant and its language-model role.

An edge application must be planned as connected layers:

1. sensors, authoritative device identity and positioning;
2. device runtime and model delivery;
3. specialist perception, detection, classification or tracking;
4. language or vision-language interpretation and approved action selection;
5. workflow controls, audit, fallback and human responsibility.

Image-only, video-only, sensor-only, detection and tracking models remain outside the language-model count. Where the selected Skills need them, the advisor must recommend first-party runtimes or specialist tools and save those non-model components in the draft specification. Hardware compatibility must be checked on the exact target chipset, memory, power budget and runtime; an “edge” label alone is insufficient.

Current exclusion categories:

- Models altered by an unrelated organisation
- Community-made smaller copies without a materially distinct application role
- Duplicate dated API versions
- Embedding, reranking, moderation, image-only, video-only, and similar non-language endpoints
- Every size of a model when the size does not materially change use
- Marketplace names not confirmed by the provider

## 12. Evidence and freshness

### Evidence layers

1. Official provider evidence for catalogue membership and stated capabilities
2. Discovery-source records for availability and possible missing models
3. Registry snapshots retaining raw source data and overlap
4. Coverage audit comparing catalogue records with provider lists
5. Capability-test records for measured performance

### Freshness

- Discovery sources: every 6–12 hours according to source configuration
- Official provider pages: every seven days
- Industry and knowledge frameworks: when their source changes and at least quarterly
- Scoring rules: whenever availability, cost, capabilities, test results, or observed failure patterns change

A changed or unreachable source creates a review state. It must not automatically delete a catalogue model or change saved advice.

## 13. Data persistence and interfaces

The deployed application uses a Cloudflare Worker-compatible ESM server and D1 persistence.

Logical binding:

- D1: `DB`
- R2: unused

Persistent tables:

- `catalog_models`
- `application_blueprints`
- `source_evidence`
- `registry_snapshots`

`catalog_models` and `source_evidence` are derived projections. On release, they are synchronised to the bundled, validated catalogue and current official-source set. The alignment migration must preserve `application_blueprints` and all six `registry_snapshots` so saved work and source history are not lost.

HTTP interfaces:

- `GET /` — rendered application
- `GET /api/catalog` — current catalogue with visibility signals
- `GET /api/audit` — provider evidence, scope, watchlist, and registry summary
- `GET /api/registries` — discovery-source summary and overlap
- `GET /api/registry-candidates` — paginated source records and possible matches
- `GET /api/blueprints` — saved application plans
- `POST /api/blueprints` — validate and save an application plan
- `GET /api/blueprints/:id` — one saved plan and its editable draft specification
- `PATCH /api/blueprints/:id` — edit the plan name and draft specification without changing the saved team facts
- `DELETE /api/blueprints/:id` — permanently delete one saved plan
- `GET /api/blueprints/:id/markdown` — download the draft as a Markdown file

Saved plans include:

- Application inputs
- Custom application label and selected starting type
- Derived requirements
- Context and risk
- Selected plan style
- Constraints
- Diversity threshold
- Job-specific requirements
- Model selections and fallbacks
- Any user-selected model override, its raw rank, and the advisor's automatic choice
- Relative ranks
- Separate evidence readings
- Close-call, tie-break, or policy-choice decision guidance
- Structural team checks
- Real-task trial instructions and recorded outcomes
- Catalogue version
- Scoring version
- Taxonomy version
- Editable draft application specification
- Draft-specification format version and last-edited time

The draft specification is stored inside the plan's `payload_json`; a separate file is generated on request. This avoids browser-only state and avoids storing duplicate file blobs. A saved record created before draft specifications were introduced receives a generated draft when it is opened or exported.

### 13.1 Draft application specification contract

Choosing **Save this team plan** must create a fill-in Markdown draft that includes the application type and every selected model. The structure follows the project owner's referenced specification-engineering article and contains:

1. Objective
2. Context
3. Inputs
4. Output format
5. Candidate model team and routing responsibilities
6. Constraints
7. Evaluation criteria
8. Edge cases and failure handling
9. Verification steps
10. Open decisions and ownership
11. Version record

The generator must fill known facts from the brief, model team, close-call guidance, structural checks and recorded trial outcomes. Unknown decisions must remain visibly marked as `[Fill in: …]`; the application must not invent budgets, service targets, policies, schemas or acceptance thresholds.

### 13.2 Saved plans workspace

The Saved plans tab must allow a user to:

- Reopen the saved brief and recorded trial outcomes in Application design
- Select two or three plans for a side-by-side comparison
- Compare application type, plan style, team membership, trial state and version stamps
- Edit and persist the plan name and Markdown draft
- Export the current draft as a `.md` file
- Delete a saved plan only after confirming its name and that the action is permanent

Reopening a plan copies its inputs into the active Application design. It does not rewrite the stored plan. Saving the reopened design creates another version that can be compared with the earlier record.

## 14. Branding and interface

The product uses the supplied eye image as the brand mark. The visual language should retain its blue, green, and reflective character while prioritising legibility.

Interface requirements:

- Responsive desktop and mobile layouts
- Keyboard-operable controls
- Clear active states
- Accessible labels
- Title-only Skill controls whose definition, examples and boundary appear on hover, keyboard focus and tap
- Sufficient colour contrast
- No reliance on colour alone
- Complete team previews on all plan cards
- Plain-language explanations near scores
- External links open safely in a new tab
- Provider and Ollama links available wherever models are shown
- An About tab that explains Application design, Saved plans, Model explorer, Live registry, Coverage check, and Update centre in plain language
- A clear statement of what each tab can help with and what it cannot prove
- A five-step workflow from describing an application to testing, recording, and revisiting a model-team plan
- Definitions that distinguish candidates from proven winners, source confirmation from performance testing, and user-recorded trials from tests run by the application

## 15. Reliability, safety, and privacy

- Treat high-stakes recommendations as decision support, not automated decisions.
- Recommend deterministic tools for maps, calculations, databases, search, identity, access, and workflow control where appropriate.
- Recommend human review for material decisions.
- Store saved plans in platform-backed persistence rather than browser-only storage.
- Do not require model API keys merely to browse the catalogue.
- Do not silently send user application briefs to external model providers.
- Escape rendered source data and validate saved blueprint payloads.
- Keep external-source failures isolated from the bundled catalogue fallback.

## 16. Evaluation and acceptance tests

### Catalogue

- The published baseline contains exactly 112 distinct model variants across 27 providers.
- The explorer reports 26 SLMs, 26 edge language models, 10 edge vision-language models and one on-device action specialist.
- FunctionGemma and Qwen3-VL compact variants link to model-specific first-party pages.
- Perception models, trackers, runtimes and IoT platforms are recommended separately from language-model team members.
- Every model has an official provider link.
- Ollama links appear only where available.
- Unsupported or stale model names are removed through a migration without leaving duplicate records.

### Recommendation behaviour

- Every catalogue variant receives a finite score for every job.
- Missing capabilities reduce the score but do not exclude a model.
- Specialists are scored against job-specific requirements.
- Every job has a visible operating policy, soft quality target, effective quality and cost weights, routing rule, escalation rule and useful-work measure.
- Primary, planning, specialist and checking jobs weight quality more strongly than cost; the routine worker gives more weight to cost and throughput.
- A model below the job-quality target is penalised but remains visible.
- Visible ecosystem reach cannot overpower materially stronger requirement coverage.
- Quality, Balanced, Cost, Ecosystem, Broad, and Focused styles can produce different teams without forcing artificial differences.
- Full team membership is visible before a user selects a plan.
- Diversity-adjusted choices retain their raw rank and explanation.
- Relative percentages are labelled as relative, not absolute.
- Raw-score gaps below one point invoke the documented tie-break sequence without changing the raw scores.
- A close-call result shows every deciding reading, the selected candidate, the reason for selection and a real-task trial.
- A close call remains unresolved when measured evidence, application specialisation and ecosystem reach are also level.
- A provider leading at least half of the headline primary choices produces a concentration warning rather than a claim of superiority.
- Every job with multiple candidates less than three raw-score points from the leader offers a user-choice dropdown.
- A user override is labelled, preserves the automatic choice and raw scoring, is saved with the plan, and clears trial outcomes for the changed roster.
- Untested quality estimates receive less weight than complete relevant capability tests.
- Provider job labels contribute less than one matched capability.
- A provider-policy override is distinguished from the raw score leader.
- Every recommended team member shows the selected Skills relevant to its job, the implied capability building blocks, stated matches, visible gaps and any recorded capability-specific tests.
- A Skill rationale never describes a provider-stated capability as measured proof for the application.

### Skills taxonomy and interface

- The baseline contains 37 unique Skills under eight guiding questions.
- Every Skill has a short title, selection guidance, examples, a boundary and at least one internal capability mapping.
- The checklist shows only the short title until hover, keyboard focus or tap opens the accessible explanation.
- Every starting application type uses valid Skill identifiers.
- The supplied capability, business-process and SFIA-oriented reference files are treated as illustrative design inputs, not a complete or authoritative taxonomy.

### Team validation

- Structural checks cover requirement coverage, assigned-job fit, job-quality targets, quality-and-cost routing, complementarity, duplication, checker independence, routing complexity and fallback independence.
- Coordination quality and end-to-end operation always require a real trial until an outcome is recorded.
- The same five trial definitions are available for every plan style.
- The load trial measures successful rubric-meeting tasks per total dollar and elapsed minute, including tools, retries, fallbacks and human corrections.
- Recording Pass, Needs work or Fail updates the selected team's validation state.
- Saved plans retain the recorded trial outcomes without claiming the advisor ran the models.

### Saved plans and specifications

- A saved plan contains its brief, model team, job operating policies, evidence readings, skill-fit rationales, close-call guidance, team checks, trial outcomes and version stamps.
- A saved plan records whether a model was selected by the user and retains the advisor's automatic choice for comparison.
- Saving returns a direct Markdown download link.
- The generated Markdown contains the application type, every selected model and all required specification sections.
- The generated Markdown explains why each model is a candidate for its assigned Skills and preserves partial gaps and evidence limitations.
- The generated Markdown preserves required non-model components and their official source links.
- Unknown application decisions remain explicit fill-in fields rather than generated claims.
- Reopening restores the saved brief and recorded trial outcomes to Application design.
- Two or three plans can be compared side by side.
- Editing persists the new name and Markdown content without replacing the saved team facts.
- Export returns the latest edited Markdown with a safe `.md` filename.
- Deletion requires an explicit interface confirmation that names the plan and says the action is permanent.
- Successful deletion removes the plan, its draft and its place in any comparison; deleting an unknown plan returns a not-found response.

### Regression example

For the Software Engineering Agent under the ecosystem-oriented style, Claude Fable 5's complete stated requirement coverage must rank above GLM-5.2 when GLM-5.2 is missing a selected requirement, while GLM-5.2 remains visible in the ranking.

This is a regression test for scoring behaviour, not a permanent claim that Claude Fable 5 must always win. New capability evidence, test results, catalogue data, or user requirements may change the outcome in a later version.

### Registry

- Six sources remain separately labelled.
- Source overlap is computed after normalization.
- Excluded non-language records do not enter the catalogue.
- Possible matches require official provider evidence before admission.

### Persistent projections

- The D1 catalogue projection contains exactly the same 112 variants and catalogue version as the bundled release.
- The official-source projection contains one current row per evidence source and no rows from superseded scope versions.
- Catalogue and evidence alignment preserves saved application plans and the six discovery-source snapshots.

### Build and deployment

- Recommendation tests pass.
- Planning-interface tests pass.
- Registry tests pass.
- The Worker build exports `default.fetch`.
- D1 migrations are packaged and applied in order.
- Existing hosting project identity is preserved.
- The deployed site reports the current catalogue count and all evidence layers.

## 17. Versioning and change control

Version independently:

- Catalogue
- Scoring framework
- Capability taxonomy
- Job-to-capability mappings
- Quality/speed/cost estimates
- Capability-test datasets
- Diversity threshold
- Source-normalization rules
- Saved application plans

Every scoring change requires:

1. Written rationale
2. Regression tests
3. Before-and-after examples
4. Update Center entry
5. New scoring-version identifier
6. Preservation of older saved-plan metadata

The deployed source and the GitHub repository must be kept aligned after each published update.

## 18. Open refinements

1. Expand capability-test coverage beyond the current published benchmark sample and add representative application-owned evaluations.
2. Develop representative evaluation sets for each application type and job.
3. Measure complete specialist teams against broad-model teams.
4. Refine binary capability records into stated, reviewed, and tested evidence states.
5. Reduce correlation and double-counting in ecosystem visibility.
6. Replace top-ten platform cut-offs with fuller and more stable distributions.
7. Validate or replace the provisional 82% provider-diversity threshold.
8. Add confidence intervals and sample sizes to measured performance where appropriate.
9. Capture real task cost and latency under controlled conditions.
10. Add drift reports showing why rankings changed between versions.
11. Expand industries, knowledge domains, and application types without inventing unsupported model strengths.
12. Keep the main catalogue current while preventing raw discovery records from being mistaken for confirmed variants.

## 19. Definition of done for a future rebuild

A rebuild is complete only when:

- A non-specialist user can understand every major term.
- The application brief determines the team jobs and job-specific requirements.
- A custom application label can produce a complete team after the user confirms or adjusts its Skills.
- The Skills checklist uses eight plain-language questions and accessible title explanations rather than exposing a dense technical capability matrix.
- Every current catalogue model remains visible in every job ranking; missing capabilities and technical preferences change fit rather than silently excluding it.
- Each recommendation separates fit, source confidence, ecosystem visibility, and measured performance.
- Each team member has a skill-by-skill rationale that distinguishes provider-stated capability, missing coverage and recorded performance tests.
- Near-equal numerical results keep their raw order and show the explicit measured-evidence, application-specialisation and ecosystem-reach tie-break sequence.
- Proposed teams expose structural cautions and cannot become validated until the complete roster is trialled.
- Public visibility is never described as users, reliability, market share, or proof of quality.
- Plan cards show complete teams.
- Broad-model and specialist-team hypotheses can be compared on the same evaluation set.
- Data sources, aliases, overlap, official evidence, and catalogue membership remain distinct.
- Saved plans are versioned and reproducible.
- Saved plans can be reopened, compared, edited, exported and deliberately deleted without losing the context of plans that remain.
- Tests cover the ranking rules and known failure cases.
- The build, migrations, deployment, live site, and GitHub source all correspond to the same release.
