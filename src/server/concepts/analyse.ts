import { ARCHETYPES, BUSINESS_GOALS, DOMAINS, INDUSTRIES, NEED_INDEX, type Archetype } from "../../data/taxonomy.js";
import type {
  ConceptConfidence,
  ConceptDocumentKind,
  ConceptInferenceField,
  ConceptPaperAnalysis,
  ConceptPaperField,
  ConceptSourceMapping,
} from "../../shared/concept-paper.js";

type FieldName =
  | "objective"
  | "context"
  | "users"
  | "inputs"
  | "outputs"
  | "constraints"
  | "outOfScope"
  | "evaluationCriteria"
  | "edgeCases"
  | "verificationSteps";

const FIELD_TERMS: Record<FieldName, readonly string[]> = {
  objective: ["objective", "purpose", "problem", "opportunity", "aim", "vision", "intended outcome"],
  context: ["context", "background", "current state", "situation", "overview", "rationale"],
  users: ["user", "users", "stakeholder", "stakeholders", "audience", "customer", "customers", "operator"],
  inputs: ["input", "inputs", "data", "source", "sources", "document", "documents", "information"],
  outputs: ["output", "outputs", "deliverable", "deliverables", "result", "results", "response", "report"],
  constraints: [
    "constraint",
    "constraints",
    "requirement",
    "requirements",
    "limitation",
    "limitations",
    "must not",
    "non-functional",
    "budget",
    "privacy",
  ],
  outOfScope: ["out of scope", "not in scope", "exclusions", "excluded work", "must not attempt"],
  evaluationCriteria: [
    "evaluation",
    "success criteria",
    "acceptance criteria",
    "measure",
    "measures",
    "metric",
    "metrics",
    "kpi",
    "quality",
  ],
  edgeCases: ["edge case", "edge cases", "risk", "risks", "failure", "failure mode", "exception", "exceptions"],
  verificationSteps: ["verification", "validation", "test", "tests", "testing", "pilot", "review", "assurance"],
};

/** Phrases intentionally describe the application job, not the uploaded file itself. */
const NEED_ALIASES: Record<string, readonly string[]> = {
  documents: ["read contracts", "read reports", "document processing", "document extraction", "forms", "pdf files"],
  "computer-vision": [
    "computer vision",
    "camera image",
    "image analysis",
    "image recognition",
    "object detection",
    "video analysis",
    "camera",
    "photograph",
    "visual inspection",
  ],
  "listen-speak": ["speech", "voice assistant", "transcription", "spoken", "call recording", "audio"],
  "structured-data": [
    "spreadsheet",
    "database records",
    "structured data",
    "tables",
    "transaction data",
    "csv",
    "json",
    "profit and loss",
  ],
  "sensor-streams": ["sensor", "telemetry", "iot", "device events", "equipment readings"],
  "internal-knowledge": [
    "internal knowledge",
    "knowledge base",
    "company policy",
    "organisation policy",
    "private documents",
    "intranet",
  ],
  "current-research": [
    "current research",
    "latest information",
    "web search",
    "market research",
    "external sources",
    "recent evidence",
  ],
  "memory-context": [
    "remember preferences",
    "conversation history",
    "ongoing case",
    "long-term memory",
    "across sessions",
  ],
  "complex-decisions": [
    "decision support",
    "trade-off",
    "tradeoff",
    "multiple criteria",
    "complex decision",
    "recommend a decision",
  ],
  "forecast-scenarios": ["forecast", "scenario", "what-if", "projection", "future demand", "alternative plans"],
  "quantitative-analysis": [
    "calculation",
    "statistics",
    "quantitative",
    "financial model",
    "variance analysis",
    "variance review",
    "profit and loss",
    "kpi",
    "numerical analysis",
    "formula",
  ],
  "classify-prioritise": ["classify", "categorise", "prioritise", "triage", "match records", "rank items"],
  "personalise-recommend": [
    "personalise",
    "personalize",
    "recommendation",
    "next best action",
    "tailored",
    "user preferences",
  ],
  "detect-anomalies": ["anomaly", "fraud", "threat detection", "unusual pattern", "fault detection", "security event"],
  "optimise-resources": ["optimise", "optimize", "route planning", "scheduling", "resource allocation", "roster"],
  "simulate-systems": ["simulation", "digital twin", "system model", "molecular", "traffic model", "climate model"],
  "write-explain": [
    "draft report",
    "write report",
    "summarise",
    "summarize",
    "plain language",
    "generate content",
    "explain",
  ],
  "many-languages": [
    "translation",
    "multilingual",
    "multiple languages",
    "localisation",
    "localization",
    "cross-language",
  ],
  "code-build": ["write code", "software development", "debug", "programming", "source code", "automated tests"],
  "creative-design": [
    "generate images",
    "graphic design",
    "creative direction",
    "illustration",
    "media creation",
    "visual design",
  ],
  "synthetic-data": [
    "synthetic data",
    "test data",
    "artificial examples",
    "simulated records",
    "privacy-preserving data",
  ],
  "software-tools": ["call an api", "use tools", "update records", "take action", "calendar", "ticketing system"],
  "coordinate-work": [
    "multi-step",
    "multiple steps",
    "coordinate",
    "handoff",
    "hand-off",
    "multi-agent",
    "workflow orchestration",
    "agent team",
    "task delegation",
  ],
  "workflow-approvals": [
    "approval workflow",
    "approval step",
    "case workflow",
    "exception path",
    "queue",
    "human approval",
  ],
  "system-integration": [
    "system integration",
    "integrate with",
    "api integration",
    "connect systems",
    "data pipeline",
    "crm",
  ],
  "high-volume": ["high volume", "at scale", "batch processing", "thousands of", "large volume", "peak demand"],
  "monitor-events": [
    "monitor events",
    "real-time alert",
    "real time alert",
    "continuous monitoring",
    "change detection",
    "sla breach",
  ],
  "process-improvement": [
    "process improvement",
    "business process",
    "bottleneck",
    "redesign workflow",
    "operational excellence",
  ],
  "data-quality-lineage": [
    "data quality",
    "data lineage",
    "provenance",
    "missing data",
    "duplicate records",
    "schema drift",
  ],
  "service-monitoring": [
    "model monitoring",
    "ai monitoring",
    "service reliability",
    "model drift",
    "incident alert",
    "canary release",
  ],
  validate: [
    "fact check",
    "validate output",
    "verify claims",
    "quality assurance",
    "citation check",
    "independent check",
    "evidence check",
    "source verification",
  ],
  "apply-policies": [
    "apply policy",
    "policy compliance",
    "regulation",
    "standards",
    "eligibility rules",
    "contract clauses",
  ],
  "sensitive-data": ["personal data", "confidential", "sensitive data", "regulated data", "privacy", "health records"],
  "human-review": [
    "human review",
    "human oversight",
    "human approval",
    "appeal",
    "manual review",
    "responsible person",
    "approval gate",
  ],
  geospatial: ["geospatial", "geographic", "map", "location data", "spatial", "coordinates"],
  "field-mobile": ["offline", "field worker", "mobile device", "remote site", "limited connectivity", "hands-free"],
  "physical-edge-systems": ["edge device", "on-device", "robot", "vehicle", "physical system", "embedded ai"],
};

