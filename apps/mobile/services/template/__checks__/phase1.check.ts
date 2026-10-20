/**
 * Template engine verification script (no test runner in this repo).
 *
 * Run from apps/mobile:
 *   node -r sucrase/register/ts services/template/__checks__/phase1.check.ts
 *
 * Every fixture is a real UAT `GET /service-provider/service-form-template`
 * response for an individual provider (see ../__fixtures__/README.md). Where
 * the engine supports a shape no UAT template exercises yet, a fixture is
 * copied and tweaked in place and the check says so.
 *
 * Uses a recording FormData because React Native accepts {uri,name,type}
 * file objects that Node's FormData would stringify.
 */
import type { MultipartFile } from "../../../api/multipart";
import {
  allowedFulfillmentCodes,
  allowedPriceUnitCodes,
  asTemplate,
  buildCandidateFormData,
  buildCreateFormData,
  buildEvaluationContext,
  buildInformationFormData,
  buildPayload,
  evaluatePredicate,
  filterPriceUnits,
  getFormat,
  encodeLanguagePair,
  formatLanguagePair,
  isFreeEntryField,
  isLanguagePairField,
  isListingField,
  parseLanguagePair,
  mapIssuesToFields,
  profilePricingScopeState,
  resolveActiveFormatKey,
  resolveCurrency,
  validateForm,
  visibleFields,
  type FormTemplate,
  type FormValues,
  type Predicate,
} from "../index";
import cateringResponse from "../__fixtures__/template-catering.json";
import laundryResponse from "../__fixtures__/template-laundry.json";
import tutoringResponse from "../__fixtures__/education-tutoring-template.json";
import holisticResponse from "../__fixtures__/personal-holistic-template.json";
import petResponse from "../__fixtures__/pet-sitting-template.json";
import seniorsResponse from "../__fixtures__/caregiving-seniors-template.json";
import moversResponse from "../__fixtures__/misc-movers-template.json";
import editingResponse from "../__fixtures__/editing-template.json";
import interpretersResponse from "../__fixtures__/misc-interpreters-template.json";

// --- recording FormData -----------------------------------------------------
type Entry = [string, unknown];
class RecordingFormData {
  entries: Entry[] = [];
  append(key: string, value: unknown): void {
    this.entries.push([key, value]);
  }
}
(globalThis as any).FormData = RecordingFormData;

function entriesOf(fd: FormData): Entry[] {
  return (fd as unknown as RecordingFormData).entries;
}
function keysOf(fd: FormData): string[] {
  return entriesOf(fd).map(([k]) => k);
}
function get(fd: FormData, key: string): unknown[] {
  return entriesOf(fd).filter(([k]) => k === key).map(([, v]) => v);
}

// --- tiny assertion harness --------------------------------------------------
let failures = 0;
let passes = 0;
function check(condition: boolean, label: string, detail?: unknown): void {
  if (condition) {
    passes++;
    console.log(`ok   ${label}`);
  } else {
    failures++;
    console.error(`FAIL ${label}`, detail === undefined ? "" : JSON.stringify(detail));
  }
}
function section(title: string): void {
  console.log(`\n== ${title}`);
}

// --- fixtures ----------------------------------------------------------------
const unwrap = (response: unknown) => asTemplate((response as any).data);
const catering = unwrap(cateringResponse);
const laundry = unwrap(laundryResponse);
const tutoring = unwrap(tutoringResponse);
const holistic = unwrap(holisticResponse);
const pet = unwrap(petResponse);
const seniors = unwrap(seniorsResponse);
const movers = unwrap(moversResponse);
const editing = unwrap(editingResponse);
const interpreters = unwrap(interpretersResponse);
const copyOf = (t: FormTemplate): FormTemplate => JSON.parse(JSON.stringify(t));

/** Fulfillment option id for a code, from the template's own options. */
const fid = (t: FormTemplate, code: string): number =>
  Number(t.fields.find((f) => f.field_key === "fulfillment_types")!.options!.find((o) => o.code === code)!.value);
/** Price unit id for a code, from the template's pricing field. */
const uid = (t: FormTemplate, code: string): number =>
  Number(t.fields.find((f) => f.field_type === "pricing")!.price_units!.find((u) => u.code === code)!.value);

const file = (name: string, type: string): MultipartFile => ({ uri: `file:///${name}`, name, type });
const jpg = file("front.jpg", "image/jpeg");
const jpg2 = file("interior.jpg", "image/jpeg");
const pdf = file("certificate.pdf", "application/pdf");
const cori = file("cori.pdf", "application/pdf");

