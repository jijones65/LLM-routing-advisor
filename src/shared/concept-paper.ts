/** Structured facts inferred from an uploaded concept paper. */
export interface ConceptPaperAnalysis {
  readonly fileName: string;
  readonly fileType: "pdf" | "docx";
  readonly extractedCharacters: number;
  readonly pageCount?: number;
  readonly importedAt: string;
  readonly applicationType: string;
  readonly summary: string;
  readonly objective: string;
  readonly context: string;
  readonly users: string;
  readonly inputs: string;
  readonly outputs: string;
  readonly constraints: string;
  readonly evaluationCriteria: string;
  readonly edgeCases: string;
  readonly verificationSteps: string;
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
