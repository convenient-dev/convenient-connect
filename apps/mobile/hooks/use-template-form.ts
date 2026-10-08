import {
  getPublishabilityFieldMessages,
  getValidationIssues,
  type ApiError,
  type CommercialPublishabilityErrorData,
} from "@/api/client";
import { mapIssuesToFields } from "@/services/template";
import {
  PRICING_VALUE_KEYS,
  allowedFulfillmentOptions,
  allowedPriceUnitCodes,
  buildEvaluationContext,
  getFormat,
  isFieldRequired,
  selectedPricingType,
  validateField,
  validateForm,
  visibleFields,
  type FormErrors,
  type FormTemplate,
  type FormValues,
  type ServiceFormTemplateSection,
  type TemplateField,
} from "@/services/template";
import { useCallback, useEffect, useMemo, useState } from "react";

const PRICING_KEYS: string[] = Object.values(PRICING_VALUE_KEYS);

/** Where a server error landed: the first step to show, and unmapped messages. */
export interface ServerErrorResult {
  /** Index of the first section with a highlighted field, or -1 if none matched. */
  sectionIndex: number;
  general: string[];
}

/** Every values key a field owns: its own key plus unit / Other / pricing keys. */
export function fieldValueKeys(field: TemplateField): string[] {
  const keys = [field.field_key];
  if (field.unit_value_key) keys.push(field.unit_value_key);
  for (const option of field.options ?? []) {
    if (option.custom_value_key) keys.push(option.custom_value_key);
  }
  if (field.field_type === "pricing") keys.push(...PRICING_KEYS);
  return keys;
}

function isFileField(field: TemplateField): boolean {
  return field.field_type === "file_upload" || field.submit_as?.type === "certificate_bundle";
}

function seedDefaults(template: FormTemplate): FormValues {
  const values: FormValues = {};
  for (const field of template.fields) {
    if (field.default !== undefined) values[field.field_key] = field.default;
    if (field.field_type === "pricing" && field.charge_in_usd?.default !== undefined) {
      values[PRICING_VALUE_KEYS.chargeInUsd] = field.charge_in_usd.default;
    }
  }
  return values;
}

/**
 * Form state for a template-driven service form. Holds one values object
 * keyed by `field_key`, asks the engine what is visible/required/valid, and
 * prunes selections that the capability no longer allows.
 */
