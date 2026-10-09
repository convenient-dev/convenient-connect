/**
 * Maps structured 422 `data.issues[]` paths back onto template `field_key`s so
 * the wizard can highlight the owning field and open its step. This is the
 * reverse of `buildPayload`'s routing in payload.ts.
 */
import type { ValidationIssue } from "../../api/client";
import { buildPayload } from "./payload";
import { PRICING_VALUE_KEYS, type FormTemplate, type FormValues } from "./types";
import type { FormErrors } from "./validation";

const PRICING_KEYS: string[] = Object.values(PRICING_VALUE_KEYS);

export interface MappedIssues {
  /** First issue per owning field key (or pricing key). */
  fieldErrors: FormErrors;
  /** Issues with no field owner (`$` or unknown paths), as display strings. */
  general: string[];
}

/** Strips the `answers_json.` prefix and splits `portfolio_images.1` into parts. */
function splitPath(issue: ValidationIssue): string[] {
  const raw = (issue.path ?? issue.field ?? "").replace(/^answers_json\./, "");
  return raw ? raw.split(".") : [];
}

/**
 * Resolves the field key that owns a wire path, checking every key a field can
 * submit under: `field_key`, `submit_as.key`, `unit_value_key`, Other
 * `custom_value_key`s, certificate `description_key` / `files_key`, and the
 * dynamic file pair (`dynamic_files.N` is matched by index against the files
 * the current values would send).
 */
export function resolveIssueFieldKey(
  template: FormTemplate,
  values: FormValues,
  parts: string[],
): string | null {
  const [leaf, index] = parts;
  if (!leaf || leaf === "$") return null;

  for (const field of template.fields) {
    const submit = field.submit_as;
    if (field.field_key === leaf || submit?.key === leaf) return field.field_key;
    if (field.unit_value_key === leaf) return field.field_key;
    if ((field.options ?? []).some((o) => o.custom_value_key === leaf)) return field.field_key;
    if (submit?.type === "certificate_bundle") {
      const descriptionKey = submit.description_key ?? "certificate_description";
      const filesKey = submit.files_key ?? "certificate_files";
      if (leaf === descriptionKey || leaf === filesKey) return field.field_key;
    }
  }

  // dynamic_files.N / dynamic_file_keys.N: pair N belongs to one file field.
  const dynamicField = template.fields.find((f) => f.submit_as?.type === "dynamic_files");
  if (dynamicField) {
    const { dynamicFiles, dynamicFileFields } = buildPayload(template, values, "create");
    if (leaf === dynamicFileFields.fileField || leaf === dynamicFileFields.keyField) {
      const pair = dynamicFiles[Number(index)];
      return pair?.fieldKey ?? dynamicField.field_key;
    }
  }

  if (PRICING_KEYS.includes(leaf)) return leaf;
  return null;
}

/** Prefixes indexed file issues so "portfolio_images.1" reads as "File 2: …". */
function describeIssue(parts: string[], message: string): string {
  const index = Number(parts[1]);
  return parts.length > 1 && Number.isInteger(index) ? `File ${index + 1}: ${message}` : message;
}

export function mapIssuesToFields(
  template: FormTemplate,
  values: FormValues,
  issues: ValidationIssue[],
): MappedIssues {
  const fieldErrors: FormErrors = {};
  const general: string[] = [];
  for (const issue of issues) {
    const parts = splitPath(issue);
    const key = resolveIssueFieldKey(template, values, parts);
    if (!key) {
      const path = parts.join(".");
      general.push(path && path !== "$" ? `${path}: ${issue.message}` : issue.message);
      continue;
    }
    if (!(key in fieldErrors)) fieldErrors[key] = describeIssue(parts, issue.message);
  }
  return { fieldErrors, general };
}