// ===========================================================================
section("1.1 Predicates: one true and one false case per operator");
const ctx = { fields: { fulfillment_types: ["provider_location"], subjects: ["math", "other"], title: "Hello", n: 5 }, context: { pricing_type: "fixed_price", can_charge_in_usd: true } };
const P = (p: Predicate | null | undefined) => evaluatePredicate(p, ctx);
check(P({ context_key: "pricing_type", operator: "equals", value: "fixed_price" }) && !P({ context_key: "pricing_type", operator: "equals", value: "quote_required" }), "equals");
check(P({ context_key: "pricing_type", operator: "not_equals", value: "quote_required" }) && !P({ context_key: "pricing_type", operator: "not_equals", value: "fixed_price" }), "not_equals");
check(P({ context_key: "pricing_type", operator: "in", values: ["fixed_price", "x"] }) && !P({ context_key: "pricing_type", operator: "in", values: ["x"] }), "in");
check(P({ context_key: "pricing_type", operator: "not_in", values: ["x"] }) && !P({ context_key: "pricing_type", operator: "not_in", values: ["fixed_price"] }), "not_in");
check(P({ field_key: "missing", operator: "empty" }) && !P({ field_key: "title", operator: "empty" }), "empty");
check(P({ field_key: "title", operator: "not_empty" }) && !P({ field_key: "missing", operator: "not_empty" }), "not_empty");
check(P({ field_key: "fulfillment_types", operator: "contains", value: "provider_location" }) && !P({ field_key: "fulfillment_types", operator: "contains", value: "online_remote" }), "contains (array)");
check(P({ field_key: "title", operator: "contains", value: "ell" }) && !P({ field_key: "title", operator: "contains", value: "zzz" }), "contains (string)");
check(P({ field_key: "fulfillment_types", operator: "not_contains", value: "online_remote" }) && !P({ field_key: "fulfillment_types", operator: "not_contains", value: "provider_location" }), "not_contains");
check(P({ field_key: "fulfillment_types", operator: "contains_any", values: ["online_remote", "provider_location"] }) && !P({ field_key: "fulfillment_types", operator: "contains_any", values: ["online_remote"] }), "contains_any");
check(P({ field_key: "n", operator: "less_than", value: 10 }) && !P({ field_key: "n", operator: "less_than", value: 5 }), "less_than");
check(P({ field_key: "n", operator: "greater_than", value: 1 }) && !P({ field_key: "n", operator: "greater_than", value: 5 }), "greater_than");
check(P({ all: [{ context_key: "pricing_type", operator: "equals", value: "fixed_price" }, { field_key: "n", operator: "greater_than", value: 1 }] }) && !P({ all: [{ context_key: "pricing_type", operator: "equals", value: "fixed_price" }, { field_key: "n", operator: "greater_than", value: 9 }] }), "all");
check(P({ any: [{ field_key: "n", operator: "greater_than", value: 9 }, { field_key: "n", operator: "less_than", value: 9 }] }) && !P({ any: [{ field_key: "n", operator: "greater_than", value: 9 }] }), "any");
check(P({ not: { field_key: "n", operator: "greater_than", value: 9 } }) && !P({ not: { field_key: "n", operator: "less_than", value: 9 } }), "not");
check(P({ any: [{ all: [{ context_key: "pricing_type", operator: "in", values: ["fixed_price"] }] }] }), "nested any > all (UAT shape)");
check(P(null) && P(undefined) && P({ all: [] }) && !P({ any: [] }), "null/undefined true, empty all true, empty any false");
// fulfillment predicates evaluate against codes, not ids or labels
const petCtx = buildEvaluationContext(pet, { fulfillment_types: [fid(pet, "provider_location")] });
check(evaluatePredicate({ field_key: "fulfillment_types", operator: "contains_any", values: ["provider_location"] }, petCtx), "fulfillment matches on code when the value is the id");
check(!evaluatePredicate({ field_key: "fulfillment_types", operator: "contains_any", values: [fid(pet, "provider_location")] as any }, petCtx), "fulfillment does not match on the raw id");
check(!evaluatePredicate({ field_key: "fulfillment_types", operator: "contains_any", values: ["At my location"] }, petCtx), "fulfillment does not match on the label");

// ===========================================================================
section("1.2 Capability resolver");
const tutoringCap = tutoring.provider_listing_capability!;
check(resolveActiveFormatKey(tutoringCap, { businessFormatValue: undefined }) === null, "business_format set, nothing selected: no active format");
check(resolveActiveFormatKey(tutoringCap, { businessFormatValue: "shared_group" }) === "shared_group", "business_format set: selected value is the key");
check(resolveActiveFormatKey(tutoringCap, { businessFormatValue: "group" }) === null, "business_format set: unknown value is no format");
// Laundry: no selector, the fulfillment selection picks the format.
const laundryCap = laundry.provider_listing_capability!;
check(!laundryCap.business_format && buildEvaluationContext(laundry, { fulfillment_types: [fid(laundry, "customer_location")] }).context.format === "customer_location", "no business_format: format follows the selected fulfillment code");
check(allowedPriceUnitCodes(getFormat(laundryCap, "customer_location"), "fixed_price").includes("per_hour") && !allowedPriceUnitCodes(getFormat(laundryCap, "provider_location"), "fixed_price").includes("per_hour"), "changing format changes allowed price units (laundry per_hour only at customer location)");
const laundryPricing = laundry.fields.find((f) => f.field_type === "pricing")!;
check(filterPriceUnits(laundryPricing.price_units, allowedPriceUnitCodes(getFormat(laundryCap, "provider_location"), "fixed_price")).map((u) => u.code).join() === "per_service,per_item,per_weight", "template price units filtered to allowed codes");
// Catering: the selector changes fulfillment but not pricing.
const cateringCap = catering.provider_listing_capability!;
check(JSON.stringify(allowedFulfillmentCodes(getFormat(cateringCap, "onsite_service"), null)) === JSON.stringify(["customer_location"]) && JSON.stringify(allowedFulfillmentCodes(getFormat(cateringCap, "customer_pickup"), null)) === JSON.stringify(["provider_location"]), "changing format changes allowed fulfillment codes");
check(JSON.stringify(allowedPriceUnitCodes(getFormat(cateringCap, "onsite_service"), "fixed_price")) === JSON.stringify(allowedPriceUnitCodes(getFormat(cateringCap, "customer_pickup"), "fixed_price")), "catering: every mode allows the same price units");
const petCap = pet.provider_listing_capability!;
check(resolveActiveFormatKey(petCap, {}) === "default", "business_format null with single formats.default: default is used");
const petDefault = getFormat(petCap, "default")!;
check(JSON.stringify(allowedFulfillmentCodes(petDefault, "per_session")) === JSON.stringify(["customer_location"]), "fulfillment_by_price_unit overrides the format list for that unit");
check(JSON.stringify(allowedFulfillmentCodes(petDefault, "per_hour")) === JSON.stringify(["provider_location", "customer_location"]), "fulfillment_by_price_unit ignored for other units");
check(allowedFulfillmentCodes({ fulfillment: [] }, null).length === 0, "empty fulfillment list resolves to no options");
const sharedGroup = getFormat(tutoringCap, "shared_group")!;
const individual = getFormat(tutoringCap, "individual")!;
check(profilePricingScopeState(sharedGroup, "fixed_price", "per_session").state === "required", "profile_pricing_scope required (shared group, fixed price)");
check(profilePricingScopeState(individual, "fixed_price", "per_session").state === "prohibited", "profile_pricing_scope prohibited (individual)");
check(profilePricingScopeState(sharedGroup, "quote_required", "per_hour").state === "prohibited", "profile_pricing_scope prohibited (quote required)");
check(profilePricingScopeState(sharedGroup, "fixed_price", "per_night").state === "prohibited", "profile_pricing_scope falls back to default_state when the unit is not listed");
check(profilePricingScopeState({ profile_pricing_scope: { default_state: { state: "optional" } } }, "fixed_price", "per_hour").state === "optional", "profile_pricing_scope optional via default_state (engine shape, no UAT template uses it yet)");
check(profilePricingScopeState(null, "fixed_price", "per_hour").state === "prohibited", "no format: prohibited");