export function useTemplateForm(template: FormTemplate | null) {
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);

  useEffect(() => {
    if (template) setValues(seedDefaults(template));
  }, [template]);

  const setValue = useCallback(
    (key: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        // Also clear fields whose relations point at the edited field, so a
        // min/max error disappears when either side is corrected.
        const edited = template?.fields.find((f) => f.field_key === key);
        const targets = new Set([key, edited?.submit_as?.key].filter(Boolean));
        const related = (template?.fields ?? [])
          .filter((f) =>
            (f.relations ?? []).some((r) => targets.has(r.other_path.replace(/^answers_json\./, ""))),
          )
          .map((f) => f.field_key);
        const stale = [key, ...related].filter((k) => k in prev);
        // File fields are validated as soon as they change, so a rejected
        // upload (type, count, size) is flagged without waiting for Next.
        const live: FormErrors = {};
        if (template && edited && isFileField(edited)) {
          for (const [k, message] of validateField(edited, template, { ...values, [key]: value })) {
            if (!(k in live)) live[k] = message;
          }
        }
        if (!stale.length && !Object.keys(live).length) return prev;
        const next = { ...prev };
        for (const k of stale) delete next[k];
        return { ...next, ...live };
      });
    },
    [template, values],
  );

  // Drop selections the active format no longer permits.
  useEffect(() => {
    if (!template) return;
    const updates: FormValues = {};
    const fulfillmentField = template.fields.find(
      (f) => f.submit_as?.key === "fulfillment_type_ids",
    );
    if (fulfillmentField && Array.isArray(values[fulfillmentField.field_key])) {
      const allowed = new Set(
        allowedFulfillmentOptions(template, values).map((o) => String(o.value)),
      );
      const current = values[fulfillmentField.field_key] as unknown[];
      const kept = current.filter((v) => allowed.has(String(v)));
      if (kept.length !== current.length) updates[fulfillmentField.field_key] = kept;
    }
    const pricingField = template.fields.find((f) => f.field_type === "pricing");
    const unitId = values[PRICING_VALUE_KEYS.priceUnitId];
    if (pricingField && unitId !== undefined && unitId !== null) {
      const ctx = buildEvaluationContext(template, values);
      const format = getFormat(
        template.provider_listing_capability,
        ctx.context.format as string | null,
      );
      const pricingType = selectedPricingType(values);
      if (format && pricingType) {
        const allowedCodes = allowedPriceUnitCodes(format, pricingType);
        const unit = pricingField.price_units?.find(
          (u) => String(u.value) === String(unitId),
        );
        if (unit && !allowedCodes.includes(unit.code)) {
          updates[PRICING_VALUE_KEYS.priceUnitId] = undefined;
          updates[PRICING_VALUE_KEYS.profilePricingScope] = undefined;
        }
      }
    }
    if (Object.keys(updates).length) setValues((prev) => ({ ...prev, ...updates }));
  }, [template, values]);

  const sections = useMemo<ServiceFormTemplateSection[]>(() => {
    const list = template?.sections ?? [];
    return [...list].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [template]);

  const visible = useMemo(
    () => (template ? visibleFields(template, values) : []),
    [template, values],
  );

  const fieldsForSection = useCallback(
    (section: ServiceFormTemplateSection): TemplateField[] =>
      (section.field_keys ?? [])
        .map((key) => visible.find((f) => f.field_key === key))
        .filter((f): f is TemplateField => !!f),
    [visible],
  );

  /** Visible fields the template did not place in any section. */
  const unsectionedFields = useMemo(() => {
    const placed = new Set(sections.flatMap((s) => s.field_keys ?? []));
    return visible.filter((f) => !placed.has(f.field_key));
  }, [sections, visible]);

  const isRequired = useCallback(
    (field: TemplateField) => (template ? isFieldRequired(field, template, values) : false),
    [template, values],
  );

  /** Validates only the given fields; returns true when they are all valid. */
  const validateFields = useCallback(
    (fields: TemplateField[]): boolean => {
      if (!template) return false;
      const all = validateForm(template, values);
      const keys = new Set(fields.flatMap(fieldValueKeys));
      const scoped: FormErrors = {};
      for (const [key, message] of Object.entries(all)) {
        if (keys.has(key)) scoped[key] = message;
      }
      setErrors((prev) => {
        const next = { ...prev };
        for (const key of keys) delete next[key];
        return { ...next, ...scoped };
      });
      return Object.keys(scoped).length === 0;
    },
    [template, values],
  );

  /**
   * Index of the first section that owns any of the given keys, or -1. Pure,
   * so callers can navigate in the same tick they set the errors.
   */
  const sectionIndexForKeys = useCallback(
    (keys: Iterable<string>): number => {
      const errored = new Set(keys);
      if (!errored.size) return -1;
      return sections.findIndex((section) =>
        fieldsForSection(section).some((field) =>
          fieldValueKeys(field).some((key) => errored.has(key)),
        ),
      );
    },
    [sections, fieldsForSection],
  );

  /**
   * Validates every field. Returns -1 when valid, otherwise the index of the
   * first section with an error (0 when the errored keys sit outside sections).
   */
  const validateAll = useCallback((): number => {
    if (!template) return 0;
    const all = validateForm(template, values);
    setErrors(all);
    const keys = Object.keys(all);
    if (!keys.length) return -1;
    return Math.max(0, sectionIndexForKeys(keys));
  }, [template, values, sectionIndexForKeys]);

  /**
   * Maps a publishability 422 onto field keys. Keys that match a field key or
   * a submit key land on that field; anything else goes to `generalErrors`.
   */
  const applyServerErrors = useCallback(
    (error: ApiError & { data: CommercialPublishabilityErrorData }): ServerErrorResult => {
      if (!template) return { sectionIndex: -1, general: [] };
      const messages = getPublishabilityFieldMessages(error);
      const fieldErrors: FormErrors = {};
      const general: string[] = [];
      for (const [key, list] of Object.entries(messages)) {
        const message = list[0];
        if (!message) continue;
        const byKey = template.fields.find((f) => f.field_key === key);
        const bySubmit = template.fields.find((f) => f.submit_as?.key === key);
        if (byKey) fieldErrors[byKey.field_key] = message;
        else if (bySubmit) fieldErrors[bySubmit.field_key] = message;
        else if (PRICING_KEYS.includes(key)) fieldErrors[key] = message;
        else general.push(message);
      }
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      setGeneralErrors(general);
      return { sectionIndex: sectionIndexForKeys(Object.keys(fieldErrors)), general };
    },
    [template, sectionIndexForKeys],
  );

  /**
   * Maps structured `data.issues` from any 422 onto fields. `path` is a wire
   * path such as `title`, `certificate_files`, `portfolio_images.1` or
   * `answers_json.qualifications`; `$` and unknown paths go to `generalErrors`.
   * Returns null when the error carried no structured issues.
   */
  const applyServerIssues = useCallback(
    (error: unknown): ServerErrorResult | null => {
      const issues = getValidationIssues(error);
      if (!template || issues.length === 0) return null;
      const { fieldErrors, general } = mapIssuesToFields(template, values, issues);
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      setGeneralErrors(general);
      return { sectionIndex: sectionIndexForKeys(Object.keys(fieldErrors)), general };
    },
    [template, values, sectionIndexForKeys],
  );

  const clearGeneralErrors = useCallback(() => setGeneralErrors([]), []);

  return {
    values,
    errors,
    generalErrors,
    setValue,
    sections,
    visible,
    fieldsForSection,
    unsectionedFields,
    isRequired,
    validateFields,
    validateAll,
    applyServerErrors,
    applyServerIssues,
    clearGeneralErrors,
    sectionIndexForKeys,
  };
}

export type TemplateFormState = ReturnType<typeof useTemplateForm>;
