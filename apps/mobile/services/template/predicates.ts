import type { Predicate, Scalar } from "./types";

/**
 * Values a predicate can be evaluated against. Field subjects are looked up by
 * `field_key`; context subjects by `context_key`. Field values for fields with
 * coded options (fulfillment types) must already be mapped to codes, see
 * `buildEvaluationContext` in visibility.ts.
 */
export interface EvaluationContext {
  fields: Record<string, unknown>;
  context: Record<string, unknown>;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function toArray(value: unknown): unknown[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function looseEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // Options may be numeric ids while predicate values are strings, or vice versa.
  if (
    (typeof a === "number" || typeof a === "string") &&
    (typeof b === "number" || typeof b === "string")
  ) {
    return String(a) === String(b);
  }
  return false;
}

function includesLoose(list: unknown[], value: unknown): boolean {
  return list.some((item) => looseEquals(item, value));
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function resolveSubject(predicate: Predicate, ctx: EvaluationContext): unknown {
  if (predicate.context_key !== undefined) {
    return ctx.context[predicate.context_key];
  }
  const key = predicate.field_key ?? predicate.field;
  return key === undefined ? undefined : ctx.fields[key];
}

function expectedValues(predicate: Predicate): Scalar[] {
  if (predicate.values) return predicate.values;
  if (predicate.value !== undefined && predicate.value !== null) {
    return [predicate.value];
  }
  return [];
}

function evaluateLeaf(predicate: Predicate, ctx: EvaluationContext): boolean {
  const subject = resolveSubject(predicate, ctx);
  const expected = expectedValues(predicate);
  const subjectList = toArray(subject);

  switch (predicate.operator) {
    case "equals":
      return looseEquals(subject, predicate.value ?? expected[0]);
    case "not_equals":
      return !looseEquals(subject, predicate.value ?? expected[0]);
    case "in":
      return includesLoose(expected, subject);
    case "not_in":
      return !includesLoose(expected, subject);
    case "empty":
      return isEmptyValue(subject);
    case "not_empty":
      return !isEmptyValue(subject);
    case "contains":
      if (typeof subject === "string" && typeof expected[0] === "string") {
        return subject.includes(expected[0]);
      }
      return expected.every((v) => includesLoose(subjectList, v));
    case "not_contains":
      if (typeof subject === "string" && typeof expected[0] === "string") {
        return !subject.includes(expected[0]);
      }
      return !expected.some((v) => includesLoose(subjectList, v));
    case "contains_any":
      return expected.some((v) => includesLoose(subjectList, v));
    case "less_than": {
      const a = toNumber(subject);
      const b = toNumber(predicate.value ?? expected[0]);
      return a !== null && b !== null && a < b;
    }
    case "greater_than": {
      const a = toNumber(subject);
      const b = toNumber(predicate.value ?? expected[0]);
      return a !== null && b !== null && a > b;
    }
    default:
      // A leaf with no operator carries no condition.
      return true;
  }
}

/**
 * Evaluates a template predicate. `null`/`undefined` means "no condition" and
 * returns `true`. An empty `all` is true; an empty `any` is false.
 */
export function evaluatePredicate(
  predicate: Predicate | null | undefined,
  ctx: EvaluationContext,
): boolean {
  if (!predicate) return true;

  if (predicate.all !== undefined) {
    if (!predicate.all.every((child) => evaluatePredicate(child, ctx))) {
      return false;
    }
  }
  if (predicate.any !== undefined) {
    if (!predicate.any.some((child) => evaluatePredicate(child, ctx))) {
      return false;
    }
  }
  if (predicate.not !== undefined && predicate.not !== null) {
    if (evaluatePredicate(predicate.not, ctx)) return false;
  }

  const hasLeaf =
    predicate.operator !== undefined ||
    predicate.field_key !== undefined ||
    predicate.field !== undefined ||
    predicate.context_key !== undefined;
  if (hasLeaf) return evaluateLeaf(predicate, ctx);

  return true;
}