// fulfillment control hides when the format allows no fulfillment (tweaked pet copy)
const noFulfillment = copyOf(pet);
noFulfillment.provider_listing_capability!.formats.default.fulfillment = [];
check(!visibleFields(noFulfillment, {}).some((f) => f.field_key === "fulfillment_types"), "fulfillment control hidden when the format allows no codes");
check(visibleFields(pet, {}).some((f) => f.field_key === "fulfillment_types"), "fulfillment control visible when codes are allowed");

// provider address display: the template names provider_location / pickup_delivery;
// the engine also shows it for customer_location, the service radius centre.
const showsAddress = (t: FormTemplate, codes: string[]) =>
  visibleFields(t, { fulfillment_types: codes.map((c) => fid(t, c)) }).some((f) => f.field_key === "address");
check(showsAddress(laundry, ["provider_location"]), "address shown for provider_location");
check(showsAddress(laundry, ["customer_location"]), "address shown for customer_location (radius centre)");
check(showsAddress(laundry, ["pickup_delivery"]), "address shown for pickup_delivery");
check(!showsAddress(tutoring, ["online_remote"]), "address hidden for online_remote only");
check(!showsAddress(tutoring, []), "address hidden with no fulfillment selected");
check(!("address" in buildPayload(tutoring, { fulfillment_types: [fid(tutoring, "customer_location")] }, "create").entries), "address never submitted even when shown for customer_location");

// cross-field relations: holistic min/max participants (shared group only)
const participants = (extra: FormValues) => validateForm(holistic, { participant_format: "shared_group", ...extra });
check(/less than or equal/.test(participants({ min_participants: "6", max_participants: "3" }).min_participants ?? ""), "min > max fails on the declaring field");
check(!("max_participants" in participants({ min_participants: "6", max_participants: "3" })), "relation error is not duplicated on the other field");
check(!("min_participants" in participants({ min_participants: "3", max_participants: "3" })), "min == max passes less_than_or_equal");
check(!("min_participants" in participants({ min_participants: "6" })), "both_present: skipped when the other value is blank");
check(!("min_participants" in validateForm(holistic, { participant_format: "individual", min_participants: "6", max_participants: "3" })), "relation skipped when the fields are hidden");
// on_or_after has no UAT field yet: tweaked tutoring copy
const dated = copyOf(tutoring);
dated.fields.push(
  { field_key: "end_date", label: "End Date", field_type: "text", field_scope: "dynamic", is_required: false, requiredness: "optional", submit_as: { type: "answers_json", key: "end_date" }, relations: [{ operator: "on_or_after", other_path: "answers_json.start_date", when: "both_present" }] } as any,
  { field_key: "start_date", label: "Start Date", field_type: "text", field_scope: "dynamic", is_required: false, requiredness: "optional", submit_as: { type: "answers_json", key: "start_date" } } as any,
);
check(validateForm(dated, { end_date: "2026-01-01", start_date: "2026-02-01" }).end_date === "End Date must be on or after Start Date.", "on_or_after fails when earlier (engine shape)");
check(!("end_date" in validateForm(dated, { end_date: "2026-02-01", start_date: "2026-02-01" })), "on_or_after passes when equal");

// ===========================================================================
section("1.3 Currency");
const usdCtx = pet.currency_context!;
// No UAT provider is outside the US yet; a CAD context exercises the override path.
const cadCtx = { ...usdCtx, country_id: 39, default_currency: { code: "CAD", symbol: "C$" }, is_usd_currency: false, can_charge_in_usd: true };
check(resolveCurrency(usdCtx, { fulfillmentCodes: ["online_remote"], chargeInUsd: true }).currency === "USD" && !resolveCurrency(usdCtx, { fulfillmentCodes: ["online_remote"] }).showChargeInUsd, "default USD: always USD, toggle hidden");
check(resolveCurrency(cadCtx, { fulfillmentCodes: ["provider_location"], chargeInUsd: true }).currency === "CAD" && !resolveCurrency(cadCtx, { fulfillmentCodes: ["provider_location"] }).showChargeInUsd, "CAD without online_remote: CAD, toggle hidden");
const cadRemote = resolveCurrency(cadCtx, { fulfillmentCodes: ["online_remote"], chargeInUsd: false });
const cadRemoteOn = resolveCurrency(cadCtx, { fulfillmentCodes: ["online_remote"], chargeInUsd: true });
check(cadRemote.showChargeInUsd && cadRemote.currency === "CAD" && cadRemoteOn.currency === "USD", "CAD with online_remote: toggle shown, off CAD, on USD");
check(!resolveCurrency({ ...cadCtx, can_charge_in_usd: false }, { fulfillmentCodes: ["online_remote"], chargeInUsd: true }).showChargeInUsd, "can_charge_in_usd false hides the toggle");