const HEADING_TERMS = new Set(Object.values(FIELD_TERMS).flat());
const MAX_FIELD = 1_600;
const MAX_INDEX_CHARACTERS = 500_000;
const MAX_EVIDENCE_CHARACTERS = 50_000;
const MAX_SECTION_EVIDENCE = 400;
const MAX_REPRESENTATIVE_SECTIONS = 48;

interface DocumentSection {
  readonly level: number;
  readonly heading: string;
  readonly body: string;
}

interface ParsedDocument {
  readonly lines: readonly string[];
  readonly opening: string;
  readonly sections: readonly DocumentSection[];
  readonly hasStyledHeadings: boolean;
}

interface MappedValue {
  readonly value: string;
  readonly mapping?: ConceptSourceMapping;
}

interface InferredValue<T> {
  readonly value: T;
  readonly confidence: ConceptConfidence;
  readonly score: number;
}

function clean(value: string): string {
  return value
    .replace(/\u0000/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .trim();
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, max = MAX_FIELD): string {
  const compact = oneLine(value);
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function normal(value: string): string {
  return oneLine(value).toLowerCase();
}

function phraseCount(haystack: string, phrases: readonly string[]): number {
  return phrases.reduce((score, phrase) => score + (haystack.includes(phrase) ? (phrase.includes(" ") ? 3 : 1) : 0), 0);
}

function headingKey(line: string): string {
  return normal(
    line
      .replace(/^\[\[H[1-6]\]\]\s*/, "")
      .replace(/^\d+(?:\.\d+)*[.)]?\s*/, "")
      .replace(/[:—-]+$/, ""),
  );
}

function isPlainHeading(line: string): boolean {
  const candidate = headingKey(line);
  if (candidate.length > 72) return false;
  return [...HEADING_TERMS].some((term) => candidate === term || candidate.startsWith(`${term} `));
}

function parseDocument(cleaned: string): ParsedDocument {
  const rawLines = cleaned.split("\n").map(oneLine).filter(Boolean);
  const styled = rawLines.some((line) => /^\[\[H[1-6]\]\]/.test(line));
  const sections: DocumentSection[] = [];
  const opening: string[] = [];
  let current: { level: number; heading: string; body: string[] } | undefined;

  const finish = (): void => {
    if (!current) return;
    sections.push({ level: current.level, heading: current.heading, body: oneLine(current.body.join("\n")) });
  };

  for (const line of rawLines) {
    const marker = /^\[\[H([1-6])\]\]\s*(.+)$/.exec(line);
    const plain = !styled && isPlainHeading(line);
    if (marker || plain) {
      finish();
      current = { level: marker ? Number(marker[1]) : 2, heading: marker ? marker[2] : line, body: [] };
      continue;
    }
    if (current) current.body.push(line);
    else opening.push(line);
  }
  finish();

  const first = sections[0];
  const titleSectionOpening = styled && first?.level === 1 ? first.body : "";
  return {
    lines: rawLines,
    opening: oneLine([opening.join(" "), titleSectionOpening].filter(Boolean).join(" ")),
    sections,
    hasStyledHeadings: styled,
  };
}

function openingLabel(opening: string, labels: readonly string[]): MappedValue {
  const knownLabels = [
    "Title",
    "Project",
    "Application",
    "Proposal",
    "Audience",
    "Users",
    "Stakeholders",
    "Model",
    "Model guidance",
    "Architecture",
    "System design",
    "Objective",
    "Purpose",
    "Aim",
    "Vision",
    "Context",
    "Background",
    "Inputs",
    "Outputs",
    "Constraints",
    "Requirements",
    "Out of scope",
    "Evaluation",
    "Verification",
  ];
  const start = new RegExp(`(?:^|\\s)(?:${labels.join("|")})(?:\\s*\\([^)]{1,60}\\))?[.:]\\s*`, "i").exec(opening);
  if (!start) return { value: "" };
  const tail = opening.slice(start.index + start[0].length);
  const boundary = new RegExp(`\\s+(?:${knownLabels.join("|")})[.:]\\s+`, "i").exec(tail);
  const value = truncate(boundary ? tail.slice(0, boundary.index) : tail);
  if (value.length >= 20) {
    return {
      value,
      mapping: { source: `Opening label: ${labels[0]}`, confidence: "high", method: "opening-label" },
    };
  }
  return { value: "" };
}

function titleFromPurpose(document: ParsedDocument): MappedValue {
  const candidates = [document.opening, ...document.lines.slice(0, 12)];
  for (const candidate of candidates) {
    const match =
      /(?:build|application|concept|project|product)\s+(?:specification|paper|brief)?\s*(?:for|:)\s+(?:the\s+)?(.+?)(?:\s+[—–-]\s+|[.!?]|$)/i.exec(
        candidate,
      );
    if (match?.[1] && match[1].length >= 5) {
      return {
        value: truncate(match[1], 100),
        mapping: { source: "Opening purpose statement", confidence: "medium", method: "opening-summary" },
      };
    }
  }
  return { value: "" };
}

function inferTitle(document: ParsedDocument, fileName: string): MappedValue {
  const explicit = document.lines.find((line) => /^(?:project|application|concept|proposal|title)\s*:/i.test(line));
  const firstSection = document.sections[0];
  const h1 =
    firstSection?.level === 1 && !/\.(?:md|pdf|docx)$/i.test(firstSection.heading) && firstSection.heading.length <= 110
      ? firstSection
      : undefined;
  const purpose = titleFromPurpose(document);
  const firstUseful = document.lines.find(
    (line) =>
      line.length >= 5 &&
      line.length <= 110 &&
      !/^concept paper$/i.test(line) &&
      !/^draft$/i.test(line) &&
      !/^\[\[H[1-6]\]\].*\.md$/i.test(line) &&
      !/\.md$/i.test(line) &&
      !isPlainHeading(line),
  );
  const fromFile = fileName.replace(/\.(?:pdf|docx)$/i, "").replace(/[-_]+/g, " ");
  const value = truncate(
    (explicit || h1?.heading || purpose.value || firstUseful || fromFile).replace(
      /^(?:project|application|concept|proposal|title)\s*:\s*/i,
      "",
    ),
    100,
  );
  const mapping: ConceptSourceMapping = explicit
    ? { source: "Opening title label", confidence: "high", method: "document-title" }
    : h1
      ? { source: h1.heading, confidence: "high", method: "document-title" }
      : purpose.mapping
        ? purpose.mapping
        : firstUseful
          ? { source: "First title-like line", confidence: "low", method: "document-title" }
          : { source: "Filename", confidence: "low", method: "filename" };
  return { value, mapping };
}

function headingScore(heading: string, terms: readonly string[]): number {
  const key = headingKey(heading);
  return terms.reduce((best, term) => {
    const specificity = /[\s-]/.test(term) ? 6 : 0;
    const score =
      key === term
        ? 30 + specificity
        : key.startsWith(`${term} `)
          ? 22 + specificity
          : key.includes(term)
            ? term.includes(" ")
              ? 15 + specificity
              : 7
            : 0;
    return Math.max(best, score);
  }, 0);
}

function mapSections(
  document: ParsedDocument,
  terms: readonly string[],
  options: { limit?: number; minimum?: number; maxLevel?: number; maxLength?: number } = {},
): MappedValue {
  const ranked = document.sections
    .map((section) => ({ section, score: headingScore(section.heading, terms) }))
    .filter(
      ({ section, score }) =>
        score >= (options.minimum ?? 12) &&
        section.body.length >= 20 &&
        (!options.maxLevel || section.level <= options.maxLevel),
    )
    .sort((left, right) => right.score - left.score)
    .slice(0, options.limit ?? 1);
  if (!ranked.length) return { value: "" };
  return {
    value: truncate(
      ranked.map(({ section }) => `${section.heading}: ${section.body}`).join(" "),
      options.maxLength ?? MAX_FIELD,
    ),
    mapping: {
      source: ranked.map(({ section }) => section.heading).join("; "),
      confidence: ranked[0].score >= 22 ? "high" : "medium",
      method: "named-section",
    },
  };
}

function plainTextMatch(document: ParsedDocument, terms: readonly string[]): MappedValue {
  if (document.hasStyledHeadings || document.sections.length >= 5) return { value: "" };
  const sentences = document.lines
    .join(" ")
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/^\s*(?:no|none|not|without)\b/i.test(sentence))
    .filter((sentence) => phraseCount(normal(sentence), terms) > 0)
    .slice(0, 3);
  const value = truncate(sentences.join(" "));
  return value
    ? {
        value,
        mapping: { source: "Plain-text phrase match", confidence: "low", method: "plain-text-match" },
      }
    : { value: "" };
}

