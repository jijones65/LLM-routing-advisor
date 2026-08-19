import type { Capability } from "../shared/types.js";

/** Bumped when application types, needs or context categories change. */
export const TAXONOMY_VERSION = "2026.08.19-2";

/** One thing the application must be able to do, and what it implies. */
export interface Need {
  readonly id: string;
  readonly name: string;
  /** A short test for whether the user should select this skill. */
  readonly guidance: string;
  /** Concrete examples shown in the skill pop-up. */
  readonly examples: string;
  /** A boundary that helps prevent selecting a nearby but different skill. */
  readonly boundary: string;
  /** Capabilities this need requires of the model team. */
  readonly cases: readonly Capability[];
}

/** Needs grouped the way a person thinks about an application. */
export interface NeedGroup {
  readonly name: string;
  /** The question this group answers in an application brief. */
  readonly prompt: string;
  readonly items: readonly Need[];
}

export const NEED_GROUPS: readonly NeedGroup[] = [
  {
    name: "Understand inputs",
    prompt: "What information will the application receive?",
    items: [
      {
        id: "documents",
        name: "Read text and documents",
        guidance: "Choose this for reports, forms, PDFs, contracts or long written material.",
        examples: "Contracts, reports, forms, policies, case files and long PDFs.",
        boundary: "Also choose visual understanding when page layout, handwriting or images carry meaning.",
        cases: ["knowledge", "rag"],
      },
      {
        id: "computer-vision",
        name: "Understand images or video",
        guidance: "Choose this when meaning must be found in photographs, diagrams, scans or video frames.",
        examples: "Product photos, scans, diagrams, medical images, satellite images and video frames.",
        boundary: "Do not choose it merely because a text document happens to be stored as a PDF.",
        cases: ["vision"],
      },
      {
        id: "listen-speak",
        name: "Listen and speak",
        guidance: "Choose this for spoken input, transcription, live conversation or spoken output.",
        examples: "Call transcription, voice assistants, spoken translation and meeting summaries.",
        boundary: "Text-only chat does not need this skill.",
        cases: ["voice"],
      },
      {
        id: "structured-data",
        name: "Work with tables and structured data",
        guidance: "Choose this for spreadsheets, database records, measurements or other fixed fields.",
        examples: "Spreadsheets, database rows, transactions, inventories and laboratory measurements.",
        boundary: "Also choose document reading when the data depends on surrounding prose or page layout.",
        cases: ["knowledge", "reasoning", "automation"],
      },
      {
        id: "sensor-streams",
        name: "Use sensor or IoT data",
        guidance:
          "Choose this when the application must interpret readings or events arriving from equipment or devices.",
        examples: "Equipment telemetry, IoT events, environmental readings, security logs and smart-building data.",
        boundary: "This covers interpretation and response planning, not certified direct control of equipment.",
        cases: ["reasoning", "automation"],
      },
    ],
  },
  {
    name: "Find and remember",
    prompt: "What knowledge must it reach or retain?",
    items: [
      {
        id: "internal-knowledge",
        name: "Use private knowledge",
        guidance: "Choose this when answers must be grounded in your organisation's approved information.",
        examples: "Internal policies, product manuals, case records, research notes and approved knowledge bases.",
        boundary: "Choose current-source research as well when outside facts may have changed.",
        cases: ["knowledge", "rag"],
      },
      {
        id: "current-research",
        name: "Search current sources",
        guidance: "Choose this when the answer can change and needs current external evidence.",
        examples: "Market changes, laws, prices, product availability, recent research and current events.",
        boundary: "A stable internal knowledge base does not need live external research by itself.",
        cases: ["research", "rag"],
      },
      {
        id: "memory-context",
        name: "Keep context across interactions",
        guidance: "Choose this when the application must remember approved facts, preferences or work in progress.",
        examples: "Ongoing cases, customer preferences, project state and a multi-session learning plan.",
        boundary: "Memory needs consent, retention and correction rules; it is not the same as a long prompt.",
        cases: ["knowledge", "rag"],
      },
    ],
  },
  {
    name: "Analyse and decide",
    prompt: "What judgement, comparison or calculation is required?",
    items: [
      {
        id: "complex-decisions",
        name: "Make complex decisions",
        guidance: "Choose this when several constraints, trade-offs or uncertain facts must be considered together.",
        examples: "Supplier selection, treatment support, investment options and policy exceptions.",
        boundary: "Use human review too when the decision can materially affect a person or organisation.",
        cases: ["reasoning"],
      },
      {
        id: "forecast-scenarios",
        name: "Compare or forecast scenarios",
        guidance: "Choose this for alternatives, plans, forecasts, simulations or what-if questions.",
        examples: "Demand forecasts, budget scenarios, capacity plans and policy alternatives.",
        boundary: "Choose numerical analysis as well when formulas or statistical validity determine success.",
        cases: ["reasoning", "knowledge"],
      },
      {
        id: "quantitative-analysis",
        name: "Calculate and analyse numbers",
        guidance: "Choose this when numerical accuracy, formulas, statistics or measurement affect success.",
        examples: "Financial calculations, experiment results, operational metrics and statistical comparisons.",
        boundary:
          "Important calculations should use deterministic tools and checks, not language-model arithmetic alone.",
        cases: ["reasoning", "knowledge"],
      },
      {
        id: "classify-prioritise",
        name: "Classify, match or prioritise",
        guidance: "Choose this when items must be labelled, matched, routed or ordered using stated criteria.",
        examples: "Ticket routing, document classification, candidate matching and risk prioritisation.",
        boundary: "Choose personalisation separately when the result must change for each user.",
        cases: ["reasoning", "knowledge", "safety"],
      },
      {
        id: "personalise-recommend",
        name: "Personalise or recommend",
        guidance: "Choose this when results must adapt to a person's context, preferences or history.",
        examples: "Product recommendations, learning activities, content discovery and next-best actions.",
        boundary: "Define consent, fairness and feedback rules before using personal or behavioural data.",
        cases: ["reasoning", "knowledge", "safety"],
      },
      {
        id: "detect-anomalies",
        name: "Detect anomalies, fraud or threats",
        guidance: "Choose this when unusual patterns or possible harm must be found and investigated.",
        examples: "Fraud alerts, equipment faults, security events, quality defects and unusual transactions.",
        boundary: "Detection is a flag for checking; it should not be treated as proof by itself.",
        cases: ["reasoning", "automation", "safety"],
      },
      {
        id: "optimise-resources",
        name: "Optimise routes, schedules or resources",
        guidance: "Choose this when the application must find a practical allocation under constraints.",
        examples: "Delivery routes, staff rosters, warehouse work, energy use and supply planning.",
        boundary: "Use an optimisation engine for exact solutions and the model for interpretation or orchestration.",
        cases: ["reasoning", "automation"],
      },
      {
        id: "simulate-systems",
        name: "Model or simulate systems",
        guidance: "Choose this for digital twins, scientific models or other representations of how a system behaves.",
        examples: "Traffic flow, climate scenarios, supply networks, molecular studies and digital twins.",
        boundary: "Domain simulators and validated scientific software remain the source of numerical results.",
        cases: ["reasoning", "knowledge"],
      },
    ],
  },
  {
    name: "Create and communicate",
    prompt: "What must it produce for a person or another system?",
    items: [
      {
        id: "write-explain",
        name: "Write and explain",
        guidance: "Choose this for drafting, summarising, teaching or adapting information for an audience.",
        examples: "Reports, summaries, lessons, instructions, proposals and plain-language explanations.",
        boundary: "Choose validation when factual accuracy, citations or policy compliance matter.",
        cases: ["knowledge"],
      },
      {
        id: "many-languages",
        name: "Work in many languages",
        guidance: "Choose this when understanding, translation or output is required in more than one language.",
        examples: "Translation, multilingual service, localisation and cross-language information retrieval.",
        boundary: "Test the actual languages, dialects and cultural context rather than assuming equal performance.",
        cases: ["multilingual"],
      },
      {
        id: "code-build",
        name: "Write and test code",
        guidance: "Choose this for software changes, debugging, tests, scripts or technical implementation.",
        examples: "Feature changes, refactoring, debugging, test creation, data scripts and configuration.",
        boundary: "Builds, tests, security scans and review tools should verify generated changes.",
        cases: ["coding", "agents"],
      },
      {
        id: "creative-design",
        name: "Create images, media or designs",
        guidance: "Choose this for visual concepts, image or media creation, creative direction or design development.",
        examples:
          "Illustrations, layouts, product concepts, video treatments, fashion patterns and interactive stories.",
        boundary: "Check whether the selected endpoint can generate media rather than only understand it.",
        cases: ["vision", "knowledge"],
      },
      {
        id: "synthetic-data",
        name: "Create synthetic or test data",
        guidance: "Choose this when realistic artificial examples are needed for testing, privacy or rare cases.",
        examples: "Software fixtures, simulated customer records, rare-event cases and privacy-preserving samples.",
        boundary: "Synthetic data can reproduce bias or leak patterns; validate it against the intended use.",
        cases: ["reasoning", "automation", "safety"],
      },
    ],
  },
  {
    name: "Take action",
    prompt: "What must happen beyond producing an answer?",
    items: [
      {
        id: "software-tools",
        name: "Use software and tools",
        guidance: "Choose this when the application must search, calculate, update records or take an external action.",
        examples: "Search, calculators, databases, calendars, ticketing systems and business applications.",
        boundary: "Give each tool the least permission needed and require approval for consequential actions.",
        cases: ["agents", "automation"],
      },
      {
        id: "coordinate-work",
        name: "Coordinate many steps",
        guidance: "Choose this for plans with dependencies, hand-offs, specialist jobs or approval steps.",
        examples: "Research pipelines, software delivery, case handling and multi-agent work.",
        boundary: "Define ownership, stop conditions and recovery when a hand-off fails or loops.",
        cases: ["agents", "reasoning"],
      },
      {
        id: "workflow-approvals",
        name: "Run workflows and approvals",
        guidance: "Choose this when records must move through rules, queues, approvals or exception paths.",
        examples: "Invoices, onboarding, refunds, purchase orders, compliance filings and service escalation.",
        boundary: "The workflow system should keep the authoritative state and audit trail.",
        cases: ["agents", "automation", "safety"],
      },
      {
        id: "system-integration",
        name: "Connect systems and data",
        guidance: "Choose this when the application must exchange information across APIs, databases or services.",
        examples: "CRM enrichment, data pipelines, inventory updates, identity systems and service integrations.",
        boundary: "Schemas, authentication, retries and reconciliation need explicit engineering outside the model.",
        cases: ["agents", "automation", "coding"],
      },
      {
        id: "high-volume",
        name: "Repeat work at high volume",
        guidance: "Choose this when the same task must run reliably across many items or requests.",
        examples: "Invoice extraction, content localisation, ticket sorting and catalogue updates.",
        boundary: "Measure successful work after retries and corrections, not token volume alone.",
        cases: ["automation"],
      },
      {
        id: "monitor-events",
        name: "Monitor events and spot changes",
        guidance: "Choose this when new records, exceptions, trends or unusual activity must trigger attention.",
        examples: "SLA breaches, price changes, maintenance alerts, inventory levels and policy updates.",
        boundary: "Choose anomaly detection too when the pattern itself is unknown or suspicious.",
        cases: ["automation", "reasoning", "safety"],
      },
    ],
  },
  {
    name: "Improve and operate",
    prompt: "How will it improve a process and remain dependable?",
    items: [
      {
        id: "process-improvement",
        name: "Find and improve process steps",
        guidance: "Choose this when the application must map work, find delays or redesign a repeatable process.",
        examples: "Bottleneck analysis, target workflows, task allocation, pilot steps and improvement loops.",
        boundary:
          "People, incentives and organisational change remain implementation responsibilities, not model skills.",
        cases: ["reasoning", "agents", "automation"],
      },
      {
        id: "data-quality-lineage",
        name: "Check data quality and lineage",
        guidance: "Choose this when completeness, bias, provenance or changes to data must be inspected.",
        examples: "Missing fields, duplicate records, dataset bias, source lineage and schema drift.",
        boundary:
          "The application should report uncertainty and preserve source records rather than silently repair evidence.",
        cases: ["reasoning", "automation", "safety"],
      },
      {
        id: "service-monitoring",
        name: "Test and monitor AI operation",
        guidance: "Choose this when the application must track output quality, failures, drift or release behaviour.",
        examples: "Acceptance tests, model drift, routing failures, canary releases and incident alerts.",
        boundary: "Use independent telemetry and evaluation tools; a model should not be the sole judge of itself.",
        cases: ["automation", "reasoning", "safety"],
      },
    ],
  },
  {
    name: "Verify and protect",
    prompt: "What must be checked, controlled or escalated?",
    items: [
      {
        id: "validate",
        name: "Check claims and outputs",
        guidance: "Choose this when evidence, corrections, independent review or reliable citations matter.",
        examples: "Fact checks, citation checks, calculation review, safety review and acceptance tests.",
        boundary: "A second model is not automatically independent; use sources, tools and people where needed.",
        cases: ["safety", "reasoning"],
      },
      {
        id: "apply-policies",
        name: "Apply policies, rules or standards",
        guidance: "Choose this when work must be compared with explicit requirements and exceptions recorded.",
        examples: "Contract clauses, internal policy, regulation, quality standards and eligibility rules.",
        boundary: "High-impact interpretations require named ownership and a route to qualified review.",
        cases: ["knowledge", "reasoning", "safety"],
      },
      {
        id: "sensitive-data",
        name: "Handle sensitive data",
        guidance: "Choose this when privacy, access control, local processing or careful data handling is required.",
        examples: "Health, financial, identity, employee, legal and commercially confidential information.",
        boundary: "This changes deployment and controls; it does not prove a model is legally suitable.",
        cases: ["private", "safety"],
      },
      {
        id: "human-review",
        name: "Support human review and escalation",
        guidance: "Choose this when a person must approve, correct, appeal or take responsibility for an outcome.",
        examples: "Medical review, credit exceptions, safety incidents, legal approval and disputed results.",
        boundary: "The interface must give the reviewer evidence, alternatives and authority to stop the process.",
        cases: ["safety", "agents"],
      },
    ],
  },
  {
    name: "Work in place",
    prompt: "Do location, mobility or offline operation change the work?",
    items: [
      {
        id: "geospatial",
        name: "Use maps or geospatial data",
        guidance: "Choose this when location, distance, routes, boundaries or spatial patterns affect the answer.",
        examples: "Site selection, delivery routes, remote sensing, flood maps and field asset planning.",
        boundary: "Use authoritative geographic data and spatial tools for coordinates and measurements.",
        cases: ["vision", "reasoning", "automation"],
      },
      {
        id: "field-mobile",
        name: "Work in the field or offline",
        guidance: "Choose this when connectivity, mobile devices, edge deployment or hands-free use matters.",
        examples: "Maintenance crews, inspections, emergency response, agriculture and remote sites.",
        boundary: "Plan synchronisation, degraded operation and safety when connectivity is unavailable.",
        cases: ["voice", "vision", "private"],
      },
      {
        id: "physical-edge-systems",
        name: "Support physical or edge systems",
        guidance: "Choose this when AI helps supervise equipment, robotics, vehicles or other physical operations.",
        examples: "Predictive maintenance, warehouse robotics, energy systems and navigation support.",
        boundary:
          "Use certified control, fail-safe and human-override systems; a language model must not be the sole controller.",
        cases: ["vision", "automation", "private", "safety"],
      },
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
    needs: ["internal-knowledge", "memory-context", "write-explain", "validate"],
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
    needs: ["documents", "computer-vision", "structured-data", "classify-prioritise", "high-volume", "validate"],
  },
  {
    id: "software-agent",
    name: "Software engineering agent",
    description: "Plans, writes, tests and researches changes across a software project.",
    needs: [
      "code-build",
      "coordinate-work",
      "system-integration",
      "service-monitoring",
      "current-research",
      "validate",
    ],
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
    needs: ["field-mobile", "geospatial", "sensor-streams", "internal-knowledge", "software-tools"],
  },
  {
    id: "regulated-support",
    name: "High-stakes decision support",
    description: "Supports careful decisions with evidence, privacy, checking and human review.",
    needs: ["complex-decisions", "internal-knowledge", "sensitive-data", "human-review", "validate"],
  },
  {
    id: "operations-excellence",
    name: "Business process improvement",
    description: "Finds delays, improves processes and supports reliable day-to-day work.",
    needs: [
      "process-improvement",
      "structured-data",
      "data-quality-lineage",
      "workflow-approvals",
      "monitor-events",
      "high-volume",
      "software-tools",
      "validate",
    ],
  },
  {
    id: "product-comparison",
    name: "Product comparison tool",
    description: "Collects product facts, compares options against clear criteria and explains the trade-offs.",
    needs: ["documents", "current-research", "classify-prioritise", "complex-decisions", "write-explain", "validate"],
  },
  {
    id: "procurement-analyst",
    name: "Procurement and supplier analyst",
    description: "Compares suppliers, contracts, risks, costs and evidence for purchasing decisions.",
    needs: [
      "documents",
      "structured-data",
      "quantitative-analysis",
      "forecast-scenarios",
      "current-research",
      "apply-policies",
      "workflow-approvals",
      "sensitive-data",
      "validate",
    ],
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
    needs: [
      "documents",
      "internal-knowledge",
      "apply-policies",
      "data-quality-lineage",
      "sensitive-data",
      "human-review",
      "validate",
    ],
  },
  {
    id: "data-insight",
    name: "Data insight and reporting assistant",
    description: "Explains trusted data, compares scenarios and prepares clear reports for decisions.",
    needs: [
      "structured-data",
      "data-quality-lineage",
      "quantitative-analysis",
      "forecast-scenarios",
      "write-explain",
      "validate",
    ],
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
    needs: [
      "code-build",
      "current-research",
      "monitor-events",
      "detect-anomalies",
      "service-monitoring",
      "classify-prioritise",
      "complex-decisions",
      "sensitive-data",
      "validate",
    ],
  },
  {
    id: "retail-experience",
    name: "Retail and commerce assistant",
    description: "Supports product discovery, service, content and store or online operations.",
    needs: [
      "internal-knowledge",
      "personalise-recommend",
      "classify-prioritise",
      "many-languages",
      "software-tools",
      "high-volume",
    ],
  },
  {
    id: "finance-insight",
    name: "Financial analysis assistant",
    description: "Compares scenarios, explains results and checks calculations and sources.",
    needs: [
      "documents",
      "structured-data",
      "quantitative-analysis",
      "forecast-scenarios",
      "current-research",
      "validate",
      "sensitive-data",
    ],
  },
  {
    id: "science-research",
    name: "Scientific research assistant",
    description: "Finds literature, works with technical evidence and supports reproducible analysis.",
    needs: [
      "current-research",
      "structured-data",
      "quantitative-analysis",
      "simulate-systems",
      "complex-decisions",
      "documents",
      "validate",
    ],
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
    needs: ["geospatial", "field-mobile", "sensor-streams", "optimise-resources", "forecast-scenarios", "validate"],
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