// ===========================================================================
section("1.4 Validator");
const baseValues = (): FormValues => ({
  title: "Online algebra tutoring",
  fulfillment_types: [fid(tutoring, "online_remote")],
  description: "One-to-one algebra tutoring with guided practice and lesson plans.",
  portfolio_images: [file("lesson-sample.png", "image/png")],
  pricing_type: "fixed_price",
  amount: 50,
  price_unit_id: uid(tutoring, "per_session"),
  information_accuracy_acknowledgement: true,
  learner_delivery: "individual",
  qualifications: "B.Ed. in Mathematics",
  student_types_served: ["high_school"],
  supported_subjects: ["Algebra"],
  session_duration_minutes: 60,
});
check(Object.keys(validateForm(tutoring, baseValues())).length === 0, "complete tutoring form validates", validateForm(tutoring, baseValues()));
check("title" in validateForm(tutoring, { ...baseValues(), title: "" }), "required field empty fails");
check(!("session_duration_minutes" in validateForm(tutoring, { ...baseValues(), session_duration_minutes: 0 })) || validateForm(tutoring, { ...baseValues(), session_duration_minutes: 0 }).session_duration_minutes.includes("at least"), "0 counts as present (fails only the minimum bound, not required)");
check("session_duration_minutes" in validateForm(tutoring, { ...baseValues(), session_duration_minutes: undefined }), "session duration required for per_session pricing");
check(!("session_duration_minutes" in validateForm(tutoring, { ...baseValues(), price_unit_id: uid(tutoring, "per_hour"), session_duration_minutes: undefined })), "session duration hidden for per_hour pricing");
check(!("trained_for_emergencies" in validateForm(seniors, { trained_for_emergencies: false })), "false counts as present for yes_no");
check("title" in validateForm(tutoring, { ...baseValues(), title: "ab" }) && "title" in validateForm(tutoring, { ...baseValues(), title: "a".repeat(151) }), "title of 2 and 151 characters fail");
check(!("title" in validateForm(tutoring, { ...baseValues(), title: "abc" })) && !("title" in validateForm(tutoring, { ...baseValues(), title: "a".repeat(150) })), "title of 3 and 150 characters pass");
check("fulfillment_types" in validateForm(tutoring, { ...baseValues(), fulfillment_types: [] }), "multi_select with 0 selections fails minimum_selections 1");
check("supported_subjects" in validateForm(tutoring, { ...baseValues(), supported_subjects: [] }), "free-entry multi_select with 0 entries fails minimum_selections 1");
// Selection bounds (an empty list fails as "required" first, so use a minimum of 2 on a copy).
const tutoringMin2 = copyOf(tutoring);
for (const key of ["supported_subjects", "fulfillment_types"]) {
  (tutoringMin2.fields.find((f) => f.field_key === key)!.validation as any) = { minimum_selections: 2 };
}
check(validateForm(tutoringMin2, baseValues()).supported_subjects?.startsWith("Add at least 2") === true, "free-entry multi_select below minimum says Add, not Select (tweaked copy: minimum_selections 2)", validateForm(tutoringMin2, baseValues()));
check(validateForm(tutoringMin2, baseValues()).fulfillment_types?.startsWith("Select at least 2") === true, "option multi_select below minimum says Select (tweaked copy: minimum_selections 2)", validateForm(tutoringMin2, baseValues()));
// Free entry: open / free_entry descriptor set with no options
const byKey = (t: FormTemplate, key: string) => t.fields.find((f) => f.field_key === key)!;
check(isFreeEntryField(byKey(editing, "supported_source_media_types")), "editing supported_source_media_types is free entry");
check(isFreeEntryField(byKey(tutoring, "supported_subjects")), "tutoring supported_subjects is free entry");
check(!isFreeEntryField(byKey(editing, "fulfillment_types")), "fulfillment_types with options is not free entry");
check(!isFreeEntryField(byKey(seniors, "specialized_care_experience")), "option multi_select is not free entry");
check(!isFreeEntryField({ ...byKey(editing, "supported_source_media_types"), descriptor: { ...byKey(editing, "supported_source_media_types").descriptor!, set: { mode: "closed", entry: "options_only" } } } as any), "closed set with no options is not free entry (unsatisfiable, never free text)");
check(isFreeEntryField({ ...byKey(editing, "supported_source_media_types"), descriptor: undefined } as any), "no descriptor and no options falls back to free entry");
check(!("supported_source_media_types" in validateForm(editing, { supported_source_media_types: ["Photos", "Video"] })), "typed entries pass free-entry validation");
// Directed language pairs (Misc / Interpreters): `source->target`, lower case as in the spec example
section("1.4b language pairs (Misc / Interpreters)");
const pairsField = byKey(interpreters, "supported_language_pairs");
check(isLanguagePairField(pairsField) && isFreeEntryField(pairsField), "supported_language_pairs is a free-entry directed pair set");
check(!isLanguagePairField(byKey(editing, "supported_source_media_types")), "plain free-entry set is not a pair set");
check(encodeLanguagePair(" English ", "Urdu") === "english->urdu", "pair encodes as lower-case source->target");
check(JSON.stringify(parseLanguagePair("english->urdu")) === JSON.stringify({ source: "english", target: "urdu" }), "pair parses back");
check(parseLanguagePair("english") === null && parseLanguagePair("->urdu") === null && parseLanguagePair(3) === null, "values without both sides do not parse");
check(formatLanguagePair("mandarin chinese->english") === "Mandarin Chinese \u2192 English", "pair displays title-cased with an arrow", formatLanguagePair("mandarin chinese->english"));
check(formatLanguagePair("not a pair") === "not a pair", "unparseable value displays as stored");
const pairsOnly = (list: unknown[]) => validateForm(interpreters, { supported_language_pairs: list }).supported_language_pairs;
check(pairsOnly(["english->urdu", "urdu->english"]) === undefined, "forward and reverse pairs are distinct entries", pairsOnly(["english->urdu", "urdu->english"]));
check(pairsOnly(["english->english"])?.includes("different") === true, "same source and target fails", pairsOnly(["english->english"]));
check(pairsOnly(["english->urdu", "English -> Urdu"])?.includes("twice") === true, "duplicate pair (any spacing/case) fails", pairsOnly(["english->urdu", "English -> Urdu"]));
check(pairsOnly(["english"])?.includes("source and a target") === true, "entry without a target fails", pairsOnly(["english"]));
check(pairsOnly([])?.includes("required") === true, "empty pair list fails as required");
// Other option with a custom text key (caregiving specialized care experience)
check("specialized_care_experience_other" in validateForm(seniors, { specialized_care_experience: ["general_caregiving", "other"] }), "other selected without custom value fails");
check("specialized_care_experience_other" in validateForm(seniors, { specialized_care_experience: ["general_caregiving"], specialized_care_experience_other: "Respite care" }), "custom value without other selected fails");
check(!("specialized_care_experience_other" in validateForm(seniors, { specialized_care_experience: ["general_caregiving", "other"], specialized_care_experience_other: "Respite care" })), "other with custom value passes");
const holisticValues = (): FormValues => ({
  title: "Guided wellness program",
  fulfillment_types: [fid(holistic, "provider_location")],
  description: "A structured wellness program with guided weekly sessions.",
  pricing_type: "fixed_price",
  amount: 75,
  price_unit_id: uid(holistic, "per_hour"),
  information_accuracy_acknowledgement: true,
  participant_format: "individual",
  conditions_worked_with: ["injuries"],
  cori_background_check: [cori],
});
check(Object.keys(validateForm(holistic, holisticValues())).length === 0, "complete holistic form validates", validateForm(holistic, holisticValues()));
check(!("business_verification" in validateForm(holistic, { ...holisticValues(), cori_background_check: [] })), "business verification not required for an individual provider");
const requiredCori = copyOf(holistic);
Object.assign(requiredCori.fields.find((f) => f.field_key === "cori_background_check")!, { is_required: true, requiredness: "required", minimum_files: 1 });
check("cori_background_check" in validateForm(requiredCori, { ...holisticValues(), cori_background_check: [] }), "required dynamic file missing fails (tweaked copy: no UAT template requires one yet)");
check("cori_background_check" in validateForm(holistic, { ...holisticValues(), cori_background_check: [file("x.webp", "image/webp")] }), "disallowed extension rejected for dynamic file");
check("price_unit_id" in validateForm(tutoring, { ...baseValues(), pricing_type: "quote_required", amount: undefined, price_unit_id: undefined }), "quote_required still requires price_unit_id");
check(!("amount" in validateForm(tutoring, { ...baseValues(), pricing_type: "quote_required", amount: undefined })), "quote_required allows empty amount");
check("price_unit_id" in validateForm(laundry, { fulfillment_types: [fid(laundry, "provider_location")], pricing_type: "fixed_price", amount: 10, price_unit_id: uid(laundry, "per_hour") }), "unit not allowed for the format fails (laundry per_hour at provider location)");
check("profile_pricing_scope" in validateForm(tutoring, { ...baseValues(), learner_delivery: "shared_group" }), "required profile_pricing_scope missing fails");
check(!("profile_pricing_scope" in validateForm(tutoring, { ...baseValues(), learner_delivery: "shared_group", profile_pricing_scope: "per_profile" })), "required profile_pricing_scope present passes");
check("service_radius" in validateForm(pet, { title: "Dog sitting at home", fulfillment_types: [fid(pet, "customer_location")], description: "Caring, reliable dog sitting at your home every day.", portfolio_images: [jpg], pricing_type: "fixed_price", amount: 20, price_unit_id: uid(pet, "per_hour"), information_accuracy_acknowledgement: true }), "customer_location requires service_radius");
check("information_accuracy_acknowledgement" in validateForm(tutoring, { ...baseValues(), information_accuracy_acknowledgement: false }), "acknowledgement must be accepted");

