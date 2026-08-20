import mammoth from "mammoth/mammoth.browser.js";
import { extractText } from "unpdf";
import type { ConceptPaperAnalysis } from "../../shared/concept-paper.js";
import { analyseConceptPaper } from "./analyse.js";

export const MAX_CONCEPT_FILE_BYTES = 8 * 1024 * 1024;

export class ConceptPaperError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] ?? match;
    const hexadecimal = entity[1]?.toLowerCase() === "x";
    const codePoint = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
  });
}

/** Keep Word heading levels so long specifications can be mapped by section. */
export function structuredTextFromDocxHtml(html: string): string {
  return decodeHtml(
    html
      .replace(/<h([1-6])\b[^>]*>/gi, "\n[[H$1]]")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<\/(?:p|li|tr|ul|ol|table)>/gi, "\n")
      .replace(/<\/(?:td|th)>/gi, " | ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fileKind(file: File, bytes: Uint8Array): "pdf" | "docx" {
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
  const isDocx =
    name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (isPdf && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") return "pdf";
  if (isDocx && bytes[0] === 0x50 && bytes[1] === 0x4b) return "docx";
  throw new ConceptPaperError("Choose a genuine PDF or DOCX file. Other file types are not supported yet.", 415);
}

/** Extract text transiently. The original bytes are never persisted. */
export async function readConceptPaper(file: File): Promise<ConceptPaperAnalysis> {
  if (file.size === 0) throw new ConceptPaperError("The selected file is empty.");
  if (file.size > MAX_CONCEPT_FILE_BYTES) {
    throw new ConceptPaperError("The selected file is larger than 8 MB. Use a shorter paper or a text-only PDF.", 413);
  }
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const kind = fileKind(file, bytes);
  let extracted = "";
  let pageCount: number | undefined;

  try {
    if (kind === "pdf") {
      const result = await extractText(bytes, { mergePages: true });
      extracted = result.text;
      pageCount = result.totalPages;
    } else {
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      extracted = structuredTextFromDocxHtml(result.value);
    }
  } catch {
    throw new ConceptPaperError(
      `The ${kind.toUpperCase()} could not be read. Try exporting it again without a password.`,
    );
  }

  if (extracted.replace(/\s+/g, " ").trim().length < 80) {
    throw new ConceptPaperError(
      kind === "pdf"
        ? "Very little selectable text was found. If this is a scanned PDF, run OCR first or use the starter template."
        : "Very little text was found in the DOCX. Add a short description of the objective, users, inputs and outputs, then try again.",
      422,
    );
  }
  return analyseConceptPaper(extracted, { fileName: file.name.slice(0, 160), fileType: kind, pageCount });
}