function inferNeeds(corpus: string): InferredValue<string[]> {
  const scored = Object.entries(NEED_ALIASES)
    .map(([id, aliases]) => {
      const title = NEED_INDEX[id]?.name.toLowerCase();
      const score = phraseCount(corpus, aliases) + (title && corpus.includes(title) ? 5 : 0);
      return { id, score };
    })
    .filter((item) => item.score >= 2)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, 12);
  const score = scored.reduce((total, item) => total + item.score, 0);
  return {
    value: scored.map((item) => item.id),
    score,
    confidence: !scored.length ? "none" : scored.length >= 3 && scored[0].score >= 6 ? "high" : "medium",
  };
}

function inferArchetype(corpus: string, needs: readonly string[]): InferredValue<Archetype> {
  const aliases: Record<string, readonly string[]> = {
    "data-insight": ["business intelligence", "data insight", "dashboard", "management reporting"],
    "finance-insight": [
      "financial analysis",
      "financial reporting",
      "variance analysis",
      "profit and loss",
      "budget analysis",
      "management accounting",
    ],
    "operations-excellence": ["operational excellence", "business process improvement", "workflow redesign"],
    "research-system": ["research and evidence", "source verification", "source-grounding", "evidence system"],
    "software-agent": ["software engineering", "build agent", "source code", "automated tests"],
  };
  const scored = ARCHETYPES.map((archetype) => {
    const overlap = archetype.needs.filter((need) => needs.includes(need)).length;
    const nameWords = archetype.name
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 4);
    const descriptionWords = archetype.description
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 6);
    const language = [...nameWords, ...descriptionWords].reduce(
      (score, word) => score + (corpus.includes(word) ? 1 : 0),
      0,
    );
    const explicit = phraseCount(corpus, aliases[archetype.id] ?? []);
    return { archetype, score: overlap * 4 + language + explicit * 5 };
  }).sort((left, right) => right.score - left.score);
  const best = scored[0] ?? { archetype: ARCHETYPES[0], score: 0 };
  return {
    value: best.archetype,
    score: best.score,
    confidence: best.score >= 14 ? "high" : best.score >= 5 ? "medium" : best.score > 0 ? "low" : "none",
  };
}