// ===========================================================================
section("1.5 Payload builders");
// Pet sitting create: generic fields plus the pricing-driven surcharge.
const fd18 = buildCreateFormData(pet, {
  title: "Dog sitting at your home", fulfillment_types: [fid(pet, "customer_location")], service_radius: 15, service_radius_unit: "mile",
  description: "Daily visits, feeding and walks at your home while you are away.",
  pricing_type: "fixed_price", amount: 125, price_unit_id: uid(pet, "per_hour"), additional_pet_surcharge: 5, information_accuracy_acknowledgement: true,
  portfolio_images: [jpg, jpg2], certificates: { description: "Certified pet first aid", files: [pdf] },
}, { categoryId: 15, subcategoryId: 93, providerType: "individual" });
const e18 = Object.fromEntries(entriesOf(fd18).filter(([k]) => !k.endsWith("[]")));
check(e18.category_id === "15" && e18.subcategory_id === "93" && e18.provider_type === "individual" && !keysOf(fd18).includes("business_id"), "create: identity fields, no business_id for individual");
check(get(fd18, "fulfillment_type_ids[]").join() === String(fid(pet, "customer_location")) && e18.service_radius === "15" && e18.service_radius_unit === "mile", "create: fulfillment array + radius + unit");
check(e18.pricing_type === "fixed_price" && e18.amount === "125" && e18.currency === "USD" && e18.price_unit_id === String(uid(pet, "per_hour")), "create: pricing fields with USD from context");
const a18 = JSON.parse(e18.answers_json as string);
check(JSON.stringify(Object.keys(a18)) === JSON.stringify(["additional_pet_surcharge"]) && Number(a18.additional_pet_surcharge) === 5, "create: only the visible dynamic answer lands in answers_json (surcharge shown for fixed price)");
check(!("visit_duration_minutes" in a18), "create: dynamic key hidden for this unit is absent, not null");
check(e18.information_accuracy_acknowledgement === "true", "create: acknowledgement true on create");
check(get(fd18, "portfolio_images[]").length === 2 && e18.certificate_description === "Certified pet first aid" && get(fd18, "certificate_files[]")[0] === pdf, "create: portfolio + certificate bundle");
check(!keysOf(fd18).includes("address_id") && !keysOf(fd18).includes("profile_pricing_scope") && !keysOf(fd18).includes("charge_in_usd"), "create: no address_id, prohibited scope omitted, no charge_in_usd");

