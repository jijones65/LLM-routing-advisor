import type { Capability } from "../shared/types.js";

/** Bumped when application types, needs or context categories change. */
export const TAXONOMY_VERSION = "2026.08.18-2";

/** One thing the application must be able to do, and what it implies. */
export interface Need {
  readonly id: string;
  readonly name: string;
  /** Capabilities this need requires of the model team. */
  readonly cases: readonly Capability[];
}

/** Needs grouped the way a person thinks about an application. */
export interface NeedGroup {
  readonly name: string;
  readonly items: readonly Need[];
}

export const NEED_GROUPS: readonly NeedGroup[] = [
  {
    name: "Read and understand",
    items: [
      { id: "documents", name: "Read text and documents", cases: ["knowledge", "rag"] },
      { id: "computer-vision", name: "Computer vision — images or video", cases: ["vision"] },
      { id: "listen-speak", name: "Listen and speak", cases: ["voice"] },
    ],
  },
  {
    name: "Find information",
    items: [
      { id: "internal-knowledge", name: "Use private knowledge", cases: ["knowledge", "rag"] },
      { id: "current-research", name: "Search current sources", cases: ["research", "rag"] },
    ],
  },
  {
    name: "Reason and check",
    items: [
      { id: "complex-decisions", name: "Make complex decisions", cases: ["reasoning"] },
      { id: "forecast-scenarios", name: "Compare or forecast scenarios", cases: ["reasoning", "knowledge"] },
      { id: "validate", name: "Check claims and outputs", cases: ["safety", "reasoning"] },
    ],
  },
  {
    name: "Create",
    items: [
      { id: "write-explain", name: "Write and explain", cases: ["knowledge"] },
      { id: "code-build", name: "Write and test code", cases: ["coding", "agents"] },
      { id: "creative-design", name: "Support art and design work", cases: ["vision", "knowledge"] },
    ],
  },
  {
    name: "Take action",
    items: [
      { id: "software-tools", name: "Use software and tools", cases: ["agents", "automation"] },
      { id: "high-volume", name: "Repeat work at high volume", cases: ["automation"] },
      { id: "coordinate-work", name: "Coordinate many steps", cases: ["agents", "reasoning"] },
    ],
  },
  {
    name: "Location and field work",
    items: [
      { id: "geospatial", name: "Use maps or geospatial data", cases: ["vision", "reasoning", "automation"] },
      { id: "field-mobile", name: "Work in the field or offline", cases: ["voice", "vision", "private"] },
    ],
  },
  {
    name: "Language and protection",
    items: [
      { id: "many-languages", name: "Work in many languages", cases: ["multilingual"] },
      { id: "sensitive-data", name: "Handle sensitive data", cases: ["private", "safety"] },
    ],
  },
];

/** Flat lookup from need id to need. */
export const NEED_INDEX: Readonly<Record<string, Need>> = Object.fromEntries(
  NEED_GROUPS.flatMap((group) => group.items).map((need) => [need.id, need]),
);

/** A common starting shape for an application. */
export interface Archetype {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly needs: readonly string[];
}

