import type { Kind } from "../protocol.js";

/** Longer than this, a paragraph is edited, not replaced, so the caret goes to its end. */
export const REPLACE_MAX_CHARS = 120;

/**
 * Where a text session starts. Short text (a heading, a button, a line) starts with all of it
 * selected, so typing replaces it. A long paragraph starts with the caret at its end, so one
 * stray key does not wipe it.
 */
export function startSelection(kind: Kind, text: string): "all" | "end" {
  if (kind === "heading" || kind === "button" || kind === "link") return "all";
  return text.replace(/\s+/g, " ").trim().length > REPLACE_MAX_CHARS ? "end" : "all";
}