// Tutoring create with a CAD provider (tweaked currency context: no UAT provider is outside the US yet).
const tutoringCad = copyOf(tutoring);
tutoringCad.currency_context = cadCtx;
const tutoringIdentity = { categoryId: 6, subcategoryId: 105, providerType: "individual" as const };
const fd19 = buildCreateFormData(tutoringCad, { ...baseValues(), charge_in_usd: false }, tutoringIdentity);
const e19 = Object.fromEntries(entriesOf(fd19).filter(([k]) => !k.endsWith("[]")));
const a19 = JSON.parse(e19.answers_json as string);
check(e19.currency === "CAD" && e19.amount === "50" && e19.price_unit_id === String(uid(tutoring, "per_session")), "tutoring: CAD local currency when toggle off");
check(a19.qualifications === "B.Ed. in Mathematics" && a19.student_types_served[0] === "high_school" && a19.supported_subjects[0] === "Algebra" && a19.learner_delivery === "individual", "tutoring: dynamic answers in answers_json");
check(!("title" in a19) && !("fulfillment_type_ids" in a19), "tutoring: generic keys never land in answers_json");
check(!keysOf(fd19).includes("dynamic_file_keys[]"), "tutoring: no dynamic files when none uploaded");
check(!keysOf(fd19).includes("charge_in_usd"), "tutoring: charge_in_usd never sent");
check(get(buildCreateFormData(tutoringCad, { ...baseValues(), charge_in_usd: true }, tutoringIdentity), "currency")[0] === "USD", "tutoring: toggle on submits USD");
const fdOther = buildCreateFormData(seniors, { specialized_care_experience: ["general_caregiving", "other"], specialized_care_experience_other: "Respite care" }, { categoryId: 3, subcategoryId: 18, providerType: "individual" });
check(JSON.parse(get(fdOther, "answers_json")[0] as string).specialized_care_experience_other === "Respite care", "Other custom value included when other is selected");

// Holistic create with a dynamic file; business verification stays hidden for an individual.
const fd20 = buildCreateFormData(holistic, {
  ...holisticValues(), program_details: "Eight weekly sessions", portfolio_images: [file("program.png", "image/png")],
  business_verification: [file("license.pdf", "application/pdf")],
}, { categoryId: 14, subcategoryId: 86, providerType: "individual" });
const e20 = Object.fromEntries(entriesOf(fd20).filter(([k]) => !k.endsWith("[]")));
const a20 = JSON.parse(e20.answers_json as string);
check(e20.provider_type === "individual" && !keysOf(fd20).includes("business_id"), "holistic: individual identity");
check(e20.currency === "USD" && e20.amount === "75" && e20.price_unit_id === String(uid(holistic, "per_hour")), "holistic: USD pricing");
check(JSON.stringify(Object.keys(a20).sort()) === JSON.stringify(["conditions_worked_with", "participant_format", "program_details"]) && a20.participant_format === "individual", "holistic: answers_json holds exactly the visible dynamic answers", a20);
check(get(fd20, "dynamic_file_keys[]").join() === "cori_background_check" && get(fd20, "dynamic_files[]")[0] === cori, "holistic: CORI paired as a dynamic file; hidden business verification not sent");
check(!("cori_background_check" in a20), "holistic: new files never in answers_json");

// Information-only and candidate builders.
const editValues: FormValues = { ...baseValues(), title: "Updated online algebra tutoring", portfolio_images: [file("new-sample.png", "image/png")], certificates: { description: "Updated shared certificate description", files: [pdf] } };
const fdInfo = buildInformationFormData(tutoring, editValues, { deletePortfolioIds: [301], deleteCertificateIds: [99] });
const kInfo = keysOf(fdInfo);
check(!kInfo.some((k) => ["category_id", "subcategory_id", "provider_type", "business_id"].includes(k)), "information: identity omitted");
check(!kInfo.some((k) => ["pricing_type", "amount", "currency", "price_unit_id", "profile_pricing_scope"].includes(k)), "information: pricing omitted");
check(!kInfo.includes("information_accuracy_acknowledgement"), "information: acknowledgement omitted");
check(get(fdInfo, "delete_portfolio_ids[]").join() === "301" && get(fdInfo, "delete_certificate_ids[]").join() === "99", "information: delete id arrays");
check(get(fdInfo, "title")[0] === "Updated online algebra tutoring" && get(fdInfo, "certificate_description")[0] === "Updated shared certificate description", "information: title + certificate description");

