import {
  appendDynamicFiles,
  buildFormData,
  type DynamicFilePair,
  type MultipartEntries,
  type MultipartFile,
} from "../../api/multipart";
import { getFormat, profilePricingScopeState } from "./capability";
import { resolveCurrency } from "./currency";
import {
  PRICING_VALUE_KEYS,
  type CertificateBundleValue,
  type FormTemplate,
  type FormValues,
  type ProviderType,
  type TemplateField,
} from "./types";
import {
  buildEvaluationContext,
  isFieldVisible,
  selectedFulfillmentCodes,
  selectedPriceUnitCode,
  selectedPricingType,
} from "./visibility";

export const ACKNOWLEDGEMENT_KEY = "information_accuracy_acknowledgement";

/** Never sent by the client on any endpoint. */
export const NEVER_SUBMIT_KEYS = [
  "address_id",
  "booking_policy",
  "schedule_family",
  "profile_mode",
  "charge_in_usd",
] as const;

/** Only sent on create. */
export const CREATE_ONLY_KEYS = [
  "category_id",
  "subcategory_id",
  "provider_type",
  "business_id",
  ACKNOWLEDGEMENT_KEY,
] as const;

/** Sent by create and candidate, never by the information-only endpoint. */
export const PRICING_KEYS = [
  "pricing_type",
  "amount",
  "currency",
  "price_unit_id",
  "profile_pricing_scope",
] as const;

export interface CreateIdentity {
  categoryId: number;
  subcategoryId: number;
  providerType: ProviderType;
  businessId?: number | null;
}

export interface EditFileChanges {
  deletePortfolioIds?: number[];
  deleteCertificateIds?: number[];
  /** Candidate only: dynamic file field keys whose stored files are removed. */
  clearDynamicFileKeys?: string[];
}

export interface BuiltPayload {
  entries: MultipartEntries;
  answers: Record<string, unknown>;
  dynamicFiles: DynamicFilePair[];
  /** key_field / file_field named by the template, defaulting to the standard pair. */
  dynamicFileFields: { keyField: string; fileField: string };
}

type Mode = "create" | "information" | "candidate";

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function otherCustomKey(field: TemplateField): string | undefined {
  return field.options?.find((o) => o.allows_custom_value && o.custom_value_key)
    ?.custom_value_key;
}

function isOtherSelected(field: TemplateField, value: unknown): boolean {
  const other = field.options?.find((o) => o.allows_custom_value);
  if (!other) return false;
  return Array.isArray(value)
    ? value.some((v) => String(v) === String(other.value))
    : String(value) === String(other.value);
}

function routePricing(
  field: TemplateField,
  template: FormTemplate,
  values: FormValues,
  entries: MultipartEntries,
  ctx: ReturnType<typeof buildEvaluationContext>,
): void {
  const pricingType = selectedPricingType(values);
  if (!pricingType) return;
  entries[PRICING_VALUE_KEYS.pricingType] = pricingType;

  const unitId = values[PRICING_VALUE_KEYS.priceUnitId];
  if (!isBlank(unitId)) entries[PRICING_VALUE_KEYS.priceUnitId] = unitId as number;

  const amount = values[PRICING_VALUE_KEYS.amount];
  const { currency } = resolveCurrency(template.currency_context, {
    fulfillmentCodes: selectedFulfillmentCodes(template, values),
    chargeInUsd: values[PRICING_VALUE_KEYS.chargeInUsd] === true,
  });
  if (pricingType === "fixed_price" || !isBlank(amount)) {
    if (!isBlank(amount)) entries[PRICING_VALUE_KEYS.amount] = amount as number;
    entries.currency = currency;
  }

  const format = getFormat(
    template.provider_listing_capability,
    ctx.context.format as string | null,
  );
  const state = profilePricingScopeState(
    format,
    pricingType,
    selectedPriceUnitCode(template, values),
  );
  const scope = values[PRICING_VALUE_KEYS.profilePricingScope];
  if (state.state !== "prohibited" && !isBlank(scope)) {
    entries[PRICING_VALUE_KEYS.profilePricingScope] = scope as string;
  }
  void field;
}

/**
 * Routes every visible field's value by `submit_as.type`. Hidden fields are
 * omitted entirely (never sent as null). Generic keys never land in
 * `answers_json`; new files never land in `answers_json`.
 */