function inferOption(
  corpus: string,
  options: readonly { id: string; name: string }[],
  aliases: Record<string, readonly string[]>,
): InferredValue<string> {
  const scored = options
    .map((option) => ({ id: option.id, score: phraseCount(corpus, aliases[option.id] ?? [option.name.toLowerCase()]) }))
    .sort((left, right) => right.score - left.score);
  const best = scored[0] ?? { id: options[0].id, score: 0 };
  return {
    value: best.id,
    score: best.score,
    confidence: best.score >= 6 ? "high" : best.score > 0 ? "medium" : "none",
  };
}

const GOAL_ALIASES: Record<string, readonly string[]> = {
  service: ["customer service", "user service", "support experience", "service quality"],
  growth: ["sales", "revenue", "growth", "conversion", "market share"],
  operations: [
    "operational efficiency",
    "operational excellence",
    "productivity",
    "reduce cycle time",
    "process improvement",
  ],
  risk: ["reduce risk", "compliance", "assurance", "safety", "fraud", "governance"],
  innovation: ["innovation", "research", "prototype", "experiment", "new capability"],
  sustainability: ["sustainability", "environmental", "public value", "social impact", "emissions"],
};

const INDUSTRY_ALIASES: Record<string, readonly string[]> = {
  retail: ["retail", "commerce", "store", "shopping", "product catalogue"],
  financial: [
    "bank",
    "financial services",
    "insurance",
    "investment",
    "lending",
    "accounting",
    "profit and loss",
    "financial reporting",
  ],
  health: ["health", "clinical", "hospital", "patient", "medical"],
  education: ["education", "school", "university", "student", "learning"],
  manufacturing: ["manufacturing", "factory", "production line", "industrial equipment"],
  government: ["government", "public service", "council", "agency", "citizen"],
  creative: ["media", "creative industries", "advertising", "publishing", "entertainment"],
  energy: ["energy", "utility", "electricity", "power grid", "oil and gas"],
  transport: ["transport", "logistics", "freight", "fleet", "warehouse"],
  agriculture: ["agriculture", "farm", "food production", "crop", "livestock"],
  professional: ["professional services", "consulting", "legal practice", "accounting"],
  science: ["scientific", "laboratory", "research institute", "engineering research"],
};