const fdCand = buildCandidateFormData(tutoring, { ...editValues, learner_delivery: "shared_group", profile_pricing_scope: "per_request" }, { deletePortfolioIds: [301], clearDynamicFileKeys: ["cori_background_check"] });
const kCand = keysOf(fdCand);
check(get(fdCand, "answers_mode")[0] === "replace", "candidate: answers_mode=replace");
check(!kCand.includes("information_accuracy_acknowledgement") && !kCand.includes("charge_in_usd"), "candidate: acknowledgement and charge_in_usd omitted");
check(!kCand.some((k) => ["category_id", "subcategory_id", "provider_type", "business_id"].includes(k)), "candidate: identity omitted");
check(get(fdCand, "clear_dynamic_file_keys[]").join() === "cori_background_check" && get(fdCand, "delete_portfolio_ids[]").join() === "301", "candidate: clear_dynamic_file_keys and delete ids pass through");
check(get(fdCand, "pricing_type")[0] === "fixed_price" && get(fdCand, "price_unit_id")[0] === String(uid(tutoring, "per_session")) && get(fdCand, "profile_pricing_scope")[0] === "per_request", "candidate: pricing included with required scope");

// Never-submit keys are stripped even if a template mistakenly routes them.
const badTemplate = copyOf(tutoring);
badTemplate.fields.push({ field_key: "booking_policy", label: "Booking", field_type: "text", field_scope: "dynamic", is_required: false, requiredness: "optional", submit_as: { type: "answers_json", key: "booking_policy" } } as any);
badTemplate.fields.push({ field_key: "address_id", label: "Addr", field_type: "number", field_scope: "generic", is_required: false, requiredness: "optional", submit_as: { type: "top_level", key: "address_id" } } as any);
const badPayload = buildPayload(badTemplate, { ...baseValues(), booking_policy: "x", address_id: 5 }, "create");
check(!("booking_policy" in badPayload.answers) && !("address_id" in badPayload.entries) && !("booking_policy" in badPayload.entries), "address_id / booking_policy never appear (prohibited provider fields + never-submit list)");

// Hidden dynamic key is omitted, not sent as null.
const formatless = buildPayload(tutoring, { ...baseValues(), learner_delivery: undefined, session_duration_minutes: 60 }, "create");
check(!("session_duration_minutes" in formatless.answers), "dynamic key hidden by visible_when is omitted, not null");

// ===========================================================================
section("certificate bundle: description without files");
check(/at least one file/.test(validateForm(pet, { ...baseValues(), certificates: { description: "Certified" } }).certificates ?? ""), "description with no files is rejected client-side");
check(!("certificates" in validateForm(pet, { ...baseValues(), certificates: { description: "Certified", files: [cori] } })), "description with a file passes");

// ===========================================================================
section("image size limit");
const bigImage: MultipartFile = { ...file("big.jpg", "image/jpeg"), size: 5120 * 1024 + 1 };
const okImage: MultipartFile = { ...file("ok.jpg", "image/jpeg"), size: 5120 * 1024 };
const bigPdf: MultipartFile = { ...file("big.pdf", "application/pdf"), size: 20 * 1024 * 1024 };
check(/File 2 \(big\.jpg\).*5 MB/.test(validateForm(pet, { ...baseValues(), portfolio_images: [okImage, bigImage] }).portfolio_images ?? ""), "image over 5120 KB is rejected and identified by position and name");
check(!("portfolio_images" in validateForm(pet, { ...baseValues(), portfolio_images: [okImage] })), "image at exactly 5120 KB passes");
check(!("portfolio_images" in validateForm(pet, { ...baseValues(), portfolio_images: [file("unknown.jpg", "image/jpeg")] })), "image with no reported size is not rejected");
check(!("cori_background_check" in validateForm(tutoring, { ...baseValues(), cori_background_check: [bigPdf] })), "non-image files are not size-limited");

// ===========================================================================
section("422 issue → field mapping");
const issue = (path: string, message: string) => ({ path, field: path, code: "x", message, details: {} });
const mapped = mapIssuesToFields(pet, {}, [
  issue("certificate_files", "At least one certificate file is required."),
  issue("portfolio_images.1", "Too large."),
  issue("$", "Cross-field problem."),
  issue("answers_json.unknown_key", "Unknown."),
] as any);
check(mapped.fieldErrors.certificates === "At least one certificate file is required.", "certificate_files lands on the certificate bundle field");
check(mapped.fieldErrors.portfolio_images === "File 2: Too large.", "portfolio_images.1 lands on portfolio_images with a 1-based file prefix");
check(mapped.general.length === 2 && mapped.general[0] === "Cross-field problem." && mapped.general[1] === "unknown_key: Unknown.", "$ and unknown paths go to general");
const dynMapped = mapIssuesToFields(tutoring, { ...baseValues(), cori_background_check: [cori] }, [issue("dynamic_files.0", "Bad file.")] as any);
check(dynMapped.fieldErrors.cori_background_check === "File 1: Bad file.", "dynamic_files.N resolves to the paired field_key");

