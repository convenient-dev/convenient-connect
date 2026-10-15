/**
 * Template sweep: pulls GET /service-provider/service-form-template for every
 * category/subcategory on the configured Laravel API as an individual provider
 * (provider_type=individual, no business_id) and runs each payload through the
 * same engine the create-service form uses, reporting anything the app would
 * render wrongly or silently drop. Business create forms are not swept.
 *
 * Run from apps/mobile (no test runner in this repo):
 *   node -r sucrase/register/ts scripts/sweep-templates.ts [options]
 *
 * Options:
 *   --only <substring>                    only subcategories whose name/id contains this
 *   --save-dir <dir>                      write each raw template JSON into <dir>
 *   --json <file>                         write the findings report as JSON
 *   --verbose                             also print INFO lines and the visible-field list
 *
 * Auth: BEARER_TOKEN from .env.local (or env). Base URL: EXPO_PUBLIC_LARAVEL_API_URL
 * from .env.local / .env (or env).
 */
import * as fs from "fs";
import * as path from "path";
import {
  asTemplate,
  allowedFulfillmentOptions,
  buildCreateFormData,
  buildEvaluationContext,
  evaluatePredicate,
  validateForm,
  visibleFields,
  PRICING_VALUE_KEYS,
  type FormTemplate,
  type FormValues,
  type Predicate,
} from "../services/template/index";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..");

function readEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = { ...readEnvFile(path.join(ROOT, ".env")), ...readEnvFile(path.join(ROOT, ".env.local")) };
const env = (key: string) => process.env[key] ?? fileEnv[key];