const DOMAIN_ALIASES: Record<string, readonly string[]> = {
  business: ["business", "management", "operations", "marketing", "procurement"],
  finance: [
    "finance",
    "economics",
    "accounting",
    "investment",
    "budget",
    "financial analysis",
    "profit and loss",
    "financial reporting",
  ],
  computing: ["software", "computing", "engineering", "cybersecurity", "api", "code"],
  health: ["health science", "medicine", "clinical", "biology", "patient"],
  physical: ["physics", "chemistry", "mathematics", "materials science"],
  social: ["social science", "law", "legal", "policy", "psychology"],
  arts: ["arts", "design", "humanities", "literature", "creative"],
  earth: ["environment", "geospatial", "earth science", "climate", "geography"],
};

const FIELD_SECTION_TERMS: Record<FieldName, readonly string[]> = {
  objective: ["objective", "purpose", "aim", "vision", "intended outcome", "problem statement", "opportunity"],
  context: ["context", "background", "current state", "operating environment", "overview", "rationale"],
  users: ["users and stakeholders", "users", "stakeholders", "audience", "people", "customers", "operators"],
  inputs: [
    "inputs",
    "input sources",
    "data inputs",
    "data sources",
    "information sources",
    "source systems",
    "source map",
  ],
  outputs: ["outputs", "output format", "deliverables", "required results", "results", "responses", "reports"],
  constraints: [
    "constraints",
    "requirements",
    "non-functional requirements",
    "limitations",
    "rules",
    "guardrails",
    "dependencies",
  ],
  outOfScope: ["what is not in scope", "not in scope", "out of scope", "exclusions", "boundaries"],
  evaluationCriteria: ["evaluation criteria", "success criteria", "acceptance criteria", "measures", "metrics"],
  edgeCases: ["edge cases", "failure modes", "risks", "exceptions", "fallbacks", "known limitations"],
  verificationSteps: [
    "verification steps",
    "verification",
    "validation plan",
    "test plan",
    "integration check",
    "integration test",
    "testing",
    "assurance",
  ],
};

function combineMapped(...values: readonly MappedValue[]): MappedValue {
  const populated = values.filter((item) => item.value);
  if (!populated.length) return { value: "" };
  const mappings = populated.flatMap((item) => (item.mapping ? [item.mapping] : []));
  return {
    value: truncate(populated.map((item) => item.value).join(" ")),
    ...(mappings.length
      ? {
          mapping: {
            source: [...new Set(mappings.map((item) => item.source))].join("; "),
            confidence: mappings.every((item) => item.confidence === "high") ? "high" : "medium",
            method: mappings[0].method,
          } satisfies ConceptSourceMapping,
        }
      : {}),
  };
}