// ===========================================================================
section("templates without a fulfillment field (Misc / Movers, alias of Delivery / Movers)");
// Eight templates ship no fulfillment_types field while address and radius
// still carry fulfillment rules. Backend: no fulfillment step, nothing to
// select, fulfillment_type_ids omitted (or []) on create/update.
const moversValues = (): FormValues => ({
  title: "Apartment move crew",
  description: "One origin to one destination moving with a two-person crew and a van.",
  information_accuracy_acknowledgement: true,
  pricing_type: "fixed_price",
  amount: 3.5,
  price_unit_id: uid(movers, "per_mile"),
});
const moversCap = movers.provider_listing_capability!;
check(!movers.fields.some((f) => f.submit_as?.key === "fulfillment_type_ids"), "fixture has no fulfillment field");
check(moversCap.is_alias === true && Object.keys(moversCap.formats).join() === "default" && (moversCap.formats.default.fulfillment ?? []).length === 0, "alias capability: single default format allowing no fulfillment");
check(JSON.stringify(buildEvaluationContext(movers, moversValues()).context.fulfillment_types) === "[]", "context exposes no fulfillment codes");
const moversVisible = visibleFields(movers, moversValues()).map((f) => f.field_key);
check(!moversVisible.includes("address") && !moversVisible.includes("service_radius"), "address and service radius stay hidden", moversVisible);
check(moversVisible.join() === "title,description,additional_information,tagline,information_accuracy_acknowledgement,portfolio_images,certificates,pricing", "every other field is visible, in template order", moversVisible);
const fulfillmentSection = movers.sections!.find((s) => s.section_key === "fulfillment_location")!;
check(fulfillmentSection.field_keys!.every((k) => !moversVisible.includes(k)), "the Fulfillment Location section shows no field, so the wizard skips that step");
check(resolveActiveFormatKey(moversCap, { fulfillmentCodes: [] }) === "default", "default format resolves with no fulfillment selected");
check(JSON.stringify(allowedPriceUnitCodes(getFormat(moversCap, "default"), "fixed_price")) === JSON.stringify(["per_service", "per_hour", "per_mile"]), "price units come from the default format (per_mile allowed)");
check(Object.keys(validateForm(movers, moversValues())).length === 0, "valid without any fulfillment selection", validateForm(movers, moversValues()));
check(Object.keys(validateForm(movers, { ...moversValues(), pricing_type: "quote_required", amount: undefined })).length === 0, "quote required per mile is valid too");
const moversCreate = buildCreateFormData(movers, moversValues(), { categoryId: 13, subcategoryId: 81, providerType: "individual" });
const moversCreateKeys = keysOf(moversCreate);
check(!moversCreateKeys.some((k) => k.startsWith("fulfillment_type_ids")), "create omits fulfillment_type_ids", moversCreateKeys);
check(!moversCreateKeys.includes("address_id") && !moversCreateKeys.includes("service_radius") && !moversCreateKeys.includes("service_radius_unit"), "create omits address and radius", moversCreateKeys);
check(get(moversCreate, "price_unit_id")[0] === String(uid(movers, "per_mile")) && get(moversCreate, "currency")[0] === "USD" && get(moversCreate, "answers_json")[0] === "{}", "create sends per-mile pricing in USD with empty answers_json");
const staleRadius = buildPayload(movers, { ...moversValues(), service_radius: "5", service_radius_unit: "mile" }, "candidate").entries;
check(!("service_radius" in staleRadius) && !("service_radius_unit" in staleRadius) && !("fulfillment_type_ids" in staleRadius), "candidate drops a stale saved radius and never invents fulfillment_type_ids", Object.keys(staleRadius));
check(!keysOf(buildCandidateFormData(movers, moversValues())).some((k) => k.startsWith("fulfillment_type_ids")), "candidate omits fulfillment_type_ids");
check(JSON.stringify(movers.fields.filter((f) => !isListingField(f, movers)).map((f) => f.field_key)) === JSON.stringify(["address", "service_radius", "pricing"]), "setup screen holds only address, radius and pricing (address and radius hidden)");

// ===========================================================================
section("edit screens: listing details vs setup & pricing split");
const LISTING = ["title", "description", "additional_information", "tagline", "information_accuracy_acknowledgement", "portfolio_images", "certificates"];
const listingKeys = (t: FormTemplate) => t.fields.filter((f) => isListingField(f, t)).map((f) => f.field_key).sort();
const setupKeys = (t: FormTemplate) => t.fields.filter((f) => !isListingField(f, t)).map((f) => f.field_key).sort();
for (const [name, t] of [["catering", catering], ["laundry", laundry], ["tutoring", tutoring], ["holistic", holistic], ["pet", pet], ["seniors", seniors]] as const) {
  const present = LISTING.filter((k) => t.fields.some((f) => f.field_key === k)).sort();
  check(JSON.stringify(listingKeys(t)) === JSON.stringify(present), `${name}: listing screen holds exactly the listing fields`, listingKeys(t));
  check(!setupKeys(t).some((k) => LISTING.includes(k)), `${name}: no listing field leaks onto the setup screen`);
  check(["fulfillment_types", "address", "service_radius", "pricing"].every((k) => setupKeys(t).includes(k)), `${name}: fulfillment, address, radius and pricing are on the setup screen`, setupKeys(t));
}
check(["catering_execution_mode", "min_guest_count", "service_duration_minutes", "item_unit_label"].every((k) => setupKeys(catering).includes(k)), "catering: execution mode and every capability answer are on the setup screen");
check(["learner_delivery", "session_duration_minutes", "qualifications", "cori_background_check"].every((k) => setupKeys(tutoring).includes(k)), "tutoring: business format, capability answers and dynamic files are on the setup screen");
check(["maximum_turnaround_days", "weight_unit", "min_weight_value", "max_weight_value"].every((k) => setupKeys(laundry).includes(k)), "laundry: turnaround and weight fields are on the setup screen", setupKeys(laundry));
const orphan = { ...catering.fields[0], field_key: "mystery", section_key: undefined } as any;
check(!isListingField(orphan, catering), "a field outside every section defaults to the setup screen");
check(isListingField({ ...orphan, field_key: "title" }, catering), "a field without section_key is placed via the section that lists it");

// ===========================================================================
console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exitCode = 1;
