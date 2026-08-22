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

function attribute(tag: string, name: string): string {
  const match = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
  return decodeHtml(match?.[1] ?? match?.[2] ?? "");
}

/**
 * Preserve Word's useful block structure in a small marker language.
 *
 * The analyser consumes these markers, while field inference can still reduce
 * a selected block to one line when a genuinely compact value is needed.
 */
export function structuredTextFromDocxHtml(html: string): string {
  const linked = html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (match, attributes: string, label: string) => {
    const href = attribute(attributes, "href");
    const text = label.replace(/<[^>]+>/g, "").trim();
    return href && text ? `[${text}](${href})` : text || match;
  });
  const rows = linked.replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi, (_match, row: string) => {
    const cells = [...row.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((cell) =>
      cell[1]
        .replace(/<br\s*\/?>/gi, "[[BR]]")
        .replace(/<\/(?:p|li)>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .trim(),
    );
    return cells.length ? `\n[[TR]]${cells.join("[[TC]]")}\n` : "";
  });
  return decodeHtml(
    rows
      .replace(/<img\b[^>]*>/gi, (tag) => `\n[[IMAGE]]${attribute(tag, "alt") || "Embedded image"}\n`)
      .replace(/<h([1-6])\b[^>]*>/gi, "\n[[H$1]]")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<pre\b[^>]*>/gi, "\n[[CODE]]")
      .replace(/<\/pre>/gi, "\n")
      .replace(/<p\b[^>]*>/gi, "\n[[P]]")
      .replace(/<\/p>/gi, "\n")
      .replace(/<ol\b[^>]*>/gi, "\n[[OL]]\n")
      .replace(/<ul\b[^>]*>/gi, "\n[[UL]]\n")
      .replace(/<\/(?:ol|ul)>/gi, "\n[[/LIST]]\n")
      .replace(/<li\b[^>]*>/gi, "\n[[LI]]")
      .replace(/<\/li>/gi, "\n")
      .replace(/<table\b[^>]*>/gi, "\n[[TABLE]]\n")
      .replace(/<\/table>/gi, "\n[[/TABLE]]\n")
      .replace(/<br\s*\/?>/gi, "[[BR]]")
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
      const convertToHtml = mammoth.convertToHtml as unknown as (
        input: { arrayBuffer: ArrayBuffer },
        options: { styleMap: string[] },
      ) => Promise<{ value: string }>;
      const result = await convertToHtml(
        { arrayBuffer: buffer },
        {
          styleMap: [
            "p[style-name='Source Code'] => pre:fresh",
            "p[style-name='Code'] => pre:fresh",
            "p[style-name='Code Block'] => pre:fresh",
          ],
        },
      );
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