function documentKind(document: ParsedDocument): { kind: ConceptDocumentKind; confidence: ConceptConfidence } {
  const structuralText = normal(
    [document.opening.slice(0, 4_000), ...document.sections.map((section) => section.heading)].join(" "),
  );
  const signals: Record<ConceptDocumentKind, readonly string[]> = {
    "implementation-specification": [
      "implementation specification",
      "technical specification",
      "build specification",
      "architecture",
      "solution architecture",
      "system architecture",
      "technical design",
      "build plan",
      "deployment plan",
      "implementation plan",
    ],
    "requirements-document": [
      "requirements document",
      "business requirements",
      "functional requirements",
      "non-functional requirements",
      "acceptance criteria",
      "mandatory requirements",
    ],
    "concept-paper": [
      "concept paper",
      "concept note",
      "business case",
      "project proposal",
      "problem statement",
      "opportunity statement",
    ],
    "application-brief": ["application brief", "project brief", "product brief", "design brief", "solution brief"],
  };
  const ranked = (Object.entries(signals) as [ConceptDocumentKind, readonly string[]][])
    .map(([kind, phrases]) => ({ kind, score: phraseCount(structuralText, phrases) }))
    .sort((left, right) => right.score - left.score);
  if (!ranked[0]?.score) return { kind: "application-brief", confidence: "low" };
  return { kind: ranked[0].kind, confidence: ranked[0].score >= 6 ? "high" : "medium" };
}

function openingSummary(document: ParsedDocument): MappedValue {
  const value = truncate(
    document.opening ||
      document.sections
        .slice(0, 2)
        .map((section) => section.body)
        .join(" "),
  );
  return value
    ? { value, mapping: { source: "Opening summary", confidence: "medium", method: "opening-summary" } }
    : { value: "" };
}

function openingObjective(document: ParsedDocument): MappedValue {
  const labelled = openingLabel(document.opening, ["Objective", "Purpose", "Aim", "Vision"]);
  if (labelled.value) return labelled;
  if (document.sections.length >= 5 || document.opening.length > 3_000) return { value: "" };
  const summary = openingSummary(document);
  if (!/\b(?:build|create|develop|design|provide|enable|improve|automate|support|deliver)\b/i.test(summary.value)) {
    return { value: "" };
  }
  return summary.value
    ? {
        value: summary.value,
        mapping: { source: "Opening summary", confidence: "low", method: "opening-summary" },
      }
    : { value: "" };
}

function mappedField(document: ParsedDocument, field: FieldName, kind: ConceptDocumentKind): MappedValue {
  if (field === "users") {
    const audience = openingLabel(document.opening, ["Audience", "Users", "Stakeholders"]);
    if (audience.value) return audience;
  }
  const named = mapSections(document, FIELD_SECTION_TERMS[field], {
    limit: field === "constraints" || field === "edgeCases" || field === "evaluationCriteria" ? 2 : 1,
    ...(field === "objective" && kind === "implementation-specification" ? { maxLevel: 2 } : {}),
  });
  if (named.value) return named;
  if (field === "objective") return openingObjective(document);
  return plainTextMatch(document, FIELD_TERMS[field]);
}

function existingArchitecture(document: ParsedDocument): MappedValue {
  return combineMapped(
    openingLabel(document.opening, ["Architecture", "Architecture note", "System design"]),
    mapSections(
      document,
      [
        "architecture",
        "architecture overview",
        "solution architecture",
        "system architecture",
        "technical architecture",
        "technical design",
        "solution design",
        "system design",
        "system components",
        "component diagram",
        "agent roles",
        "model roles",
        "team structure",
        "workflow architecture",
        "orchestration",
        "integration architecture",
        "data flow",
        "call flow",
      ],
      { limit: 4, minimum: 12, maxLength: 3_200 },
    ),
  );
}

function existingModelGuidance(document: ParsedDocument): MappedValue {
  return combineMapped(
    openingLabel(document.opening, ["Model", "Model guidance"]),
    mapSections(
      document,
      ["model selection", "model choices", "model guidance", "model requirements", "model policy", "model-per-role"],
      {
        limit: 2,
        minimum: 15,
      },
    ),
  );
}

/** Build a bounded, representative evidence set instead of treating every word as equally relevant. */
function evidenceCorpus(document: ParsedDocument, mapped: readonly MappedValue[]): string {
  const representativeSections =
    document.sections.length <= MAX_REPRESENTATIVE_SECTIONS
      ? document.sections
      : Array.from({ length: MAX_REPRESENTATIVE_SECTIONS }, (_, index) =>
          Math.round((index * (document.sections.length - 1)) / (MAX_REPRESENTATIVE_SECTIONS - 1)),
        ).map((index) => document.sections[index]);
  const structuralEvidence = representativeSections.map(
    (section) => `${section.heading}: ${section.body.slice(0, MAX_SECTION_EVIDENCE)}`,
  );
  const unstructured = document.lines.join(" ");
  const sample = (position: number): string => {
    const start = Math.max(0, Math.round((unstructured.length - 12_000) * position));
    return unstructured.slice(start, start + 12_000);
  };
  const unstructuredEvidence = document.sections.length ? [] : [sample(0), sample(0.5), sample(1)];
  const chunks = [
    document.opening.slice(0, 6_000),
    ...mapped.map((item) => item.value),
    ...structuralEvidence,
    ...unstructuredEvidence,
  ]
    .map(oneLine)
    .filter(Boolean);
  return oneLine([...new Set(chunks)].join("\n")).slice(0, MAX_EVIDENCE_CHARACTERS);
}

