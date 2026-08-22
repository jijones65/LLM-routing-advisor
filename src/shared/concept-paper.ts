export type ConceptDocumentKind =
  "concept-paper" | "application-brief" | "requirements-document" | "implementation-specification";

export type ConceptConfidence = "high" | "medium" | "low" | "none";

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
  readonly sourceIds?: readonly string[];
  readonly confidence: Exclude<ConceptConfidence, "none">;
  readonly method:
    "named-section" | "opening-label" | "opening-summary" | "plain-text-match" | "document-title" | "filename";
}

export interface ConceptAdditionalSourceSection {
  readonly heading: string;
  readonly content: string;
  readonly sourceLevel: number;
  readonly truncated: boolean;
}

export type ConceptSourceBlockKind = "paragraph" | "list-item" | "code" | "table-row" | "image";

/** One ordered, text-bearing unit retained from the uploaded document. */
export interface ConceptSourceBlock {
  readonly kind: ConceptSourceBlockKind;
  readonly text: string;
  readonly ordered?: boolean;
  readonly level?: number;
  readonly cells?: readonly string[];
}

/** A source section with its original heading level and ordered body blocks. */
export interface ConceptSourceSection {
  readonly id: string;
  readonly heading: string;
  readonly sourceLevel: number;
  readonly blocks: readonly ConceptSourceBlock[];
}

export interface ConceptSourceCoverage {
  readonly extractedTextCharacters: number;
  readonly retainedTextCharacters: number;
  readonly retainedTextPercent: number;
  readonly wordCount: number;
  readonly headingCount: number;
  readonly blockCount: number;
  readonly paragraphCount: number;
  readonly listItemCount: number;
  readonly codeBlockCount: number;
  readonly tableRowCount: number;
  readonly imagePlaceholderCount: number;
  readonly evidenceCharacters: number;
  readonly evidencePercent: number;
  readonly sourceIndexTruncated: boolean;
  readonly visualReviewRequired: boolean;
}

/** Complete ordered text structure retained independently of recommendation mapping. */
export interface ConceptSourceDocument {
  readonly openingBlocks: readonly ConceptSourceBlock[];
  readonly sections: readonly ConceptSourceSection[];
  readonly coverage: ConceptSourceCoverage;
}

export type ConceptInferenceField =
  | "documentKind"
  | "applicationType"
  | "suggestedArchetype"
  | "suggestedNeeds"
  | "businessGoal"
  | "industry"
  | "domain"
  | "risk"
  | "dataControl"
  | "openPreferred";

export interface StoredSourceFile {
  readonly path: string;
  readonly name: string;
  readonly size: number;
  readonly mimeType: string;
  readonly createdAt: string;
}

/** Structured, reviewable facts inferred from an uploaded project document. */
export interface ConceptPaperAnalysis {
  readonly fileName: string;
  readonly fileType: "pdf" | "docx";
  readonly extractedCharacters: number;
  /** Characters indexed to find headings and representative sections. */
  readonly indexedCharacters: number;
  /** Characters in the bounded evidence set used for suggestions. */
  readonly analysedCharacters: number;
  /** True only when the source was too large to index completely. */
  readonly analysisTruncated: boolean;
  /** True when recommendation inference used a representative subset of retained text. */
  readonly evidenceIsSampled: boolean;
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
  /** Useful named sections that did not map into a standard specification field. */
  readonly additionalSourceMaterial: readonly ConceptAdditionalSourceSection[];
  readonly additionalSourceSectionsOmitted: number;
  /** Full ordered source structure used by import format 1.2 and later. */
  readonly sourceDocument: ConceptSourceDocument;
  readonly sourceOutline: readonly string[];
  readonly sourceMappings: Readonly<Partial<Record<ConceptPaperField, ConceptSourceMapping>>>;
  readonly analysisStrategy: "structure-first-v1" | "structure-first-v2";
  readonly inferenceConfidence: Readonly<Record<ConceptInferenceField, ConceptConfidence>>;
  readonly reviewRequired: readonly string[];
  readonly suggestedArchetype: string;
  readonly suggestedNeeds: readonly string[];
  readonly businessGoal: string;
  readonly industry: string;
  readonly domain: string;
  readonly risk: "low" | "medium" | "high";
  readonly dataControl: boolean;
  readonly openPreferred: boolean;
  readonly notes: readonly string[];
  /** Private account-storage pointer added by the signed-in browser after analysis. */
  readonly storedFile?: StoredSourceFile;
}
