/** Escape a value for interpolation into HTML. */
export function esc(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character,
  );
}

/**
 * Look up an element by id, throwing if it is missing.
 *
 * The prototype's `document.getElementById(...).innerHTML = ...` pattern failed
 * silently-then-fatally: a renamed id produced "cannot set property of null" from
 * somewhere in the middle of a render, with no clue which element was gone.
 */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}. The page shell and the client are out of sync.`);
  return element as T;
}

/** Look up an element by id, returning null when it is genuinely optional. */
export function maybeById<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/** Set the HTML of an element by id. */
export function setHtml(id: string, html: string): void {
  byId(id).innerHTML = html;
}

/** Set the text of an element by id. */
export function setText(id: string, text: string): void {
  byId(id).textContent = text;
}

/** Fill a `<select>` from a list of `{ id, name }` records. */
export function fillSelect(id: string, items: readonly { id: string; name: string }[]): void {
  setHtml(id, items.map((item) => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join(""));
}

/** Format a number for display, or an em dash when it is not a number. */
export function num(value: unknown): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : "—";
}

/** Format an ISO timestamp for display. */
export function when(value: string | null | undefined, fallback = "not yet checked"): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleString();
}

let toastTimer: number | undefined;

/** Show a transient status message. */
export function toast(message: string): void {
  const element = byId("toast");
  element.textContent = message;
  element.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.remove("show"), 2400);
}