function positiveSignalCorpus(evidence: string): string {
  return normal(
    evidence
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => !/^\s*(?:no|none|not|without)\b/i.test(sentence))
      .join(" "),
  );
}

function negatedPreferenceCount(corpus: string, subject: string): number {
  const pattern = new RegExp(
    `\\b(?:do not|don't|must not|should not|not required|without|exclude|avoid)\\b[^.!?]{0,80}\\b(?:${subject})\\b`,
    "gi",
  );
  return [...corpus.matchAll(pattern)].length * 3;
}

function reviewList(
  fields: Record<FieldName, MappedValue>,
  confidence: Record<ConceptInferenceField, ConceptConfidence>,
): string[] {
  const labels: Record<FieldName, string> = {
    objective: "Objective",
    context: "Context",
    users: "People and users",
    inputs: "Inputs",
    outputs: "Outputs",
    constraints: "Constraints",
    outOfScope: "Out of scope",
    evaluationCriteria: "Evaluation criteria",
    edgeCases: "Edge cases",
    verificationSteps: "Verification",
  };
  const fieldReview = (Object.entries(fields) as [FieldName, MappedValue][]).flatMap(([field, result]) =>
    !result.value
      ? [`${labels[field]} was not found in a clearly named section.`]
      : result.mapping?.confidence === "low"
        ? [`${labels[field]} came from a weak plain-text match.`]
        : [],
  );
  const suggestionLabels: Partial<Record<ConceptInferenceField, string>> = {
    applicationType: "Application name",
    suggestedArchetype: "Starting application type",
    suggestedNeeds: "Skills",
    businessGoal: "Business goal",
    industry: "Industry",
    domain: "Knowledge area",
    risk: "Risk level",
    dataControl: "Data-control preference",
    openPreferred: "Open or local model preference",
  };
  const suggestionReview = (Object.entries(suggestionLabels) as [ConceptInferenceField, string][]).flatMap(
    ([field, label]) =>
      confidence[field] === "none"
        ? [`${label} was not explicitly supported by the selected evidence.`]
        : confidence[field] === "low"
          ? [`${label} is a low-confidence suggestion.`]
          : [],
  );
  return [...fieldReview, ...suggestionReview];
}

