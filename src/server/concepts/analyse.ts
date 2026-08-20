import { ARCHETYPES, BUSINESS_GOALS, DOMAINS, INDUSTRIES, NEED_INDEX, type Archetype } from "../../data/taxonomy.js";
import type {
  ConceptDocumentKind,
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
    "image recognition",
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
    "agent workforce",
    "sub-agent",
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
    "cite-or-fail",
    "evidence array",
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
const MAX_ANALYSIS_CHARACTERS = 500_000;

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
    "Audience",
    "Users",
    "Stakeholders",
    "Model",
    "Model guidance",
    "Honesty principle",
    "Architecture note(?: \\(READ THIS FIRST\\))?",
    "Objective",
    "Purpose",
    "Context",
    "Inputs",
    "Outputs",
    "Constraints",
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

function titleFromPurpose(document: ParsedDocument): string {
  const candidates = [document.opening, ...document.lines.slice(0, 12)];
  for (const candidate of candidates) {
    const match =
      /(?:build|application|concept|project|product)\s+(?:specification|paper|brief)?\s*(?:for|:)\s+(?:the\s+)?(.+?)(?:\s+[—–-]\s+|[.!?]|$)/i.exec(
        candidate,
      );
    if (match?.[1] && match[1].length >= 5) return truncate(match[1], 100);
  }
  return "";
}

function inferTitle(document: ParsedDocument, fileName: string): string {
  const explicit = document.lines.find((line) => /^(?:project|application|concept|proposal|title)\s*:/i.test(line));
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
  return truncate(
    (explicit || purpose || firstUseful || fromFile).replace(
      /^(?:project|application|concept|proposal|title)\s*:\s*/i,
      "",
    ),
    100,
  );
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
    .filter((sentence) => phraseCount(normal(sentence), terms) > 0)
    .slice(0, 3);
  const value = truncate(sentences.join(" "));
  return value
    ? {
        value,
        mapping: { source: "Plain-text phrase match", confidence: "medium", method: "plain-text-match" },
      }
    : { value: "" };
}

function inferNeeds(corpus: string): string[] {
  const scored = Object.entries(NEED_ALIASES)
    .map(([id, aliases]) => {
      const title = NEED_INDEX[id]?.name.toLowerCase();
      const score = phraseCount(corpus, aliases) + (title && corpus.includes(title) ? 5 : 0);
      return { id, score };
    })
    .filter((item) => item.score >= 3)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, 12)
    .map((item) => item.id);
  return scored;
}

function inferArchetype(corpus: string, needs: readonly string[]): Archetype {
  const aliases: Record<string, readonly string[]> = {
    "data-insight": ["business intelligence", "data insight", "dashboard", "management reporting"],
    "finance-insight": [
      "financial analysis",
      "finance director",
      "variance review",
      "profit and loss",
      "xero",
      "kpi dashboard",
    ],
    "operations-excellence": ["operational excellence", "business process improvement", "workflow redesign"],
    "research-system": ["research and evidence", "cite-or-fail", "source-grounding", "evidence system"],
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
  return scored[0]?.archetype ?? ARCHETYPES[0];
}

function inferOption(
  corpus: string,
  options: readonly { id: string; name: string }[],
  aliases: Record<string, readonly string[]>,
): string {
  const scored = options
    .map((option) => ({ id: option.id, score: phraseCount(corpus, aliases[option.id] ?? [option.name.toLowerCase()]) }))
    .sort((left, right) => right.score - left.score);
  return scored[0]?.score ? scored[0].id : options[0].id;
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
    "finance director",
    "profit and loss",
    "xero",
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
    "finance director",
    "profit and loss",
    "xero",
  ],
  computing: ["software", "computing", "engineering", "cybersecurity", "api", "code"],
  health: ["health science", "medicine", "clinical", "biology", "patient"],
  physical: ["physics", "chemistry", "mathematics", "materials science"],
  social: ["social science", "law", "legal", "policy", "psychology"],
  arts: ["arts", "design", "humanities", "literature", "creative"],
  earth: ["environment", "geospatial", "earth science", "climate", "geography"],
};

