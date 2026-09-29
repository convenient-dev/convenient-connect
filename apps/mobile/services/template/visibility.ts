import {
  allowedFulfillmentCodes,
  getFormat,
  isProhibitedProviderField,
  resolveActiveFormatKey,
} from "./capability";
import { evaluatePredicate, type EvaluationContext } from "./predicates";
import {
  PRICING_VALUE_KEYS,
  type FieldOption,
  type FormTemplate,
  type FormValues,
  type PricingType,
  type TemplateField,
} from "./types";

export const FULFILLMENT_SUBMIT_KEY = "fulfillment_type_ids";

export function findField(
  template: FormTemplate,
  fieldKey: string,
): TemplateField | undefined {
  return template.fields.find((field) => field.field_key === fieldKey);
}

export function findFieldBySubmitKey(
  template: FormTemplate,
  submitKey: string,
): TemplateField | undefined {
  return template.fields.find((field) => field.submit_as?.key === submitKey);
}

function optionCode(options: FieldOption[] | undefined, value: unknown): string | null {
  const match = options?.find((option) => String(option.value) === String(value));
  return match?.code ?? null;
}

/** Selected fulfillment option codes, derived from the selected ids. */
export function selectedFulfillmentCodes(
  template: FormTemplate,
  values: FormValues,
): string[] {
  const field = findFieldBySubmitKey(template, FULFILLMENT_SUBMIT_KEY);
  if (!field) return [];
  const selected = values[field.field_key];
  if (!Array.isArray(selected)) return [];
  return selected
    .map((value) => optionCode(field.options, value))
    .filter((code): code is string => !!code);
}

/** Code of the selected price unit, if any. */
export function selectedPriceUnitCode(
  template: FormTemplate,
  values: FormValues,
): string | null {
  const pricingField = template.fields.find((f) => f.field_type === "pricing");
  const unitId = values[PRICING_VALUE_KEYS.priceUnitId];
  if (unitId === null || unitId === undefined) return null;
  const unit = pricingField?.price_units?.find(
    (option) => String(option.value) === String(unitId),
  );
  return unit?.code ?? null;
}

export function selectedPricingType(values: FormValues): PricingType | null {
  const value = values[PRICING_VALUE_KEYS.pricingType];
  return value === "fixed_price" || value === "quote_required" ? value : null;
}

/**
 * Builds the predicate context. Field subjects use option codes when the field
 * has coded options (so fulfillment predicates compare `provider_location`,
 * not `1`). Context subjects expose pricing and template context keys.
 */
export function buildEvaluationContext(
  template: FormTemplate,
  values: FormValues,
): EvaluationContext {
  const fields: Record<string, unknown> = { ...values };
  for (const field of template.fields) {
    const raw = values[field.field_key];
    const hasCodes = field.options?.some((option) => option.code);
    if (!hasCodes || raw === undefined) continue;
    fields[field.field_key] = Array.isArray(raw)
      ? raw.map((v) => optionCode(field.options, v) ?? v)
      : optionCode(field.options, raw) ?? raw;
  }

  const capability = template.provider_listing_capability;
  const fulfillmentCodes = selectedFulfillmentCodes(template, values);
  const businessFormatKey = capability?.business_format?.field_key;
  const businessFormatValue = businessFormatKey
    ? values[businessFormatKey]
    : undefined;
  const pricingType = selectedPricingType(values);
  const priceUnitCode = selectedPriceUnitCode(template, values);

  const context: Record<string, unknown> = {
    pricing_type: pricingType,
    price_unit: priceUnitCode,
    price_unit_code: priceUnitCode,
    price_unit_id: values[PRICING_VALUE_KEYS.priceUnitId],
    fulfillment_types: fulfillmentCodes,
    business_format: businessFormatValue,
    format: resolveActiveFormatKey(capability, {
      businessFormatValue,
      fulfillmentCodes,
    }),
    provider_type: template.currency_context?.provider_type,
    business_id: template.currency_context?.business_id ?? null,
    can_charge_in_usd: template.currency_context?.can_charge_in_usd ?? false,
    is_usd_currency: template.currency_context?.is_usd_currency ?? false,
    default_currency: template.currency_context?.default_currency?.code,
  };

  return { fields, context };
}

/**
 * Whether a field should be rendered. Hidden when its `prohibited_when` holds,
 * its `visible_when` fails, its submit key is a prohibited provider field, or
 * (for the fulfillment control) the active format allows no fulfillment codes.
 */
export function isFieldVisible(
  field: TemplateField,
  template: FormTemplate,
  values: FormValues,
  ctx: EvaluationContext = buildEvaluationContext(template, values),
): boolean {
  if (field.requiredness === "prohibited" && !field.visible_when) {
    // Display-only fields (address) are "prohibited" to submit but still shown
    // when their visible_when holds; without a rule, hide them.
    if (field.submit_as?.type !== "display_only") return false;
  }

  const capability = template.provider_listing_capability;
  const submitKey = field.submit_as?.key;
  if (submitKey && isProhibitedProviderField(capability, submitKey)) return false;
  if (isProhibitedProviderField(capability, field.field_key)) return false;

  if (field.prohibited_when && evaluatePredicate(field.prohibited_when, ctx)) {
    return false;
  }
  if (field.visible_when && !evaluatePredicate(field.visible_when, ctx)) {
    return false;
  }

  if (submitKey === FULFILLMENT_SUBMIT_KEY && capability) {
    const formatKey = ctx.context.format as string | null;
    const format = getFormat(capability, formatKey);
    if (format && allowedFulfillmentCodes(format, selectedPriceUnitCode(template, values)).length === 0) {
      return false;
    }
  }

  return true;
}

/** Whether a field must have a value: `is_required` or `required_when` holds. */
export function isFieldRequired(
  field: TemplateField,
  template: FormTemplate,
  values: FormValues,
  ctx: EvaluationContext = buildEvaluationContext(template, values),
): boolean {
  if (field.requiredness === "prohibited") return false;
  if (field.is_required) return true;
  if (field.required_when) return evaluatePredicate(field.required_when, ctx);
  return false;
}

/** The fields to render, in template order. */
export function visibleFields(
  template: FormTemplate,
  values: FormValues,
): TemplateField[] {
  const ctx = buildEvaluationContext(template, values);
  return template.fields.filter((field) =>
    isFieldVisible(field, template, values, ctx),
  );
}

/**
 * Fulfillment options the provider may pick, filtered by the active format
 * (and by `fulfillment_by_price_unit` for the selected unit).
 */
export function allowedFulfillmentOptions(
  template: FormTemplate,
  values: FormValues,
): FieldOption[] {
  const field = findFieldBySubmitKey(template, FULFILLMENT_SUBMIT_KEY);
  const options = field?.options ?? [];
  const capability = template.provider_listing_capability;
  if (!capability) return options;
  const ctx = buildEvaluationContext(template, values);
  const format = getFormat(capability, ctx.context.format as string | null);
  if (!format) return options;
  const allowed = allowedFulfillmentCodes(
    format,
    selectedPriceUnitCode(template, values),
  );
  return options.filter((option) => option.code && allowed.includes(option.code));
}
