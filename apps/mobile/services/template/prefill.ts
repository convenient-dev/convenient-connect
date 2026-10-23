/**
 * Seeds form values for the edit screens from what the API already stores.
 * This is the reverse of `buildPayload`'s routing in payload.ts: generic values
 * come from `current_values`, dynamic values from `current_values.answers_json`,
 * and pricing from the pricing record.
 *
 * File fields are left unset: the form value only holds new uploads, and the
 * stored files are shown (and deleted) separately.
 */
import type {
  ServiceInformationCurrentValues,
  ServicePricingRecord,
} from "../../api/service-management";
import {
  PRICING_VALUE_KEYS,
  type CertificateBundleValue,
  type FormTemplate,
  type FormValues,
  type TemplateField,
} from "./types";

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function otherCustomKey(field: TemplateField): string | undefined {
  return field.options?.find((o) => o.allows_custom_value && o.custom_value_key)
    ?.custom_value_key;
}

/** Form values for the information template from `current_values`. */
export function valuesFromCurrent(
  template: FormTemplate,
  current: ServiceInformationCurrentValues | null | undefined,
): FormValues {
  const values: FormValues = {};
  if (!current) return values;
  const answers = (current.answers_json ?? {}) as Record<string, unknown>;

  for (const field of template.fields) {
    const submit = field.submit_as;
    if (!submit) continue;
    switch (submit.type) {
      case "top_level": {
        if (field.field_type === "file_upload") break;
        const key = submit.key ?? field.field_key;
        const value = current[key];
        if (isPresent(value)) values[field.field_key] = value;
        if (field.unit_value_key && isPresent(current[field.unit_value_key])) {
          values[field.unit_value_key] = current[field.unit_value_key];
        }
        break;
      }
      case "answers_json": {
        const key = submit.key ?? field.field_key;
        if (isPresent(answers[key])) values[field.field_key] = answers[key];
        const customKey = otherCustomKey(field);
        if (customKey && isPresent(answers[customKey])) {
          values[customKey] = answers[customKey];
        }
        break;
      }
      case "certificate_bundle": {
        const description = current.certificate?.description;
        if (description) {
          values[field.field_key] = { description } satisfies CertificateBundleValue;
        }
        break;
      }
      default:
        break;
    }
  }
  return values;
}

/** Pricing form values from the saved pricing record. */
export function valuesFromPricing(record: ServicePricingRecord): FormValues {
  const values: FormValues = {};
  if (record.pricing_type) values[PRICING_VALUE_KEYS.pricingType] = record.pricing_type;
  if (isPresent(record.amount)) values[PRICING_VALUE_KEYS.amount] = record.amount;
  if (isPresent(record.price_unit_id)) {
    values[PRICING_VALUE_KEYS.priceUnitId] = record.price_unit_id;
  }
  const unitCode = (record.price_unit as { code?: string | null } | null | undefined)?.code;
  if (unitCode) values[PRICING_VALUE_KEYS.priceUnitCode] = unitCode;
  if (isPresent(record.profile_pricing_scope)) {
    values[PRICING_VALUE_KEYS.profilePricingScope] = record.profile_pricing_scope;
  }
  if (isPresent(record.charge_in_usd)) {
    values[PRICING_VALUE_KEYS.chargeInUsd] = record.charge_in_usd;
  }
  return values;
}