export function buildPayload(
  template: FormTemplate,
  values: FormValues,
  mode: Mode,
): BuiltPayload {
  const ctx = buildEvaluationContext(template, values);
  const entries: MultipartEntries = {};
  const answers: Record<string, unknown> = {};
  const dynamicFiles: DynamicFilePair[] = [];
  let dynamicFileFields = { keyField: "dynamic_file_keys", fileField: "dynamic_files" };

  for (const field of template.fields) {
    if (!isFieldVisible(field, template, values, ctx)) continue;
    const submit = field.submit_as;
    if (!submit) continue;
    const value = values[field.field_key];

    switch (submit.type) {
      case "display_only":
        break;

      case "top_level": {
        const key = submit.key ?? field.field_key;
        if (mode !== "create" && key === ACKNOWLEDGEMENT_KEY) break;
        if (!isBlank(value)) entries[key] = value as MultipartEntries[string];
        if (field.unit_value_key && !isBlank(values[field.unit_value_key])) {
          entries[field.unit_value_key] = values[field.unit_value_key] as string;
        }
        break;
      }

      case "answers_json": {
        const key = submit.key ?? field.field_key;
        if (!isBlank(value)) answers[key] = value;
        const customKey = otherCustomKey(field);
        if (customKey && isOtherSelected(field, value) && !isBlank(values[customKey])) {
          answers[customKey] = values[customKey];
        }
        break;
      }

      case "dynamic_files": {
        const files = Array.isArray(value) ? (value as MultipartFile[]) : [];
        const fieldKey = submit.field_key ?? field.field_key;
        dynamicFileFields = {
          keyField: submit.key_field ?? dynamicFileFields.keyField,
          fileField: submit.file_field ?? dynamicFileFields.fileField,
        };
        for (const file of files) dynamicFiles.push({ fieldKey, file });
        break;
      }

      case "certificate_bundle": {
        const bundle = (value ?? {}) as CertificateBundleValue;
        const files = bundle.files ?? [];
        const descriptionKey = submit.description_key ?? "certificate_description";
        const filesKey = submit.files_key ?? "certificate_files";
        if (!isBlank(bundle.description)) entries[descriptionKey] = bundle.description as string;
        if (files.length) entries[filesKey] = files;
        break;
      }

      case "pricing_fields":
        if (mode === "information") break;
        routePricing(field, template, values, entries, ctx);
        break;

      default:
        break;
    }
  }

  // answers_json is always present, `{}` for generic-only templates.
  entries.answers_json = answers;

  for (const key of NEVER_SUBMIT_KEYS) {
    delete entries[key];
    delete answers[key];
  }
  if (mode !== "create") {
    for (const key of CREATE_ONLY_KEYS) delete entries[key];
  }
  if (mode === "information") {
    for (const key of PRICING_KEYS) delete entries[key];
  }

  return { entries, answers, dynamicFiles, dynamicFileFields };
}

function toFormData(payload: BuiltPayload, extra: MultipartEntries = {}): FormData {
  const formData = buildFormData({ ...payload.entries, ...extra });
  appendDynamicFiles(
    formData,
    payload.dynamicFiles,
    payload.dynamicFileFields.keyField,
    payload.dynamicFileFields.fileField,
  );
  return formData;
}

/** `POST /services`: identity + every visible field + acknowledgement. */
export function buildCreateFormData(
  template: FormTemplate,
  values: FormValues,
  identity: CreateIdentity,
): FormData {
  const payload = buildPayload(template, values, "create");
  return toFormData(payload, {
    category_id: identity.categoryId,
    subcategory_id: identity.subcategoryId,
    provider_type: identity.providerType,
    business_id:
      identity.providerType === "business" ? identity.businessId ?? undefined : undefined,
  });
}

/** `POST /services/{id}/information`: information and files only. */
export function buildInformationFormData(
  template: FormTemplate,
  values: FormValues,
  changes: EditFileChanges = {},
): FormData {
  const payload = buildPayload(template, values, "information");
  return toFormData(payload, {
    delete_portfolio_ids: changes.deletePortfolioIds,
    delete_certificate_ids: changes.deleteCertificateIds,
  });
}

/** `POST /services/{id}/candidate`: full listing with `answers_mode=replace`. */
export function buildCandidateFormData(
  template: FormTemplate,
  values: FormValues,
  changes: EditFileChanges = {},
): FormData {
  const payload = buildPayload(template, values, "candidate");
  return toFormData(payload, {
    answers_mode: "replace",
    delete_portfolio_ids: changes.deletePortfolioIds,
    delete_certificate_ids: changes.deleteCertificateIds,
    clear_dynamic_file_keys: changes.clearDynamicFileKeys,
  });
}
