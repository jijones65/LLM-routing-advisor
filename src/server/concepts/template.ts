import { SPECIFICATION_GUIDE_URL } from "../blueprints/specification.js";

/** A lightweight starting paper based on the eight-part specification structure. */
export const CONCEPT_PAPER_TEMPLATE = `# AI Application Concept Paper

> Use this template when you do not already have a concept paper. Short answers are fine. The Routing Advisor can read the completed Markdown after it is exported as PDF or DOCX.
>
> Structure adapted from [Specification Engineering: The New Skill After Prompt Engineering](${SPECIFICATION_GUIDE_URL}).

## Project title

[Give the proposed application a clear, specific name.]

## 1. Objective

**Problem or opportunity**
[What problem should be solved, for whom, and why does it matter?]

**Intended outcome**
[What should be observably better if the application succeeds?]

**Out of scope**
[What must this application not attempt?]

## 2. Context

**Users and stakeholders**
[Who uses it, who is affected, and who approves important decisions?]

**Operating setting**
[Describe the organisation, industry, workflow, locations, languages and accessibility needs.]

**Existing systems and process**
[What happens today and which systems, teams or suppliers are involved?]

## 3. Inputs

**Information and files**
[List documents, databases, APIs, messages, images, audio, sensors or user entries.]

**Volume and frequency**
[Give typical and peak users, requests, records or batch sizes.]

**Sensitive or regulated data**
[Describe personal, confidential, regulated or commercially sensitive information.]

## 4. Output format

**User-facing result**
[Describe the answer, report, recommendation, generated file, alert, action or conversation.]

**Machine-readable result**
[Describe any JSON, database fields, API response, event or file format.]

**Evidence and uncertainty**
[State when sources, citations, confidence wording or refusal are required.]

## 5. Constraints

[Describe budget, speed, availability, deployment, data location, security, provider, downloadable-model, legal and ethical limits.]

## 6. Evaluation criteria

[Define measurable quality, correctness, citation, safety, cost, speed and reliability targets.]

## 7. Edge cases and failure modes

[List malformed or contradictory inputs, missing knowledge, unavailable tools, provider outages, unsafe requests, escalation and rollback.]

## 8. Verification steps

[List representative tasks, acceptance tests, human review, failure simulations, load tests and the evidence required before launch.]

## Open decisions

- [Decision, owner and due date]
- [Decision, owner and due date]
`;
