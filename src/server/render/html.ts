/** Escape a value for interpolation into HTML text or an attribute. */
export function esc(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character,
  );
}

/**
 * Escape a value for embedding inside a `<script>` block.
 *
 * `JSON.stringify` alone is not enough. A `</script>` sequence anywhere in the
 * data — a model summary, a source description pulled from a third-party list —
 * closes the tag early and breaks the page, so `<` is escaped at the unicode
 * level, which keeps the JSON valid while making a closing tag impossible.
 *
 * U+2028 and U+2029 are valid in JSON strings but are line terminators in a
 * script context, where they are a syntax error. They get the same treatment.
 */
export function jsonScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
