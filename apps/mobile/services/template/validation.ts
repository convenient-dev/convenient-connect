import type { MultipartFile } from "../../api/multipart";
import {
  allowedPriceUnitCodes,
  getFormat,
  profilePricingScopeState,
} from "./capability";
import type { EvaluationContext } from "./predicates";
import {
  PRICING_VALUE_KEYS,
  type CertificateBundleValue,
  type FieldOption,
  type FieldValidation,
  type FormTemplate,
  type FormValues,
  type Scalar,
  type TemplateField,
} from "./types";
import {
  buildEvaluationContext,
  isFieldRequired,
  isFieldVisible,
  selectedPriceUnitCode,
  selectedPricingType,
} from "./visibility";

/** Field key -> first error message. Pricing errors use the pricing value keys. */
export type FormErrors = Record<string, string>;

function validationOf(field: TemplateField): FieldValidation {
  const v = field.validation;
  if (!v || Array.isArray(v)) return {};
  return v;
}

/** `0` and `false` count as present. */
export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function optionValues(options: FieldOption[] | undefined): Scalar[] {
  return (options ?? []).map((option) => option.value);
}

function includesLoose(list: Scalar[], value: unknown): boolean {
  return list.some((item) => String(item) === String(value));
}

function otherOption(field: TemplateField): FieldOption | undefined {
  return field.options?.find(
    (option) => option.allows_custom_value && option.custom_value_key,
  );
}

