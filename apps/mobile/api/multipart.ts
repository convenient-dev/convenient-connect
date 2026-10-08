/**
 * Helpers for building the multipart/form-data bodies the Laravel service
 * endpoints expect (create, information update, candidate save, chat
 * attachments).
 *
 * Rules encoded here, from the integration guide:
 * - Array values are appended once per item under `key[]`.
 * - Plain objects (e.g. `answers_json`) are sent as one JSON string.
 * - Booleans are sent as the strings "true" / "false".
 * - `null` / `undefined` values are omitted entirely. Hidden fields must not be sent as null, so callers just leave them out of the entries.
 * - Dynamic files are paired by index: `dynamic_file_keys[n]` names the field
 *   for `dynamic_files[n]`, repeating the key once per file.
 */

/** A file as React Native's FormData accepts it. */
export interface MultipartFile {
  uri: string;
  name: string;
  type: string;
  /** Size in bytes when the picker reported it; used for client-side limits only. */
  size?: number;
}

export type MultipartScalar = string | number | boolean;

export type MultipartValue =
  | MultipartScalar
  | MultipartFile
  | Record<string, unknown>
  | (MultipartScalar | MultipartFile)[]
  | null
  | undefined;

export type MultipartEntries = Record<string, MultipartValue>;

export function isMultipartFile(value: unknown): value is MultipartFile {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MultipartFile).uri === "string" &&
    typeof (value as MultipartFile).name === "string" &&
    typeof (value as MultipartFile).type === "string"
  );
}

function scalarToString(value: MultipartScalar): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

/** Appends one value under `key`, applying the array/JSON/boolean rules. */
export function appendMultipart(
  formData: FormData,
  key: string,
  value: MultipartValue,
): void {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    const arrayKey = key.endsWith("[]") ? key : `${key}[]`;
    for (const item of value) {
      if (item === null || item === undefined) continue;
      if (isMultipartFile(item)) {
        formData.append(arrayKey, item as unknown as Blob);
      } else {
        formData.append(arrayKey, scalarToString(item));
      }
    }
    return;
  }

  if (isMultipartFile(value)) {
    formData.append(key, value as unknown as Blob);
    return;
  }

  if (typeof value === "object") {
    formData.append(key, JSON.stringify(value));
    return;
  }

  formData.append(key, scalarToString(value));
}

/** Builds a FormData from a flat map of entries. */
export function buildFormData(entries: MultipartEntries): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    appendMultipart(formData, key, value);
  }
  return formData;
}

export interface DynamicFilePair {
  /** The template `field_key` the file belongs to. */
  fieldKey: string;
  file: MultipartFile;
}

/**
 * Appends dynamic files as the two index-paired arrays the backend requires.
 * `keyField` defaults to `dynamic_file_keys` and `fileField` to `dynamic_files`;
 * a template's `submit_as` may name different fields.
 */
export function appendDynamicFiles(
  formData: FormData,
  pairs: DynamicFilePair[],
  keyField = "dynamic_file_keys",
  fileField = "dynamic_files",
): void {
  for (const { fieldKey, file } of pairs) {
    formData.append(`${keyField}[]`, fieldKey);
    formData.append(`${fileField}[]`, file as unknown as Blob);
  }
}
