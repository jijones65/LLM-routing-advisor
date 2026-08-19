import { ARCHETYPES, BUSINESS_GOALS, DOMAINS, INDUSTRIES, NEED_INDEX, type Archetype } from "../../data/taxonomy.js";
import type { ConceptPaperAnalysis } from "../../shared/concept-paper.js";

type FieldName =
  | "objective"
  | "context"
  | "users"
  | "inputs"
  | "outputs"
  | "constraints"
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
  "structured-data": ["spreadsheet", "database records", "structured data", "tables", "transaction data", "csv"],
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
  ],
  geospatial: ["geospatial", "geographic", "map", "location data", "spatial", "coordinates"],
  "field-mobile": ["offline", "field worker", "mobile device", "remote site", "limited connectivity", "hands-free"],
  "physical-edge-systems": ["edge device", "on-device", "robot", "vehicle", "physical system", "embedded ai"],
};

const HEADING_TERMS = new Set(Object.values(FIELD_TERMS).flat());
const MAX_FIELD = 1_200;

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

function isHeading(line: string): boolean {
  const candidate = normal(line.replace(/^\d+(?:\.\d+)*[.)]?\s*/, "").replace(/[:—-]+$/, ""));
  if (candidate.length > 72) return false;
  return [...HEADING_TERMS].some((term) => candidate === term || candidate.startsWith(`${term} `));
}

function sectionValue(lines: readonly string[], terms: readonly string[]): string {
  for (let index = 0; index < lines.length; index += 1) {
    const candidate = normal(lines[index].replace(/^\d+(?:\.\d+)*[.)]?\s*/, "").replace(/[:—-]+$/, ""));
    if (!terms.some((term) => candidate === term || candidate.startsWith(`${term} `))) continue;
    const collected: string[] = [];
    for (let cursor = index + 1; cursor < lines.length && collected.length < 6; cursor += 1) {
      if (isHeading(lines[cursor])) break;
      collected.push(lines[cursor]);
    }
    const result = truncate(collected.join(" "));
    if (result.length >= 20) return result;
  }

  const sentences = lines
    .join(" ")
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => phraseCount(normal(sentence), terms) > 0)
    .slice(0, 3);
  return truncate(sentences.join(" "));
}

function inferTitle(lines: readonly string[], fileName: string): string {
  const explicit = lines.find((line) => /^(?:project|application|concept|proposal|title)\s*:/i.test(line));
  const firstUseful = lines.find(
    (line) =>
      line.length >= 5 &&
      line.length <= 110 &&
      !/^concept paper$/i.test(line) &&
      !/^draft$/i.test(line) &&
      !isHeading(line),
  );
  const fromFile = fileName.replace(/\.(?:pdf|docx)$/i, "").replace(/[-_]+/g, " ");
  return truncate(
    (explicit ?? firstUseful ?? fromFile).replace(/^(?:project|application|concept|proposal|title)\s*:\s*/i, ""),
    100,
  );
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
    return { archetype, score: overlap * 4 + language };
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
  financial: ["bank", "financial services", "insurance", "investment", "lending"],
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
  finance: ["finance", "economics", "accounting", "investment", "budget"],
  computing: ["software", "computing", "engineering", "cybersecurity", "api", "code"],
  health: ["health science", "medicine", "clinical", "biology", "patient"],
  physical: ["physics", "chemistry", "mathematics", "materials science"],
  social: ["social science", "law", "legal", "policy", "psychology"],
  arts: ["arts", "design", "humanities", "literature", "creative"],
  earth: ["environment", "geospatial", "earth science", "climate", "geography"],
};

/** Turn extracted text into reviewable suggestions without calling a model API. */
export function analyseConceptPaper(
  rawText: string,
  metadata: { fileName: string; fileType: "pdf" | "docx"; pageCount?: number },
): ConceptPaperAnalysis {
  const cleaned = clean(rawText).slice(0, 120_000);
  const lines = cleaned.split("\n").map(oneLine).filter(Boolean);
  const corpus = normal(cleaned);
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
    ]) > 0;
  const lowRisk =
    !highRisk && phraseCount(corpus, ["low risk", "low-risk", "easy to correct", "internal draft only"]) > 0;
  const summaryParagraphs = cleaned
    .split(/\n\s*\n+/)
    .map(oneLine)
    .filter((paragraph) => paragraph.length >= 25 && !isHeading(paragraph))
    .slice(0, 3)
    .join(" ");
  const fields = Object.fromEntries(
    Object.entries(FIELD_TERMS).map(([name, terms]) => [name, sectionValue(lines, terms)]),
  ) as Record<FieldName, string>;
  const fallbackSummary = truncate(summaryParagraphs || lines.slice(0, 8).join(" "));

  return {
    fileName: metadata.fileName,
    fileType: metadata.fileType,
    extractedCharacters: cleaned.length,
    ...(metadata.pageCount ? { pageCount: metadata.pageCount } : {}),
    importedAt: new Date().toISOString(),
    applicationType: inferTitle(lines, metadata.fileName),
    summary: fallbackSummary,
    objective: fields.objective || fallbackSummary,
    context: fields.context,
    users: fields.users,
    inputs: fields.inputs,
    outputs: fields.outputs,
    constraints: fields.constraints,
    evaluationCriteria: fields.evaluationCriteria,
    edgeCases: fields.edgeCases,
    verificationSteps: fields.verificationSteps,
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
      ]) > 0,
    openPreferred:
      phraseCount(corpus, [
        "open weight",
        "open-weight",
        "open source model",
        "local model",
        "run locally",
        "offline model",
      ]) > 0,
    notes: [
      "Suggestions come from phrases in the document and must be reviewed before saving the team.",
      "The uploaded file is processed for this import and is not retained by the advisor.",
      ...(metadata.fileType === "pdf"
        ? ["Only the PDF text layer is read; images and handwriting are not interpreted."]
        : []),
    ],
  };
}