/** Turn an arbitrary project document into bounded, reviewable suggestions without calling a model API. */
export function analyseConceptPaper(
  rawText: string,
  metadata: { fileName: string; fileType: "pdf" | "docx"; pageCount?: number },
): ConceptPaperAnalysis {
  const fullyCleaned = clean(rawText);
  const indexed = fullyCleaned.slice(0, MAX_INDEX_CHARACTERS);
  const document = parseDocument(indexed);
  const kind = documentKind(document);
  const fieldResults = Object.fromEntries(
    (Object.keys(FIELD_SECTION_TERMS) as FieldName[]).map((field) => [field, mappedField(document, field, kind.kind)]),
  ) as Record<FieldName, MappedValue>;
  const architecture = existingArchitecture(document);
  const modelGuidance = existingModelGuidance(document);
  const evidence = evidenceCorpus(document, [...Object.values(fieldResults), architecture, modelGuidance]);
  const corpus = normal(evidence);
  const positiveCorpus = positiveSignalCorpus(evidence);
  const needs = inferNeeds(positiveCorpus);
  const archetype = inferArchetype(positiveCorpus, needs.value);
  const businessGoal = inferOption(positiveCorpus, BUSINESS_GOALS, GOAL_ALIASES);
  const industry = inferOption(positiveCorpus, INDUSTRIES, INDUSTRY_ALIASES);
  const domain = inferOption(positiveCorpus, DOMAINS, DOMAIN_ALIASES);
  const title = inferTitle(document, metadata.fileName);
  const summary = openingSummary(document);

  const highRiskScore = phraseCount(corpus, [
    "high risk",
    "high-risk",
    "safety critical",
    "safety-critical",
    "clinical decision",
    "legal decision",
    "consequential decision",
    "human approval required",
    "human approval gate",
  ]);
  const lowRiskScore = phraseCount(corpus, ["low risk", "low-risk", "easy to correct", "internal draft only"]);
  const risk: "low" | "medium" | "high" = highRiskScore ? "high" : lowRiskScore ? "low" : "medium";
  const riskConfidence: ConceptConfidence =
    highRiskScore >= 6 || lowRiskScore >= 6 ? "high" : highRiskScore || lowRiskScore ? "medium" : "none";

  const dataControlPositive = phraseCount(corpus, [
    "confidential",
    "sensitive data",
    "personal data",
    "private data",
    "on-premise",
    "on premise",
    "data residency",
    "controlled environment",
    "credentials",
    "secrets",
  ]);
  const dataControlNegative = phraseCount(corpus, ["public data only", "no sensitive data", "no confidential data"]);
  const dataControl = dataControlPositive > dataControlNegative;
  const dataControlConfidence: ConceptConfidence =
    dataControlPositive || dataControlNegative
      ? Math.max(dataControlPositive, dataControlNegative) >= 6
        ? "high"
        : "medium"
      : "none";

  const openPositive = phraseCount(corpus, [
    "open weight",
    "open-weight",
    "open source model",
    "run locally",
    "local model",
    "self-hosted model",
    "offline model",
  ]);
  const openNegative = negatedPreferenceCount(
    corpus,
    "open[- ]weight|open source model|local(?:\\s+[a-z0-9-]+){0,3}\\s+model|run locally|self-hosted model|offline model",
  );
  const openPreferred = openPositive > openNegative;
  const openConfidence: ConceptConfidence =
    openPositive || openNegative ? (Math.max(openPositive, openNegative) >= 6 ? "high" : "medium") : "none";

  const sourceMappings: Partial<Record<ConceptPaperField, ConceptSourceMapping>> = {
    ...(title.mapping ? { applicationType: title.mapping } : {}),
  };
  for (const [field, result] of Object.entries(fieldResults) as [FieldName, MappedValue][]) {
    if (result.mapping) sourceMappings[field] = result.mapping;
  }
  if (architecture.mapping) sourceMappings.existingArchitecture = architecture.mapping;
  if (modelGuidance.mapping) sourceMappings.existingModelGuidance = modelGuidance.mapping;

  const inferenceConfidence: Record<ConceptInferenceField, ConceptConfidence> = {
    documentKind: kind.confidence,
    applicationType: title.mapping?.confidence ?? "none",
    suggestedArchetype: archetype.confidence,
    suggestedNeeds: needs.confidence,
    businessGoal: businessGoal.confidence,
    industry: industry.confidence,
    domain: domain.confidence,
    risk: riskConfidence,
    dataControl: dataControlConfidence,
    openPreferred: openConfidence,
  };

  return {
    fileName: metadata.fileName,
    fileType: metadata.fileType,
    extractedCharacters: fullyCleaned.length,
    indexedCharacters: indexed.length,
    analysedCharacters: evidence.length,
    analysisTruncated: fullyCleaned.length > indexed.length,
    ...(metadata.pageCount ? { pageCount: metadata.pageCount } : {}),
    importedAt: new Date().toISOString(),
    documentKind: kind.kind,
    applicationType: title.value,
    summary: summary.value,
    objective: fieldResults.objective.value,
    context: fieldResults.context.value,
    users: fieldResults.users.value,
    inputs: fieldResults.inputs.value,
    outputs: fieldResults.outputs.value,
    constraints: fieldResults.constraints.value,
    outOfScope: fieldResults.outOfScope.value,
    evaluationCriteria: fieldResults.evaluationCriteria.value,
    edgeCases: fieldResults.edgeCases.value,
    verificationSteps: fieldResults.verificationSteps.value,
    existingArchitecture: architecture.value,
    existingModelGuidance: modelGuidance.value,
    sourceOutline: document.sections.slice(0, 80).map((section) => section.heading),
    sourceMappings,
    analysisStrategy: "structure-first-v1",
    inferenceConfidence,
    reviewRequired: reviewList(fieldResults, inferenceConfidence),
    suggestedArchetype: archetype.value.id,
    suggestedNeeds: needs.value,
    businessGoal: businessGoal.value,
    industry: industry.value,
    domain: domain.value,
    risk,
    dataControl,
    openPreferred,
    notes: [
      `The document structure was indexed, then ${evidence.length.toLocaleString()} characters of relevant and representative evidence were selected for suggestions.`,
      `Recognised as ${kind.kind.replaceAll("-", " ")} with ${kind.confidence} confidence.`,
      "Named sections are preferred. Plain-text matches are marked low confidence, and missing fields are left for review.",
      ...(architecture.value
        ? ["An existing team or application architecture was preserved separately from advisor candidates."]
        : []),
      ...(fullyCleaned.length > indexed.length
        ? [`The source exceeded the indexing limit; ${indexed.length.toLocaleString()} characters were indexed.`]
        : []),
      "The uploaded file is processed for this import and is not retained by the advisor.",
      ...(metadata.fileType === "pdf"
        ? ["Only the PDF text layer is read; images and handwriting are not interpreted."]
        : []),
    ],
  };
}
