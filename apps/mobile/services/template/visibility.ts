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

export const PROVIDER_ADDRESS_SOURCE = "provider_default_address";
export const CUSTOMER_LOCATION_CODE = "customer_location";

/**
 * Fulfillment codes for which the provider's default address is shown. The
 * template's own `visible_when` only names `provider_location` and
 * `pickup_delivery`, where the backend snapshots the address onto the service.
 * For `customer_location` nothing is stored (address_id stays null); the
 * backend centres the service radius on the provider's live default address at
 * match time (confirmed with the backend team), so the provider sees it there too.
 */
export const ADDRESS_DISPLAY_FULFILLMENT_CODES = [
  "provider_location",
  "pickup_delivery",
  CUSTOMER_LOCATION_CODE,
];

/**
 * Sections whose fields only describe the listing: title, description,
 * additional information, tagline, portfolio and certificates. In every
 * template these fields carry no applicability rules and no other field's
 * rules read them, so they are edited on their own screen through the
 * information endpoint. Everything else (business format, fulfillment,
 * address, capability answers, pricing) can change which other fields are
 * valid, so it is edited together and saved in one transaction through the
 * candidate endpoint.
 */
export const LISTING_SECTION_KEYS = [
  "service_information",
  "portfolio",
  "certifications_licenses",
];

export function isListingSectionKey(key: string | null | undefined): boolean {
  return !!key && LISTING_SECTION_KEYS.includes(key);
}

/**
 * Whether the field belongs to a listing section. Fields outside every
 * section are treated as setup fields, the safe default.
 */
export function isListingField(field: TemplateField, template: FormTemplate): boolean {
  const key =
    field.section_key ??
    template.sections?.find((section) => section.field_keys?.includes(field.field_key))
      ?.section_key;
  return isListingSectionKey(key);
}

/** The display-only field that mirrors the provider's default address. */
export function isProviderAddressField(field: TemplateField): boolean {
  return (
    field.submit_as?.type === "display_only" &&
    field.submit_as.source === PROVIDER_ADDRESS_SOURCE
  );
}

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
  if (!pricingField) {
    // Information template: no pricing field to map the id, so use the code
    // seeded from the saved pricing record.
    const code = values[PRICING_VALUE_KEYS.priceUnitCode];
    return typeof code === "string" && code ? code : null;
  }
  const unit = pricingField.price_units?.find(
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
    // Names from the PublicDescriptorPredicate contract: the Provider array
    // (`fulfillment_type_codes`, used by Laundry) and the singular form.
    fulfillment_type_codes: fulfillmentCodes,
    fulfillment_type_code: fulfillmentCodes[0] ?? null,
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

  // Display-only, never submitted: safe to show for more fulfillment codes
  // than the template's predicates name. The template rules still apply
  // when none of these codes is selected.
  if (isProviderAddressField(field)) {
    const codes = selectedFulfillmentCodes(template, values);
    if (codes.some((code) => ADDRESS_DISPLAY_FULFILLMENT_CODES.includes(code))) {
      return true;
    }
  }

  if (field.prohibited_when && evaluatePredicate(field.prohibited_when, ctx)) {
    return false;
  }
  if (field.visible_when && !evaluatePredicate(field.visible_when, ctx)) {
    return false;
  }

  if (submitKey === FULFILLMENT_SUBMIT_KEY && capability) {
    const codes = selectableFulfillmentCodes(template, values, ctx);
    if (codes !== null && codes.length === 0) return false;
  }

  return true;
}

/**
 * Fulfillment codes the provider may pick right now, or null when the
 * capability imposes no limit.
 *
 * With a `business_format` selector the chosen format decides. Without one
 * the format is derived from the fulfillment selection itself (Laundry keys
 * its formats by fulfillment code), so limiting the options to the current
 * format would lock in whichever format resolved first; offer the union of
 * every format's codes instead.
 */
export function selectableFulfillmentCodes(
  template: FormTemplate,
  values: FormValues,
  ctx: EvaluationContext = buildEvaluationContext(template, values),
): string[] | null {
  const capability = template.provider_listing_capability;
  if (!capability) return null;
  const unitCode = selectedPriceUnitCode(template, values);
  if (!capability.business_format) {
    const formats = Object.values(capability.formats ?? {});
    if (formats.length === 0) return null;
    const union = new Set<string>();
    for (const format of formats) {
      for (const code of allowedFulfillmentCodes(format, unitCode)) union.add(code);
    }
    return [...union];
  }
  const format = getFormat(capability, ctx.context.format as string | null);
  if (!format) return null;
  return allowedFulfillmentCodes(format, unitCode);
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
  const allowed = selectableFulfillmentCodes(template, values);
  if (allowed === null) return options;
  return options.filter((option) => option.code && allowed.includes(option.code));
}