function parseArgs(argv: string[]) {
  const args = {
    only: undefined as string | undefined,
    saveDir: undefined as string | undefined,
    json: undefined as string | undefined,
    verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--only") args.only = next()?.toLowerCase();
    else if (a === "--save-dir") args.saveDir = next();
    else if (a === "--json") args.json = next();
    else if (a === "--verbose") args.verbose = true;
    else if (a === "--help" || a === "-h") {
      console.log(fs.readFileSync(__filename, "utf8").split("*/")[0]);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

const ARGS = parseArgs(process.argv.slice(2));
const BASE_URL = (env("EXPO_PUBLIC_LARAVEL_API_URL") ?? "https://uatservices-backend.theconvenientapp.store/api/v1").replace(/\/$/, "");
const TOKEN = env("BEARER_TOKEN");
if (!TOKEN) {
  console.error("BEARER_TOKEN not set (put it in apps/mobile/.env.local or the environment).");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function api<T>(pathname: string, query: Record<string, unknown> = {}): Promise<T> {
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  const url = `${BASE_URL}${pathname}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const message = body?.message ?? text.slice(0, 200);
    throw new Error(`HTTP ${res.status} ${pathname}: ${message}`);
  }
  return (body?.data ?? body) as T;
}

interface CategoryItem { category_id: number; category_name: string }
interface SubcategoryItem {
  sub_category_id: number;
  sub_category_name: string;
  capability?: { source_key?: string; canonical_owner_key?: string; is_alias?: boolean };
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

type Level = "ERROR" | "WARN" | "INFO";
interface Finding { level: Level; check: string; message: string }

class Report {
  findings: Finding[] = [];
  add(level: Level, check: string, message: string) {
    this.findings.push({ level, check, message });
  }
  error(check: string, message: string) { this.add("ERROR", check, message); }
  warn(check: string, message: string) { this.add("WARN", check, message); }
  info(check: string, message: string) { this.add("INFO", check, message); }
  count(level: Level) { return this.findings.filter((f) => f.level === level).length; }
}

// Mirrors components/template-form/TemplateField.tsx. Anything else renders null.
const RENDERABLE_FIELD_TYPES = new Set([
  "text", "textarea", "number", "single_select", "multi_select", "yes_no", "address", "file_upload", "pricing",
]);
// Mirrors the switch in services/template/payload.ts buildPayload. Anything else is never submitted.
const KNOWN_SUBMIT_TYPES = new Set([
  "display_only", "top_level", "answers_json", "dynamic_files", "certificate_bundle", "pricing_fields",
]);
// Mirrors services/template/predicates.ts evaluateLeaf. Unknown operators evaluate to true.
const KNOWN_OPERATORS = new Set([
  "equals", "not_equals", "in", "not_in", "empty", "not_empty", "contains", "not_contains", "contains_any", "less_than", "greater_than",
]);
// Mirrors buildEvaluationContext in services/template/visibility.ts.
const KNOWN_CONTEXT_KEYS = new Set([
  "pricing_type", "price_unit", "price_unit_code", "price_unit_id", "fulfillment_types", "fulfillment_type_codes", "fulfillment_type_code", "business_format", "format",
  "provider_type", "business_id", "can_charge_in_usd", "is_usd_currency", "default_currency",
]);
const PRICING_KEYS = new Set<string>(Object.values(PRICING_VALUE_KEYS));

const SELECT_TYPES = new Set(["single_select", "multi_select"]);

function predicateValues(p: Predicate): unknown[] {
  if (p.values) return p.values;
  if (p.value !== undefined && p.value !== null) return [p.value];
  return [];
}

function walkPredicate(p: Predicate | null | undefined, visit: (leaf: Predicate, pathLabel: string) => void, label = "") {
  if (!p) return;
  (p.all ?? []).forEach((c, i) => walkPredicate(c, visit, `${label}all[${i}].`));
  (p.any ?? []).forEach((c, i) => walkPredicate(c, visit, `${label}any[${i}].`));
  if (p.not) walkPredicate(p.not, visit, `${label}not.`);
  const isLeaf = p.operator !== undefined || p.field_key !== undefined || p.field !== undefined || p.context_key !== undefined;
  if (isLeaf) visit(p, label);
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

function checkTemplate(
  template: FormTemplate,
  report: Report,
  identity: { categoryId: number; subcategoryId: number; providerType: "individual" },
): { visibleEver: string[] } {
  const fields = template.fields ?? [];
  const byKey = new Map(fields.map((f) => [f.field_key, f]));
  const capability = template.provider_listing_capability;
  const formats = capability?.formats ?? {};
  const formatKeys = Object.keys(formats);

  if (fields.length === 0) report.error("fields", "template has no fields");
  if (!template.sections?.length) report.warn("sections", "template has no sections; everything would render on one page");

  // --- Alias / identity ----------------------------------------------------
  const rt: any = template.resolved_template;
  if (capability && (capability as any).is_alias) {
    report.info("alias", `alias ${(capability as any).source_key} -> owner ${(capability as any).canonical_owner_key}`);
  }
  if (rt?.child_template_applied === false && rt?.child_template_key) {
    report.info("resolved_template", `child template ${rt.child_template_key} present but not applied`);
  }

  // --- Field level ---------------------------------------------------------
  const seenKeys = new Set<string>();
  for (const f of fields) {
    const tag = `${f.field_key} (${f.field_type})`;
    if (seenKeys.has(f.field_key)) report.error("duplicate_key", `field_key ${f.field_key} appears more than once`);
    seenKeys.add(f.field_key);

    if (!RENDERABLE_FIELD_TYPES.has(f.field_type as string)) {
      report.error("unrenderable", `${tag}: field_type not handled by TemplateField.tsx; renders nothing`);
    }
    const submitType = f.submit_as?.type as string | undefined;
    if (!submitType) {
      report.warn("submit_as", `${tag}: no submit_as; value would never be sent`);
    } else if (!KNOWN_SUBMIT_TYPES.has(submitType)) {
      report.error("submit_as", `${tag}: submit_as.type "${submitType}" unknown to buildPayload; value would never be sent`);
    }
    if (f.field_type === "address" && submitType !== "display_only") {
      report.warn("address", `${tag}: address field without display_only submit_as`);
    }
    if (f.requiredness === "prohibited" && !f.visible_when && submitType !== "display_only") {
      report.info("prohibited", `${tag}: prohibited with no visible_when; always hidden`);
    }

    // options
    if (SELECT_TYPES.has(f.field_type as string)) {
      const opts = f.options ?? [];
      if (opts.length === 0) {
        const set: any = (f as any).descriptor?.set;
        if (set?.mode === "open" || set?.entry === "free_entry") {
          report.error("free_entry", `${tag}: free-entry select (descriptor.set ${JSON.stringify(set)}) with no options; MultiSelectControl/SingleSelectControl render no input${f.is_required ? " and the field is required, so the form cannot be submitted" : ""}`);
        } else {
          report.error("options", `${tag}: select field has no options`);
        }
      }
      opts.forEach((o, i) => {
        if (o.value === undefined || o.value === null) report.error("options", `${tag}: options[${i}] has no value`);
        if (!o.label) report.error("options", `${tag}: options[${i}] has no label`);
        if (o.allows_custom_value && !o.custom_value_key) report.warn("options", `${tag}: options[${i}] allows a custom value but has no custom_value_key; Other input cannot render`);
      });
      const values = opts.map((o) => String(o.value));
      if (new Set(values).size !== values.length) report.error("options", `${tag}: duplicate option values`);
    } else if (f.options?.length && f.field_type !== "yes_no") {
      report.info("options", `${tag}: carries options but is not a select field; options are ignored`);
    }

    if (f.unit_value_key && !(f.unit_options?.length)) {
      report.warn("unit", `${tag}: unit_value_key ${f.unit_value_key} without unit_options; unit chips cannot render`);
    }

    // validation shape
    if (Array.isArray(f.validation) && f.validation.length) {
      report.warn("validation", `${tag}: validation is a non-empty array; engine expects an object`);
    }
    const v: any = Array.isArray(f.validation) ? null : f.validation;
    if (v && v.minimum !== undefined && v.maximum !== undefined && Number(v.minimum) > Number(v.maximum)) {
      report.error("validation", `${tag}: minimum ${v.minimum} > maximum ${v.maximum}`);
    }
    if (v?.allowed_values && SELECT_TYPES.has(f.field_type as string)) {
      const optVals = new Set((f.options ?? []).map((o) => String(o.value)));
      const extra = (v.allowed_values as unknown[]).filter((x) => !optVals.has(String(x)));
      if (extra.length) report.warn("validation", `${tag}: allowed_values not present in options: ${extra.join(", ")}`);
    }

    // files
    if (f.field_type === "file_upload" || submitType === "certificate_bundle") {
      if (!f.allowed_file_types?.length && !f.allowed_extensions?.length) {
        report.info("files", `${tag}: no allowed_file_types/allowed_extensions; any file accepted`);
      }
      if (f.minimum_files && f.maximum_files && f.minimum_files > f.maximum_files) {
        report.error("files", `${tag}: minimum_files > maximum_files`);
      }
      if (submitType === "dynamic_files" && !f.submit_as?.key && !(f.submit_as as any)?.field_key) {
        report.warn("files", `${tag}: dynamic_files without submit_as.key`);
      }
    }

    // relations
    for (const r of f.relations ?? []) {
      const other = r.other_path.replace(/^answers_json\./, "");
      if (!byKey.has(other) && !PRICING_KEYS.has(other)) {
        report.warn("relations", `${tag}: relation ${r.operator} points at unknown field ${r.other_path}`);
      }
    }

    // predicates
    const preds: [string, Predicate | null | undefined][] = [
      ["visible_when", f.visible_when],
      ["required_when", f.required_when],
      ["prohibited_when", f.prohibited_when],
    ];
    if (f.field_type === "pricing") preds.push(["charge_in_usd.visible_when", f.charge_in_usd?.visible_when]);
    for (const [name, pred] of preds) {
      walkPredicate(pred, (leaf, where) => {
        const loc = `${tag} ${name}.${where}`;
        if (leaf.operator === undefined) {
          report.warn("predicate", `${loc}: leaf without operator; evaluates to true`);
        } else if (!KNOWN_OPERATORS.has(leaf.operator)) {
          report.error("predicate", `${loc}: unknown operator "${leaf.operator}"; evaluates to true`);
        }
        const expected = predicateValues(leaf);
        const needsValues = leaf.operator && !["empty", "not_empty"].includes(leaf.operator);
        if (needsValues && expected.length === 0) {
          report.warn("predicate", `${loc}: operator ${leaf.operator} without value/values`);
        }
        if (leaf.context_key !== undefined) {
          if (!KNOWN_CONTEXT_KEYS.has(leaf.context_key)) {
            report.error("predicate", `${loc}: unknown context_key "${leaf.context_key}"; the engine only knows ${[...KNOWN_CONTEXT_KEYS].join(", ")}, so the subject is undefined and the rule never holds`);
            return;
          }
          const ck = leaf.context_key;
          const check = (allowed: string[], what: string) => {
            const bad = expected.filter((x) => !allowed.includes(String(x)));
            if (bad.length && allowed.length) report[bad.length === expected.length ? "warn" : "info"]("predicate", `${loc}: ${ck} value(s) ${bad.join(", ")} never produced (known ${what}: ${allowed.join(", ")})`);
          };
          if (ck === "pricing_type") check(["fixed_price", "quote_required"], "pricing types");
          if (ck === "price_unit" || ck === "price_unit_code") {
            const units = fields.find((x) => x.field_type === "pricing")?.price_units?.map((u) => u.code) ?? [];
            check(units, "price unit codes");
          }
          if (ck === "fulfillment_types") {
            const ff = fields.find((x) => x.submit_as?.key === "fulfillment_type_ids");
            check((ff?.options ?? []).map((o) => o.code ?? "").filter(Boolean), "fulfillment codes");
          }
          if (ck === "format" || ck === "business_format") check(formatKeys, "format keys");
          return;
        }
        const subjectKey = leaf.field_key ?? leaf.field;
        if (subjectKey === undefined) {
          report.warn("predicate", `${loc}: leaf has neither field_key nor context_key`);
          return;
        }
        const subject = byKey.get(subjectKey);
        if (!subject) {
          if (PRICING_KEYS.has(subjectKey) || subjectKey === capability?.business_format?.field_key) return;
          if (subjectKey === "fulfillment_types") {
            report.warn("predicate", `${loc}: rule depends on fulfillment_types but this template has no fulfillment field (capability fulfillment is empty); the field can never become visible`);
          } else if (KNOWN_CONTEXT_KEYS.has(subjectKey)) {
            report.error("predicate", `${loc}: "${subjectKey}" is sent as field_key but it is a context value; the engine looks it up in form values and gets undefined, so the rule never holds (backend should send context_key, or the engine should fall back to context)`);
          } else {
            report.error("predicate", `${loc}: references unknown field_key "${subjectKey}"`);
          }
          return;
        }
        if (subject.options?.length && expected.length) {
          const hasCodes = subject.options.some((o) => o.code);
          const comparable = subject.options.map((o) => String(hasCodes ? o.code ?? o.value : o.value));
          const bad = expected.filter((x) => !comparable.includes(String(x)));
          if (bad.length) {
            // Generic templates list every code a rule can match; only a rule
            // that matches none of this subcategory's options is suspicious.
            const isFulfillment = subject.submit_as?.key === "fulfillment_type_ids";
            const level = bad.length === expected.length && !isFulfillment ? "warn" : "info";
            report[level]("predicate", `${loc}: compares ${subjectKey} against ${bad.join(", ")} but its options ${hasCodes ? "codes" : "values"} are ${comparable.join(", ")}`);
          }
        }
        if (subject.field_type === "yes_no" && expected.length) {
          const bad = expected.filter((x) => !["true", "false", "1", "0", "yes", "no"].includes(String(x).toLowerCase()));
          if (bad.length) report.warn("predicate", `${loc}: yes_no subject compared against ${bad.join(", ")}`);
        }
      });
    }
  }

  // --- Sections --------------------------------------------------------------
  const placed = new Map<string, string[]>();
  for (const s of template.sections ?? []) {
    const sk = s.section_key ?? s.title ?? "?";
    if (!s.field_keys?.length) report.warn("sections", `section ${sk} lists no field_keys`);
    for (const k of s.field_keys ?? []) {
      if (!byKey.has(k)) report.warn("sections", `section ${sk} references unknown field_key ${k}`);
      placed.set(k, [...(placed.get(k) ?? []), sk]);
    }
  }
  for (const [k, secs] of placed) {
    if (secs.length > 1) report.warn("sections", `field ${k} placed in several sections (${secs.join(", ")}); renders in each`);
  }
  const unsectioned = fields.filter((f) => !placed.has(f.field_key));
  if (unsectioned.length) {
    report.warn("sections", `fields outside every section (render on the last page): ${unsectioned.map((f) => f.field_key).join(", ")}`);
  }
  const orders = (template.sections ?? []).map((s) => s.display_order ?? 0);
  if (new Set(orders).size !== orders.length) report.warn("sections", "duplicate display_order values; page order is unstable");

  // --- Capability --------------------------------------------------------------
  if (!capability) {
    report.warn("capability", "no provider_listing_capability; fulfillment and pricing are unfiltered");
  } else {
    if (formatKeys.length === 0) report.error("capability", "capability has no formats; no fulfillment/pricing rules apply");
    const bf = capability.business_format;
    if (bf) {
      if (!byKey.has(bf.field_key)) {
        report.error("business_format", `business_format.field_key ${bf.field_key} is not a template field; the selector never renders and no format can activate`);
      } else {
        const sel = byKey.get(bf.field_key)!;
        const selVals = (sel.options ?? []).map((o) => String(o.value));
        const bad = selVals.filter((x) => !formatKeys.includes(x));
        if (bad.length) report.error("business_format", `${bf.field_key} option values ${bad.join(", ")} are not format keys (${formatKeys.join(", ")}); choosing them activates no format`);
        const missing = formatKeys.filter((k) => !selVals.includes(k));
        if (missing.length) report.warn("business_format", `formats ${missing.join(", ")} cannot be selected via ${bf.field_key}`);
      }
      const bfVals = (bf.options ?? []).map((o) => String(o.value));
      const badCap = bfVals.filter((x) => !formatKeys.includes(x));
      if (badCap.length) report.error("business_format", `capability.business_format options ${badCap.join(", ")} are not format keys`);
    }

    // fulfillment
    const ff = fields.find((x) => x.submit_as?.key === "fulfillment_type_ids");
    const capFulfillment = new Set<string>();
    for (const fk of formatKeys) {
      const fmt = formats[fk];
      (fmt.fulfillment ?? []).forEach((c) => capFulfillment.add(c));
      const byUnit = Array.isArray(fmt.fulfillment_by_price_unit) ? {} : fmt.fulfillment_by_price_unit ?? {};
      Object.values(byUnit).forEach((codes) => codes.forEach((c) => capFulfillment.add(c)));
    }
    if (!ff) {
      if (capFulfillment.size) report.error("fulfillment", `capability names fulfillment ${[...capFulfillment].join(", ")} but no field submits fulfillment_type_ids`);
    } else {
      const codes = (ff.options ?? []).map((o) => o.code);
      const noCode = (ff.options ?? []).filter((o) => !o.code);
      if (noCode.length) report.error("fulfillment", `fulfillment options without code: ${noCode.map((o) => o.label).join(", ")}; filtered out by allowedFulfillmentOptions`);
      const unreachable = (ff.options ?? []).filter((o) => o.code && !capFulfillment.has(o.code));
      if (unreachable.length) report.warn("fulfillment", `fulfillment options never allowed by any format: ${unreachable.map((o) => `${o.label}(${o.code})`).join(", ")}`);
      const missingOpt = [...capFulfillment].filter((c) => !codes.includes(c));
      if (missingOpt.length) report.warn("fulfillment", `capability allows ${missingOpt.join(", ")} but the field has no such option`);
    }

    // pricing
    const pf = fields.find((x) => x.field_type === "pricing");
    const capUnits = new Set<string>();
    for (const fk of formatKeys) {
      Object.values(formats[fk].pricing ?? {}).forEach((list) => (list ?? []).forEach((c) => capUnits.add(c)));
    }
    if (!pf) {
      report.error("pricing", "template has no pricing field");
    } else {
      const unitCodes = (pf.price_units ?? []).map((u) => u.code);
      if (!unitCodes.length) report.error("pricing", "pricing field has no price_units");
      const missing = [...capUnits].filter((c) => !unitCodes.includes(c));
      if (missing.length) report.warn("pricing", `capability allows unit(s) ${missing.join(", ")} but price_units lacks them`);
      const dead = unitCodes.filter((c) => !capUnits.has(c));
      if (dead.length) report.warn("pricing", `price_units ${dead.join(", ")} are never allowed by any format/pricing type; filtered out`);
      const types = (pf.pricing_types ?? []).map((t) => String(t.value));
      const badTypes = types.filter((t) => !["fixed_price", "quote_required"].includes(t));
      if (badTypes.length) report.error("pricing", `pricing_types ${badTypes.join(", ")} unknown to the engine`);
      for (const fk of formatKeys) {
        for (const pt of Object.keys(formats[fk].pricing ?? {})) {
          if (!types.includes(pt)) report.warn("pricing", `format ${fk} prices by ${pt} but pricing_types lacks it`);
        }
      }
      for (const [k, sub] of Object.entries(pf.fixed_price_fields ?? {})) {
        if (sub && sub.value_key && !PRICING_KEYS.has(sub.value_key) && sub.value_key !== "currency") report.warn("pricing", `fixed_price_fields.${k}.value_key ${sub.value_key} is not a pricing value key`);
      }
    }

    // prohibited provider fields present as fields
    const prohibited: string[] = (capability as any).prohibited_provider_fields ?? (capability as any).prohibited_fields ?? [];
    for (const k of prohibited) {
      if (byKey.has(k) || fields.some((f) => f.submit_as?.key === k)) {
        report.info("prohibited", `prohibited provider field ${k} is in fields[]; hidden by the engine`);
      }
    }
    for (const bad of ["booking_policy", "schedule_family", "profile_mode"]) {
      if (byKey.has(bad) || fields.some((f) => f.submit_as?.key === bad)) {
        report.error("prohibited", `${bad} present in fields[]; backend rejects it with 422`);
      }
    }
  }

  // --- Simulation ------------------------------------------------------------
  const defaults = seedDefaults(template);
  const visibleEver = new Set<string>();
  const requiredEver = new Set<string>();
  let states = 0;

  const bfKey = capability?.business_format?.field_key;
  const bfValues: unknown[] = bfKey ? [undefined, ...(byKey.get(bfKey)?.options ?? capability?.business_format?.options ?? []).map((o) => o.value)] : [undefined];
  const ff = fields.find((x) => x.submit_as?.key === "fulfillment_type_ids");
  const ffValues: unknown[] = [undefined, ...(ff?.options ?? []).map((o) => [o.value])];
  const pf = fields.find((x) => x.field_type === "pricing");
  const ptValues: unknown[] = [undefined, ...(pf?.pricing_types ?? []).map((t) => t.value)];
  const puValues: unknown[] = [undefined, ...(pf?.price_units ?? []).map((u) => u.value)];
  const yesNoKeys = fields.filter((f) => f.field_type === "yes_no").map((f) => f.field_key);

  const simulate = (values: FormValues) => {
    states++;
    try {
      const vis = visibleFields(template, values);
      for (const f of vis) visibleEver.add(f.field_key);
      const ctxVals = values;
      for (const f of vis) {
        const req = f.is_required || (f.required_when ? evaluatePredicate(f.required_when, buildEvaluationContext(template, ctxVals)) : false);
        if (req) requiredEver.add(f.field_key);
      }
      validateForm(template, values);
    } catch (e) {
      report.error("engine", `engine threw for state ${JSON.stringify(values)}: ${(e as Error).message}`);
    }
  };

  for (const bv of bfValues) {
    for (const fv of ffValues) {
      for (const pt of ptValues) {
        for (const pu of puValues) {
          const values: FormValues = { ...defaults };
          if (bfKey && bv !== undefined) values[bfKey] = bv;
          if (ff && fv !== undefined) values[ff.field_key] = fv;
          if (pt !== undefined) values[PRICING_VALUE_KEYS.pricingType] = pt;
          if (pu !== undefined) values[PRICING_VALUE_KEYS.priceUnitId] = pu;
          simulate(values);
          // flip every yes_no both ways on top of this state
          for (const yk of yesNoKeys) {
            simulate({ ...values, [yk]: true });
            simulate({ ...values, [yk]: false });
          }
        }
      }
    }
  }
  // Also select every option of every single_select once (drives most visible_when rules).
  for (const f of fields) {
    if (f.field_type !== "single_select" || f.submit_as?.key === "fulfillment_type_ids" || f.field_key === bfKey) continue;
    for (const o of f.options ?? []) simulate({ ...defaults, [f.field_key]: o.value });
  }
  for (const f of fields) {
    if (f.field_type !== "multi_select" || f.submit_as?.key === "fulfillment_type_ids") continue;
    for (const o of f.options ?? []) simulate({ ...defaults, [f.field_key]: [o.value] });
  }

  // Options the control actually offers before any input (what the user sees).
  if (ff && capability) {
    const offered = new Set(allowedFulfillmentOptions(template, defaults).map((o) => o.code));
    const capAll = new Set<string>();
    for (const fk of formatKeys) {
      const fmt = formats[fk];
      (fmt.fulfillment ?? []).forEach((c) => capAll.add(c));
      const byUnit = Array.isArray(fmt.fulfillment_by_price_unit) ? {} : fmt.fulfillment_by_price_unit ?? {};
      Object.values(byUnit).forEach((codes) => codes.forEach((c) => capAll.add(c)));
    }
    const hidden = (ff.options ?? []).filter((o) => o.code && capAll.has(o.code) && !offered.has(o.code));
    if (hidden.length) {
      report.error("fulfillment", `the control offers only ${[...offered].join(", ") || "(nothing)"} before any input; ${hidden.map((o) => o.code).join(", ")} are allowed by the capability but never selectable`);
    }
  }

  const never = fields.filter((f) => !visibleEver.has(f.field_key));
  for (const f of never) {
    const prohibitedByDesign = f.requiredness === "prohibited";
    const conditional = !!(f.visible_when || f.prohibited_when);
    const level: "info" | "warn" | "error" = prohibitedByDesign ? "info" : f.is_required ? "error" : conditional ? "info" : "warn";
    report[level]("never_visible",
      `${f.field_key} (${f.field_type}) never became visible across ${states} simulated states${prohibitedByDesign ? " (prohibited by design)" : conditional ? " (its conditions cannot hold for this subcategory)" : ""}`);
  }
  const initial = visibleFields(template, defaults).map((f) => f.field_key);
  report.info("initial", `${initial.length}/${fields.length} fields visible before any input: ${initial.join(", ")}`);
  report.info("required", `required at least once: ${[...requiredEver].join(", ") || "(none)"}`);

  try {
    buildCreateFormData(template, defaults, identity);
  } catch (e) {
    report.error("engine", `buildCreateFormData threw: ${(e as Error).message}`);
  }

  return { visibleEver: [...visibleEver] };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface Result {
  category: string;
  categoryId: number;
  subcategory: string;
  subcategoryId: number;
  providerType: "individual";
  alias?: string;
  fetchError?: string;
  findings: Finding[];
  fieldCount?: number;
  sectionCount?: number;
}

async function main() {
  console.log(`Base URL: ${BASE_URL}`);
  const providerType = "individual" as const;

  const results: Result[] = [];
  const categories = await api<CategoryItem[]>("/service-provider/services/categories");
  console.log(`\n[${providerType}] ${categories.length} categories`);
  for (const cat of categories) {
    const subs = await api<SubcategoryItem[]>(`/service-provider/services/categories/${cat.category_id}/subcategories`);
    for (const sub of subs) {
      const label = `${cat.category_name} / ${sub.sub_category_name}`;
      if (ARGS.only && !label.toLowerCase().includes(ARGS.only) && String(sub.sub_category_id) !== ARGS.only) continue;
      const result: Result = {
        category: cat.category_name,
        categoryId: cat.category_id,
        subcategory: sub.sub_category_name,
        subcategoryId: sub.sub_category_id,
        providerType,
        alias: sub.capability?.is_alias ? `${sub.capability.source_key} -> ${sub.capability.canonical_owner_key}` : undefined,
        findings: [],
      };
      results.push(result);
      const report = new Report();
      try {
        const raw = await api<any>("/service-provider/service-form-template", {
          category_id: cat.category_id,
          subcategory_id: sub.sub_category_id,
          provider_type: providerType,
        });
        if (ARGS.saveDir) {
          fs.mkdirSync(ARGS.saveDir, { recursive: true });
          const slug = `${cat.category_id}-${sub.sub_category_id}-${providerType}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          fs.writeFileSync(path.join(ARGS.saveDir, `${slug}.json`), JSON.stringify(raw, null, 2));
        }
        const template = asTemplate(raw);
        result.fieldCount = template.fields?.length ?? 0;
        result.sectionCount = template.sections?.length ?? 0;
        checkTemplate(template, report, {
          categoryId: cat.category_id,
          subcategoryId: sub.sub_category_id,
          providerType,
        });
      } catch (e) {
        result.fetchError = (e as Error).message;
        report.error("fetch", result.fetchError);
      }
      result.findings = report.findings;

      const errors = report.count("ERROR");
      const warns = report.count("WARN");
      const status = errors ? "ERROR" : warns ? "WARN " : "OK   ";
      console.log(`\n${status} ${label}${result.alias ? `  [alias ${result.alias}]` : ""}  (id ${sub.sub_category_id}, ${result.fieldCount ?? 0} fields, ${result.sectionCount ?? 0} sections)`);
      for (const f of report.findings) {
        if (f.level === "INFO" && !ARGS.verbose) continue;
        console.log(`   ${f.level.padEnd(5)} [${f.check}] ${f.message}`);
      }
    }
  }

  // Summary
  const totals = { ERROR: 0, WARN: 0, INFO: 0 } as Record<Level, number>;
  for (const r of results) for (const f of r.findings) totals[f.level]++;
  const bad = results.filter((r) => r.findings.some((f) => f.level === "ERROR"));
  const warned = results.filter((r) => !bad.includes(r) && r.findings.some((f) => f.level === "WARN"));
  console.log("\n==================== SUMMARY ====================");
  console.log(`templates checked: ${results.length}   with errors: ${bad.length}   warnings only: ${warned.length}   clean: ${results.length - bad.length - warned.length}`);
  console.log(`findings: ${totals.ERROR} errors, ${totals.WARN} warnings, ${totals.INFO} info`);
  const byCheck = new Map<string, number>();
  for (const r of results) for (const f of r.findings) if (f.level !== "INFO") byCheck.set(`${f.level} ${f.check}`, (byCheck.get(`${f.level} ${f.check}`) ?? 0) + 1);
  for (const [k, n] of [...byCheck].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
  if (bad.length) {
    console.log("\nTemplates with errors:");
    for (const r of bad) console.log(`  - ${r.category} / ${r.subcategory} (id ${r.subcategoryId}, ${r.providerType})`);
  }

  if (ARGS.json) {
    fs.writeFileSync(ARGS.json, JSON.stringify({ baseUrl: BASE_URL, generatedAt: new Date().toISOString(), results }, null, 2));
    console.log(`\nJSON report written to ${ARGS.json}`);
  }
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