export const ARCHETYPES: readonly Archetype[] = [
  {
    id: "knowledge-assistant",
    name: "Knowledge assistant",
    description: "Answers questions using trusted internal information and shows where answers came from.",
    needs: ["internal-knowledge", "write-explain", "validate"],
  },
  {
    id: "support-copilot",
    name: "Customer support copilot",
    description: "Helps staff or customers, finds answers and can complete simple service actions.",
    needs: ["internal-knowledge", "listen-speak", "many-languages", "software-tools", "validate"],
  },
  {
    id: "document-intelligence",
    name: "Document intelligence",
    description: "Reads, sorts and checks forms, reports, images and tables.",
    needs: ["documents", "computer-vision", "high-volume", "validate"],
  },
  {
    id: "software-agent",
    name: "Software engineering agent",
    description: "Plans, writes, tests and researches changes across a software project.",
    needs: ["code-build", "coordinate-work", "current-research", "validate"],
  },
  {
    id: "research-system",
    name: "Research and evidence system",
    description: "Finds current sources, compares evidence and writes a clear, traceable result.",
    needs: ["current-research", "complex-decisions", "write-explain", "validate"],
  },
  {
    id: "field-assistant",
    name: "Field operations assistant",
    description: "Uses voice, images and location information where work happens.",
    needs: ["field-mobile", "geospatial", "internal-knowledge", "software-tools"],
  },
  {
    id: "regulated-support",
    name: "High-stakes decision support",
    description: "Supports careful decisions with evidence, privacy, checking and human review.",
    needs: ["complex-decisions", "internal-knowledge", "sensitive-data", "validate"],
  },
  {
    id: "operations-excellence",
    name: "Business process improvement",
    description: "Finds delays, improves processes and supports reliable day-to-day work.",
    needs: ["high-volume", "forecast-scenarios", "software-tools", "validate"],
  },
  {
    id: "product-comparison",
    name: "Product comparison tool",
    description: "Collects product facts, compares options against clear criteria and explains the trade-offs.",
    needs: ["documents", "current-research", "complex-decisions", "write-explain", "validate"],
  },
  {
    id: "procurement-analyst",
    name: "Procurement and supplier analyst",
    description: "Compares suppliers, contracts, risks, costs and evidence for purchasing decisions.",
    needs: ["documents", "forecast-scenarios", "current-research", "sensitive-data", "validate"],
  },
  {
    id: "meeting-actions",
    name: "Meeting and action assistant",
    description: "Captures discussions, creates clear actions and helps coordinate follow-up work.",
    needs: ["listen-speak", "write-explain", "coordinate-work", "software-tools"],
  },
  {
    id: "learning-tutor",
    name: "Learning and tutoring assistant",
    description: "Explains ideas, adapts practice activities and checks understanding with responsible review.",
    needs: ["internal-knowledge", "write-explain", "many-languages", "validate"],
  },
  {
    id: "sales-proposals",
    name: "Sales and proposal assistant",
    description: "Researches needs, drafts tailored proposals and helps teams complete sales follow-up.",
    needs: ["internal-knowledge", "current-research", "write-explain", "software-tools", "validate"],
  },
  {
    id: "compliance-review",
    name: "Compliance and policy review assistant",
    description: "Compares documents with rules, records evidence and sends important decisions for human review.",
    needs: ["documents", "internal-knowledge", "sensitive-data", "validate"],
  },
  {
    id: "data-insight",
    name: "Data insight and reporting assistant",
    description: "Explains trusted data, compares scenarios and prepares clear reports for decisions.",
    needs: ["documents", "forecast-scenarios", "write-explain", "validate"],
  },
  {
    id: "content-localization",
    name: "Content and localisation assistant",
    description: "Creates and adapts content for different languages, formats and audiences.",
    needs: ["write-explain", "many-languages", "high-volume", "creative-design", "validate"],
  },
  {
    id: "cybersecurity-triage",
    name: "Cybersecurity triage assistant",
    description: "Reviews technical evidence, helps investigate events and checks proposed actions before use.",
    needs: ["code-build", "current-research", "complex-decisions", "sensitive-data", "validate"],
  },
  {
    id: "retail-experience",
    name: "Retail and commerce assistant",
    description: "Supports product discovery, service, content and store or online operations.",
    needs: ["internal-knowledge", "many-languages", "software-tools", "high-volume"],
  },
  {
    id: "finance-insight",
    name: "Financial analysis assistant",
    description: "Compares scenarios, explains results and checks calculations and sources.",
    needs: ["documents", "forecast-scenarios", "current-research", "validate", "sensitive-data"],
  },
  {
    id: "science-research",
    name: "Scientific research assistant",
    description: "Finds literature, works with technical evidence and supports reproducible analysis.",
    needs: ["current-research", "complex-decisions", "documents", "validate"],
  },
  {
    id: "creative-studio",
    name: "Art and design studio assistant",
    description: "Supports visual analysis, creative direction, research and clear explanations.",
    needs: ["creative-design", "computer-vision", "current-research", "write-explain"],
  },
  {
    id: "geospatial-ops",
    name: "Geospatial planning assistant",
    description: "Combines maps, location data, field information and operational decisions.",
    needs: ["geospatial", "field-mobile", "forecast-scenarios", "validate"],
  },
];

/** A labelled option list entry, optionally implying capabilities. */
export interface ContextOption {
  readonly id: string;
  readonly name: string;
  readonly cases?: readonly Capability[];
}

/**
 * Why the application is being built. A goal can add a capability requirement
 * but never removes one, so choosing a goal cannot narrow the shortlist in a
 * way the user did not ask for.
 */
export const BUSINESS_GOALS: readonly ContextOption[] = [
  { id: "service", name: "Improve service" },
  { id: "growth", name: "Support growth and sales" },
  { id: "operations", name: "Operational excellence", cases: ["automation"] },
  { id: "risk", name: "Reduce risk and improve compliance", cases: ["safety"] },
  { id: "innovation", name: "Research and innovation", cases: ["research", "reasoning"] },
  { id: "sustainability", name: "Sustainability and public value", cases: ["knowledge", "reasoning"] },
];

/**
 * Industry and knowledge area set the *testing* context. They deliberately
 * carry no capability implications: no public source supports the claim that a
 * given model is best for, say, healthcare, and inventing one would be the
 * easiest way for this tool to mislead someone.
 */
export const INDUSTRIES: readonly ContextOption[] = [
  { id: "general", name: "No specific industry" },
  { id: "retail", name: "Retail and commerce" },
  { id: "financial", name: "Financial services" },
  { id: "health", name: "Health and social care" },
  { id: "education", name: "Education" },
  { id: "manufacturing", name: "Manufacturing" },
  { id: "government", name: "Government and public service" },
  { id: "creative", name: "Media and creative industries" },
  { id: "energy", name: "Energy and utilities" },
  { id: "transport", name: "Transport and logistics" },
  { id: "agriculture", name: "Agriculture and food" },
  { id: "professional", name: "Professional services" },
  { id: "science", name: "Scientific and technical work" },
];

export const DOMAINS: readonly ContextOption[] = [
  { id: "general", name: "General knowledge" },
  { id: "business", name: "Business and management" },
  { id: "finance", name: "Finance and economics" },
  { id: "computing", name: "Computing and engineering" },
  { id: "health", name: "Life and health sciences" },
  { id: "physical", name: "Physical sciences and mathematics" },
  { id: "social", name: "Social sciences and law" },
  { id: "arts", name: "Arts, design and humanities" },
  { id: "earth", name: "Earth, environment and geospatial" },
];

export const RISK_LEVELS: readonly ContextOption[] = [
  { id: "low", name: "Low — easy to correct" },
  { id: "medium", name: "Medium — review important outputs" },
  { id: "high", name: "High — human approval required" },
];
