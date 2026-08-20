export type ConceptDocumentKind =
  "concept-paper" | "application-brief" | "requirements-document" | "implementation-specification";

export type ConceptPaperField =
  | "applicationType"
  | "objective"
  | "context"
  | "users"
  | "inputs"
  | "outputs"
  | "constraints"
  | "outOfScope"
  | "evaluationCriteria"
  | "edgeCases"
  | "verificationSteps"
  | "existingArchitecture"
  | "existingModelGuidance";

export interface ConceptSourceMapping {
  readonly source: string;
  readonly confidence: "high" | "medium";
  readonly method: "named-section" | "opening-label" | "opening-summary" | "plain-text-match";
}

/** Structured, reviewable facts inferred from an uploaded project document. */
export interface ConceptPaperAnalysis {
  readonly fileName: string;
  readonly fileType: "pdf" | "docx";
  readonly extractedCharacters: number;
  readonly analysedCharacters: number;
  readonly analysisTruncated: boolean;
  readonly pageCount?: number;
  readonly importedAt: string;
  readonly documentKind: ConceptDocumentKind;
  readonly applicationType: string;
  readonly summary: string;
  readonly objective: string;
  readonly context: string;
  readonly users: string;
  readonly inputs: string;
  readonly outputs: string;
  readonly constraints: string;
  readonly outOfScope: string;
  readonly evaluationCriteria: string;
  readonly edgeCases: string;
  readonly verificationSteps: string;
  readonly existingArchitecture: string;
  readonly existingModelGuidance: string;
  readonly sourceOutline: readonly string[];
  readonly sourceMappings: Readonly<Partial<Record<ConceptPaperField, ConceptSourceMapping>>>;
  readonly suggestedArchetype: string;
  readonly suggestedNeeds: readonly string[];
  readonly businessGoal: string;
  readonly industry: string;
  readonly domain: string;
  readonly risk: "low" | "medium" | "high";
  readonly dataControl: boolean;
  readonly openPreferred: boolean;
  readonly notes: readonly string[];
}