const FIELD_SECTION_TERMS: Record<FieldName, readonly string[]> = {
  objective: ["objective", "purpose", "vision", "intended outcome", "scope summary"],
  context: ["context", "background", "current state", "operating setting", "overview", "rationale"],
  users: ["users and stakeholders", "users", "stakeholders", "audience", "operator"],
  inputs: ["inputs", "input sources", "source map", "data sources", "source refresh", "dividing line"],
  outputs: [
    "outputs",
    "output format",
    "deliverables",
    "approval gate and delivery",
    "report schema",
    "two top-level triggers",
  ],
  constraints: [
    "constraints",
    "requirements",
    "cite-or-fail rule",
    "governing principle",
    "operator decision points",
    "scope policy guard",
  ],
  outOfScope: ["what is not in scope", "not in scope", "out of scope", "exclusions"],
  evaluationCriteria: [
    "evaluation criteria",
    "success criteria",
    "acceptance criteria",
    "integration check",
    "regression baseline",
    "stop condition",
  ],
  edgeCases: ["edge cases", "failure modes", "known limitation", "kpi baseline", "fallback", "stop condition"],
  verificationSteps: ["verification steps", "verification", "integration check", "test", "stop condition"],
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

function documentKind(document: ParsedDocument, corpus: string): ConceptDocumentKind {
  if (
    corpus.includes("build specification") ||
    corpus.includes("implementation specification") ||
    (document.sections.length >= 12 &&
      document.sections.some((section) => /build order|integration check/i.test(section.heading)))
  )
    return "implementation-specification";
  if (
    corpus.includes("requirements document") ||
    document.sections.some((section) =>
      /acceptance criteria|functional requirements|non-functional requirements/i.test(section.heading),
    )
  )
    return "requirements-document";
  if (corpus.includes("concept paper") || document.sections.some((section) => /concept paper/i.test(section.heading)))
    return "concept-paper";
  return "application-brief";
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
  const purpose = document.lines.find((line) =>
    /(?:build|application|concept|project)\s+(?:specification|paper|brief)/i.test(line),
  );
  const architecture = openingLabel(document.opening, ["Architecture note"]);
  const value = truncate([purpose, architecture.value].filter(Boolean).join(" "));
  return value
    ? { value, mapping: { source: "Opening summary", confidence: "medium", method: "opening-summary" } }
    : openingSummary(document);
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
  return mapSections(
    document,
    [
      "architecture summary",
      "two top-level triggers",
      "persistent agents",
      "call tree",
      "workforce hierarchy",
      "team structure",
    ],
    { limit: 5, minimum: 12, maxLength: 3_200 },
  );
}

function existingModelGuidance(document: ParsedDocument): MappedValue {
  return combineMapped(
    openingLabel(document.opening, ["Model", "Model guidance"]),
    mapSections(document, ["model-per-role", "model choice", "model guidance", "supported model"], {
      limit: 1,
      minimum: 12,
    }),
  );
}

/** Turn extracted text into reviewable suggestions without calling a model API. */
export function analyseConceptPaper(
  rawText: string,
  metadata: { fileName: string; fileType: "pdf" | "docx"; pageCount?: number },
): ConceptPaperAnalysis {
  const fullyCleaned = clean(rawText);
  const cleaned = fullyCleaned.slice(0, MAX_ANALYSIS_CHARACTERS);
  const document = parseDocument(cleaned);
  const corpus = normal(cleaned);
  const kind = documentKind(document, corpus);
  let suggestedNeeds = inferNeeds(corpus);
  const archetype = inferArchetype(corpus, suggestedNeeds);
  if (suggestedNeeds.length < 3) suggestedNeeds = [...archetype.needs];

  const highRisk =
    phraseCount(corpus, [
      "high risk",
      "high-risk",
      "safety critical",
      "safety-critical",
      "clinical decision",
      "legal decision",
      "human approval required",
      "materially affect",
      "approval gate",
      "real recommendations to real businesses",
    ]) > 0;
  const lowRisk =
    !highRisk && phraseCount(corpus, ["low risk", "low-risk", "easy to correct", "internal draft only"]) > 0;

  const fieldResults = Object.fromEntries(
    (Object.keys(FIELD_SECTION_TERMS) as FieldName[]).map((field) => [field, mappedField(document, field, kind)]),
  ) as Record<FieldName, MappedValue>;
  const architecture = existingArchitecture(document);
  const modelGuidance = existingModelGuidance(document);
  const summary = openingSummary(document);
  const applicationType = inferTitle(document, metadata.fileName);
  const titlePurpose = titleFromPurpose(document);
  const sourceMappings: Partial<Record<ConceptPaperField, ConceptSourceMapping>> = {
    ...(titlePurpose
      ? {
          applicationType: { source: "Opening summary", confidence: "high", method: "opening-summary" },
        }
      : {}),
  };
  for (const [field, result] of Object.entries(fieldResults) as [FieldName, MappedValue][]) {
    if (result.mapping) sourceMappings[field] = result.mapping;
  }
  if (architecture.mapping) sourceMappings.existingArchitecture = architecture.mapping;
  if (modelGuidance.mapping) sourceMappings.existingModelGuidance = modelGuidance.mapping;

  const positiveOpen = phraseCount(corpus, [
    "open weight",
    "open-weight",
    "open source model",
    "run locally",
    "offline model",
  ]);
  const negativeOpen = phraseCount(corpus, [
    "do not use a local",
    "not use a local",
    "self-hosted one is not in scope",
    "replacing the anthropic model with a self-hosted",
  ]);

  return {
    fileName: metadata.fileName,
    fileType: metadata.fileType,
    extractedCharacters: fullyCleaned.length,
    analysedCharacters: cleaned.length,
    analysisTruncated: fullyCleaned.length > cleaned.length,
    ...(metadata.pageCount ? { pageCount: metadata.pageCount } : {}),
    importedAt: new Date().toISOString(),
    documentKind: kind,
    applicationType,
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
    sourceOutline: document.sections.slice(0, 60).map((section) => section.heading),
    sourceMappings,
    suggestedArchetype: archetype.id,
    suggestedNeeds,
    businessGoal: inferOption(corpus, BUSINESS_GOALS, GOAL_ALIASES),
    industry: inferOption(corpus, INDUSTRIES, INDUSTRY_ALIASES),
    domain: inferOption(corpus, DOMAINS, DOMAIN_ALIASES),
    risk: highRisk ? "high" : lowRisk ? "low" : "medium",
    dataControl:
      phraseCount(corpus, [
        "confidential",
        "sensitive data",
        "personal data",
        "private data",
        "on-premise",
        "on premise",
        "data residency",
        "controlled environment",
        "credential safety",
        "secrets",
      ]) > 0,
    openPreferred: positiveOpen > negativeOpen,
    notes: [
      `Recognised as ${kind.replaceAll("-", " ")}; imported fields are mapped from named sections where possible.`,
      "Suggestions must be reviewed before saving; an empty field means the document did not provide a sufficiently clear match.",
      ...(architecture.value
        ? [
            "An existing team or application architecture was detected and is preserved separately from advisor candidates.",
          ]
        : []),
      ...(fullyCleaned.length > cleaned.length
        ? [
            `Only ${cleaned.length.toLocaleString()} of ${fullyCleaned.length.toLocaleString()} extracted characters were analysed.`,
          ]
        : []),
      "The uploaded file is processed for this import and is not retained by the advisor.",
      ...(metadata.fileType === "pdf"
        ? ["Only the PDF text layer is read; images and handwriting are not interpreted."]
        : []),
    ],
  };
}