function fileExtension(file: MultipartFile): string {
  const name = file.name || file.uri;
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function validateText(field: TemplateField, value: unknown): string | null {
  if (typeof value !== "string") return `${field.label} must be text.`;
  const v = validationOf(field);
  const length = value.trim().length;
  if (v.minimum_length !== undefined && length < v.minimum_length) {
    return `${field.label} must be at least ${v.minimum_length} characters.`;
  }
  if (v.maximum_length !== undefined && length > v.maximum_length) {
    return `${field.label} must be at most ${v.maximum_length} characters.`;
  }
  return null;
}

function validateNumber(
  field: TemplateField,
  value: unknown,
  v: FieldValidation = validationOf(field),
): string | null {
  const n = toNumber(value);
  if (n === null) return `${field.label} must be a number.`;
  if ((v.integer || v.data_type === "integer") && !Number.isInteger(n)) {
    return `${field.label} must be a whole number.`;
  }
  if (v.minimum !== undefined && n < v.minimum) {
    return `${field.label} must be at least ${v.minimum}.`;
  }
  if (v.maximum !== undefined && n > v.maximum) {
    return `${field.label} must be at most ${v.maximum}.`;
  }
  return null;
}

function validateMultiSelect(field: TemplateField, value: unknown): string | null {
  if (!Array.isArray(value)) return `${field.label} must be a list of selections.`;
  const allowed = optionValues(field.options);
  if (allowed.length && value.some((item) => !includesLoose(allowed, item))) {
    return `${field.label} contains an invalid selection.`;
  }
  const v = validationOf(field);
  if (v.minimum_selections !== undefined && value.length < v.minimum_selections) {
    return `Select at least ${v.minimum_selections} for ${field.label}.`;
  }
  if (v.maximum_selections !== undefined && value.length > v.maximum_selections) {
    return `Select at most ${v.maximum_selections} for ${field.label}.`;
  }
  const exclusive = field.selection_rules?.exclusive_values ?? [];
  if (value.length > 1) {
    const hit = exclusive.find((ex) => includesLoose(value as Scalar[], ex));
    if (hit !== undefined) {
      const label =
        field.options?.find((o) => String(o.value) === String(hit))?.label ?? String(hit);
      return `${label} cannot be combined with other selections.`;
    }
  }
  return null;
}

function validateSingleSelect(field: TemplateField, value: unknown): string | null {
  const allowed = optionValues(field.options);
  if (allowed.length && !includesLoose(allowed, value)) {
    return `${field.label} contains an invalid selection.`;
  }
  return null;
}

function validateYesNo(field: TemplateField, value: unknown): string | null {
  if (typeof value !== "boolean") return `${field.label} must be yes or no.`;
  const v = validationOf(field);
  if (v.accepted_value !== undefined && value !== v.accepted_value) {
    return `${field.label} must be accepted.`;
  }
  return null;
}

/**
 * Backend upload limit (Laravel `max:5120` on image uploads). Not exposed by the
 * template, so it is mirrored here to fail before the request is sent.
 */
export const MAX_IMAGE_KILOBYTES = 5120;

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFiles(field: TemplateField, files: MultipartFile[]): string | null {
  const min = field.minimum_files ?? 0;
  const max = field.maximum_files ?? Infinity;
  if (files.length < min) {
    return min === 1
      ? `${field.label} requires at least one file.`
      : `${field.label} requires at least ${min} files.`;
  }
  if (files.length > max) return `${field.label} allows at most ${max} files.`;
  const extensions = (field.allowed_extensions ?? []).map((e) => e.toLowerCase());
  const types = field.allowed_file_types ?? [];
  for (const file of files) {
    const ext = fileExtension(file);
    const extOk = extensions.length === 0 || extensions.includes(ext);
    const typeOk = types.length === 0 || types.includes(file.type);
    if (!extOk && !typeOk) {
      return `${field.label} does not accept ${ext ? `.${ext}` : "this"} files.`;
    }
  }
  const oversizeIndex = files.findIndex(
    (file) => file.type.startsWith("image/") && (file.size ?? 0) > MAX_IMAGE_KILOBYTES * 1024,
  );
  if (oversizeIndex !== -1) {
    const file = files[oversizeIndex];
    return `File ${oversizeIndex + 1} (${file.name}) is ${formatMegabytes(file.size ?? 0)}. Images must be ${MAX_IMAGE_KILOBYTES / 1024} MB or smaller.`;
  }
  return null;
}

function validateOther(
  field: TemplateField,
  value: unknown,
  values: FormValues,
): [string, string] | null {
  const other = otherOption(field);
  if (!other?.custom_value_key) return null;
  const selected = Array.isArray(value)
    ? includesLoose(value as Scalar[], other.value)
    : String(value) === String(other.value);
  const custom = values[other.custom_value_key];
  if (selected && isBlank(custom)) {
    return [
      other.custom_value_key,
      `${other.custom_value_label ?? other.label} is required when ${other.label} is selected.`,
    ];
  }
  if (!selected && !isBlank(custom)) {
    return [
      other.custom_value_key,
      `${other.custom_value_label ?? other.label} is only allowed when ${other.label} is selected.`,
    ];
  }
  return null;
}

function validateUnit(field: TemplateField, values: FormValues, required: boolean): [string, string] | null {
  const key = field.unit_value_key;
  if (!key) return null;
  const unit = values[key];
  const v = field.unit_validation ?? {};
  if (isBlank(unit)) {
    return required ? [key, `${field.label} unit is required.`] : null;
  }
  const allowed = v.allowed_values ?? optionValues(field.unit_options);
  if (allowed.length && !includesLoose(allowed, unit)) {
    return [key, `${field.label} unit is invalid.`];
  }
  return null;
}

function validatePricing(
  field: TemplateField,
  template: FormTemplate,
  values: FormValues,
  ctx: EvaluationContext,
): FormErrors {
  const errors: FormErrors = {};
  const pricingType = selectedPricingType(values);
  if (!pricingType) {
    errors[PRICING_VALUE_KEYS.pricingType] = "Select a pricing type.";
    return errors;
  }
  const allowedTypes = optionValues(field.pricing_types);
  if (allowedTypes.length && !includesLoose(allowedTypes, pricingType)) {
    errors[PRICING_VALUE_KEYS.pricingType] = "Pricing type is invalid.";
    return errors;
  }

  const capability = template.provider_listing_capability;
  const format = getFormat(capability, ctx.context.format as string | null);
  const unitId = values[PRICING_VALUE_KEYS.priceUnitId];
  const unitCode = selectedPriceUnitCode(template, values);
  const subFields =
    pricingType === "fixed_price"
      ? field.fixed_price_fields ?? {}
      : field.quote_required_fields ?? {};

  // price_unit_id is required for both pricing types.
  if (isBlank(unitId)) {
    errors[PRICING_VALUE_KEYS.priceUnitId] =
      `${subFields.price_unit_id?.label ?? "Price unit"} is required.`;
  } else {
    const known = (field.price_units ?? []).some(
      (u) => String(u.value) === String(unitId),
    );
    const allowedCodes = format ? allowedPriceUnitCodes(format, pricingType) : null;
    if (!known || (allowedCodes && unitCode && !allowedCodes.includes(unitCode))) {
      errors[PRICING_VALUE_KEYS.priceUnitId] =
        "The selected price unit is not allowed for this service.";
    }
  }

  const amount = values[PRICING_VALUE_KEYS.amount];
  const amountRequired =
    pricingType === "fixed_price" ? subFields.amount?.required !== false : !!subFields.amount?.required;
  if (isBlank(amount)) {
    if (amountRequired) {
      errors[PRICING_VALUE_KEYS.amount] =
        `${subFields.amount?.label ?? "Base price"} is required.`;
    }
  } else {
    const spec = subFields.amount ?? field.base_price ?? undefined;
    const bounds: FieldValidation = {
      data_type: "number",
      minimum: spec?.validation?.minimum ?? spec?.minimum ?? 0.01,
      maximum: spec?.validation?.maximum ?? spec?.maximum ?? 9999999999.99,
    };
    const err = validateNumber(
      { ...field, label: spec?.label ?? "Base price" },
      amount,
      bounds,
    );
    if (err) errors[PRICING_VALUE_KEYS.amount] = err;
  }

  const scope = values[PRICING_VALUE_KEYS.profilePricingScope];
  const state = profilePricingScopeState(format, pricingType, unitCode);
  if (state.state === "required" && isBlank(scope)) {
    errors[PRICING_VALUE_KEYS.profilePricingScope] =
      `${format?.profile_pricing_scope?.label ?? "Price applies to"} is required.`;
  } else if (
    !isBlank(scope) &&
    state.state !== "prohibited" &&
    state.allowed_values?.length &&
    !includesLoose(state.allowed_values, scope)
  ) {
    errors[PRICING_VALUE_KEYS.profilePricingScope] =
      `${format?.profile_pricing_scope?.label ?? "Price applies to"} is invalid.`;
  }

  return errors;
}

/**
 * Validates one visible field. Returns `[key, message]` pairs so unit and
 * Other errors land on their own keys. Empty array means valid.
 */
const ANSWERS_PREFIX = "answers_json.";

function toDate(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Cross-field `relations`. The other field is resolved from `other_path` by
 * submit key, then field key. Skipped when the other field is hidden or, for
 * `both_present`, when either value is blank. Errors land on the declaring field.
 */
function validateRelations(
  field: TemplateField,
  template: FormTemplate,
  values: FormValues,
  ctx: EvaluationContext,
): string | null {
  const value = values[field.field_key];
  for (const relation of field.relations ?? []) {
    const key = relation.other_path.startsWith(ANSWERS_PREFIX)
      ? relation.other_path.slice(ANSWERS_PREFIX.length)
      : relation.other_path;
    const other =
      template.fields.find((f) => f.submit_as?.key === key) ??
      template.fields.find((f) => f.field_key === key);
    if (other && !isFieldVisible(other, template, values, ctx)) continue;
    const otherValue = values[other?.field_key ?? key];
    if (isBlank(value) || isBlank(otherValue)) continue;
    const otherLabel = other?.label ?? key;

    switch (relation.operator) {
      case "less_than_or_equal": {
        const a = toNumber(value);
        const b = toNumber(otherValue);
        if (a !== null && b !== null && a > b) {
          return `${field.label} must be less than or equal to ${otherLabel}.`;
        }
        break;
      }
      case "on_or_after": {
        const a = toDate(value);
        const b = toDate(otherValue);
        if (a !== null && b !== null && a < b) {
          return `${field.label} must be on or after ${otherLabel}.`;
        }
        break;
      }
      default:
        break;
    }
  }
  return null;
}

export function validateField(
  field: TemplateField,
  template: FormTemplate,
  values: FormValues,
  ctx: EvaluationContext = buildEvaluationContext(template, values),
): [string, string][] {
  if (field.submit_as?.type === "display_only") return [];

  if (field.field_type === "pricing") {
    return Object.entries(validatePricing(field, template, values, ctx));
  }

  const required = isFieldRequired(field, template, values, ctx);
  const value = values[field.field_key];
  const errors: [string, string][] = [];

  if (field.submit_as?.type === "certificate_bundle") {
    const bundle = (value ?? {}) as CertificateBundleValue;
    const files = bundle.files ?? [];
    if (files.length > 0 && isBlank(bundle.description)) {
      errors.push([field.field_key, `${field.label} needs a description for the uploaded files.`]);
    } else if (files.length === 0 && !isBlank(bundle.description)) {
      // Mirrors the backend rule: a description without any certificate file is a 422.
      errors.push([field.field_key, `${field.label} needs at least one file for the description.`]);
    }
    const fileError = validateFiles(field, files);
    if (fileError && (files.length > 0 || required)) {
      errors.push([field.field_key, fileError]);
    }
    return errors;
  }

  if (isBlank(value)) {
    if (required) errors.push([field.field_key, `${field.label} is required.`]);
    const unitError = validateUnit(field, values, false);
    if (unitError) errors.push(unitError);
    return errors;
  }

  let message: string | null = null;
  switch (field.field_type) {
    case "text":
    case "textarea":
      message = validateText(field, value);
      break;
    case "number":
      message = validateNumber(field, value);
      break;
    case "multi_select":
      message = validateMultiSelect(field, value);
      break;
    case "single_select":
      message = validateSingleSelect(field, value);
      break;
    case "yes_no":
      message = validateYesNo(field, value);
      break;
    case "file_upload":
      message = Array.isArray(value)
        ? validateFiles(field, value as MultipartFile[])
        : `${field.label} must be a list of files.`;
      break;
    default:
      break;
  }
  if (message) errors.push([field.field_key, message]);

  const relationError = validateRelations(field, template, values, ctx);
  if (relationError) errors.push([field.field_key, relationError]);

  const otherError = validateOther(field, value, values);
  if (otherError) errors.push(otherError);

  const unitError = validateUnit(field, values, required || !isBlank(value));
  if (unitError) errors.push(unitError);

  return errors;
}

/**
 * Validates every visible field. Hidden fields are skipped entirely, matching
 * the rule that their keys are omitted from the request.
 */
export function validateForm(
  template: FormTemplate,
  values: FormValues,
): FormErrors {
  const ctx = buildEvaluationContext(template, values);
  const errors: FormErrors = {};
  for (const field of template.fields) {
    if (!isFieldVisible(field, template, values, ctx)) continue;
    for (const [key, message] of validateField(field, template, values, ctx)) {
      if (!(key in errors)) errors[key] = message;
    }
  }
  return errors;
}
