/**
 * Directed language pairs (Misc / Interpreters `supported_language_pairs`).
 *
 * The API stores each pair as one string, `source->target`, lower-cased as in
 * the spec example `english->french`. Direction matters, so the reverse pair
 * is a separate entry, and source and target must differ.
 */
import type { TemplateField } from "./types";

export const LANGUAGE_PAIR_SEPARATOR = "->";
/** Shown between the two languages everywhere the pair is displayed. */
export const LANGUAGE_PAIR_ARROW = "\u2192";

export interface LanguagePair {
  source: string;
  target: string;
}

/** Free-entry select whose items are directed `source->target` pairs. */
export function isLanguagePairField(field: TemplateField): boolean {
  const set = field.descriptor?.set;
  return set?.relation === "directed_pair" || set?.pair_encoding === "source->target";
}

/** Canonical wire form of a language name: trimmed, single-spaced, lower case. */
export function normalizeLanguage(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function encodeLanguagePair(source: string, target: string): string {
  return `${normalizeLanguage(source)}${LANGUAGE_PAIR_SEPARATOR}${normalizeLanguage(target)}`;
}

/** Splits a stored pair; null when the value is not a `source->target` string with both sides. */
export function parseLanguagePair(value: unknown): LanguagePair | null {
  if (typeof value !== "string") return null;
  const index = value.indexOf(LANGUAGE_PAIR_SEPARATOR);
  if (index === -1) return null;
  const source = normalizeLanguage(value.slice(0, index));
  const target = normalizeLanguage(value.slice(index + LANGUAGE_PAIR_SEPARATOR.length));
  if (!source || !target) return null;
  return { source, target };
}

function titleCase(name: string): string {
  return name.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

/** "english->urdu" -> "English → Urdu"; anything unparseable is shown as typed. */
export function formatLanguagePair(value: unknown): string {
  const pair = parseLanguagePair(value);
  if (!pair) return String(value ?? "");
  return `${titleCase(pair.source)} ${LANGUAGE_PAIR_ARROW} ${titleCase(pair.target)}`;
}

/**
 * Validation for a list of stored pairs: every item must parse, source and
 * target must differ, and no pair may repeat. Returns the first problem.
 */
export function languagePairsError(field: TemplateField, items: unknown[]): string | null {
  const seen = new Set<string>();
  for (const item of items) {
    const pair = parseLanguagePair(item);
    if (!pair) return `${field.label} entries must be a source and a target language.`;
    if (pair.source === pair.target) {
      return `${field.label}: source and target must be different languages.`;
    }
    const key = encodeLanguagePair(pair.source, pair.target);
    if (seen.has(key)) return `${field.label} contains the same pair twice.`;
    seen.add(key);
  }
  return null;
}
