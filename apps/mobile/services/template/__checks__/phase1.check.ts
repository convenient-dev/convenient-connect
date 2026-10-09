/**
 * Phase 1 verification script (no test runner in this repo).
 *
 * Run from apps/mobile:
 *   node -r sucrase/register/ts services/template/__checks__/phase1.check.ts
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
  profilePricingScopeState,
  resolveActiveFormatKey,
  resolveCurrency,
  mapIssuesToFields,
  validateForm,
  visibleFields,
  type FormValues,
  type Predicate,
} from "../index";
import petFixture from "../__fixtures__/pet-sitting-template.json";
import tutoringFixture from "../__fixtures__/education-tutoring-template.json";
import personalFixture from "../__fixtures__/personal-holistic-business-template.json";

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

const pet = asTemplate(petFixture as any);
const tutoring = asTemplate(tutoringFixture as any);
const personal = asTemplate(personalFixture as any);

const file = (name: string, type: string): MultipartFile => ({ uri: `file:///${name}`, name, type });
const jpg = file("front.jpg", "image/jpeg");
const jpg2 = file("interior.jpg", "image/jpeg");
const pdf = file("certificate.pdf", "application/pdf");
const cori = file("cori.pdf", "application/pdf");
const license = file("business-license.pdf", "application/pdf");

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
check(P({ any: [{ all: [{ context_key: "pricing_type", operator: "in", values: ["fixed_price"] }] }] }), "nested any > all (spec example shape)");
check(P(null) && P(undefined) && P({ all: [] }) && !P({ any: [] }), "null/undefined true, empty all true, empty any false");
// fulfillment predicates evaluate against codes, not ids or labels
const petCtx = buildEvaluationContext(pet, { fulfillment_types: [1] });
check(evaluatePredicate({ field_key: "fulfillment_types", operator: "contains_any", values: ["provider_location"] }, petCtx), "fulfillment matches on code when the value is the id");
check(!evaluatePredicate({ field_key: "fulfillment_types", operator: "contains_any", values: [1] as any }, petCtx), "fulfillment does not match on the raw id");
check(!evaluatePredicate({ field_key: "fulfillment_types", operator: "contains_any", values: ["At my location"] }, petCtx), "fulfillment does not match on the label");

// ===========================================================================
section("1.2 Capability resolver");
const cap = tutoring.provider_listing_capability!;
check(resolveActiveFormatKey(cap, { businessFormatValue: undefined }) === null, "business_format set, nothing selected: no active format");
check(resolveActiveFormatKey(cap, { businessFormatValue: "group" }) === "group", "business_format set: selected value is the key");
const individual = getFormat(cap, "individual")!;
const group = getFormat(cap, "group")!;
check(JSON.stringify(allowedPriceUnitCodes(individual, "fixed_price")) === JSON.stringify(["per_hour", "per_session"]) && JSON.stringify(allowedPriceUnitCodes(group, "fixed_price")) === JSON.stringify(["per_session"]), "changing format changes allowed price units");
check(JSON.stringify(allowedFulfillmentCodes(individual, null)) === JSON.stringify(["provider_location", "customer_location", "online_remote"]) && JSON.stringify(allowedFulfillmentCodes(group, null)) === JSON.stringify(["provider_location", "online_remote"]), "changing format changes allowed fulfillment codes");
const pricingField = tutoring.fields.find((f) => f.field_type === "pricing")!;
check(filterPriceUnits(pricingField.price_units, allowedPriceUnitCodes(group, "fixed_price")).map((u) => u.code).join() === "per_session", "template price units filtered to allowed codes");
const personalCap = personal.provider_listing_capability!;
check(resolveActiveFormatKey(personalCap, {}) === "default", "business_format null with single formats.default: default is used");
const petCap = pet.provider_listing_capability!;
const petDefault = getFormat(petCap, "default")!;
check(JSON.stringify(allowedFulfillmentCodes(petDefault, "per_session")) === JSON.stringify(["customer_location"]), "fulfillment_by_price_unit overrides the format list for that unit");
check(JSON.stringify(allowedFulfillmentCodes(petDefault, "per_hour")) === JSON.stringify(["provider_location", "customer_location"]), "fulfillment_by_price_unit ignored for other units");
check(allowedFulfillmentCodes({ fulfillment: [] }, null).length === 0, "empty fulfillment list resolves to no options");
check(profilePricingScopeState(group, "fixed_price", "per_session").state === "required", "profile_pricing_scope required");
check(profilePricingScopeState(individual, "fixed_price", "per_session").state === "optional", "profile_pricing_scope optional");
check(profilePricingScopeState(individual, "fixed_price", "per_hour").state === "prohibited", "profile_pricing_scope prohibited");
check(profilePricingScopeState(group, "quote_required", "per_hour").state === "optional", "profile_pricing_scope falls back to default_state when lookup is missing");
check(profilePricingScopeState(null, "fixed_price", "per_hour").state === "prohibited", "no format: prohibited");

// fulfillment control hides when the format allows no fulfillment
const noFulfillment = asTemplate(JSON.parse(JSON.stringify(personalFixture)));
noFulfillment.provider_listing_capability!.formats.default.fulfillment = [];
check(!visibleFields(noFulfillment, {}).some((f) => f.field_key === "fulfillment_types"), "fulfillment control hidden when the format allows no codes");
check(visibleFields(personal, {}).some((f) => f.field_key === "fulfillment_types"), "fulfillment control visible when codes are allowed");

// provider address display: template names provider_location / pickup_delivery
// (ids 1 / 3); the engine also shows it for customer_location (id 2), which the
// backend uses as the service radius centre.
const showsAddress = (ids: number[]) =>
  visibleFields(tutoring, { fulfillment_types: ids }).some((f) => f.field_key === "address");
check(showsAddress([1]), "address shown for provider_location");
check(showsAddress([2]), "address shown for customer_location (radius centre)");
check(showsAddress([3]), "address shown for pickup_delivery");
check(!showsAddress([4]), "address hidden for online_remote only");
check(!showsAddress([]), "address hidden with no fulfillment selected");
check(!("address" in buildPayload(tutoring, { fulfillment_types: [2] }, "create").entries), "address never submitted even when shown for customer_location");

// cross-field relations (catering min/max guest count shape)
const relTemplate = asTemplate(JSON.parse(JSON.stringify(tutoringFixture)));
relTemplate.fields.push(
  { field_key: "min_guest_count", label: "Min Guest Count", field_type: "number", field_scope: "dynamic", is_required: false, requiredness: "optional", submit_as: { type: "answers_json", key: "min_guest_count" }, validation: { minimum: 1, integer: true }, relations: [{ operator: "less_than_or_equal", other_path: "answers_json.max_guest_count", when: "both_present" }] } as any,
  { field_key: "max_guest_count", label: "Max Guest Count", field_type: "number", field_scope: "dynamic", is_required: false, requiredness: "optional", submit_as: { type: "answers_json", key: "max_guest_count" }, validation: { minimum: 1, integer: true } } as any,
  { field_key: "end_date", label: "End Date", field_type: "text", field_scope: "dynamic", is_required: false, requiredness: "optional", submit_as: { type: "answers_json", key: "end_date" }, relations: [{ operator: "on_or_after", other_path: "answers_json.start_date", when: "both_present" }], visible_when: { field_key: "fulfillment_types", operator: "contains_any", values: ["provider_location"] } } as any,
  { field_key: "start_date", label: "Start Date", field_type: "text", field_scope: "dynamic", is_required: false, requiredness: "optional", submit_as: { type: "answers_json", key: "start_date" }, visible_when: { field_key: "fulfillment_types", operator: "contains_any", values: ["provider_location"] } } as any,
);
const relErrors = (extra: FormValues) => validateForm(relTemplate, { fulfillment_types: [1], ...extra });
check(relErrors({ min_guest_count: "6", max_guest_count: "1" }).min_guest_count === "Min Guest Count must be less than or equal to Max Guest Count.", "min > max fails on the declaring field");
check(!("max_guest_count" in relErrors({ min_guest_count: "6", max_guest_count: "1" })), "relation error is not duplicated on the other field");
check(!("min_guest_count" in relErrors({ min_guest_count: "3", max_guest_count: "3" })), "min == max passes less_than_or_equal");
check(!("min_guest_count" in relErrors({ min_guest_count: "6" })), "both_present: skipped when the other value is blank");
check(relErrors({ end_date: "2026-01-01", start_date: "2026-02-01" }).end_date === "End Date must be on or after Start Date.", "on_or_after fails when earlier");
check(!("end_date" in relErrors({ end_date: "2026-02-01", start_date: "2026-02-01" })), "on_or_after passes when equal");
check(!("end_date" in validateForm(relTemplate, { fulfillment_types: [2], end_date: "2026-01-01", start_date: "2026-02-01" })), "relation skipped when the fields are hidden");

// ===========================================================================
section("1.3 Currency");
const usdCtx = personal.currency_context!;
const cadCtx = tutoring.currency_context!;
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
  fulfillment_types: [4],
  description: "One-to-one algebra tutoring with guided practice and lesson plans.",
  portfolio_images: [file("lesson-sample.png", "image/png")],
  pricing_type: "fixed_price",
  amount: 50,
  price_unit_id: 2,
  information_accuracy_acknowledgement: true,
  learner_delivery: "individual",
  qualifications: "B.Ed. in Mathematics",
  session_duration_minutes: 60,
});
check(Object.keys(validateForm(tutoring, baseValues())).length === 0, "complete tutoring form validates", validateForm(tutoring, baseValues()));
check("title" in validateForm(tutoring, { ...baseValues(), title: "" }), "required field empty fails");
check(!("session_duration_minutes" in validateForm(tutoring, { ...baseValues(), session_duration_minutes: 0 })) || validateForm(tutoring, { ...baseValues(), session_duration_minutes: 0 }).session_duration_minutes.includes("at least"), "0 counts as present (fails only the minimum bound, not required)");
const yesNoTemplate = asTemplate(JSON.parse(JSON.stringify(tutoringFixture)));
yesNoTemplate.fields.push({ ...yesNoTemplate.fields.find((f) => f.field_key === "student_types_served")!, field_key: "trained", label: "Trained", field_type: "yes_no", is_required: true, options: undefined, validation: undefined, submit_as: { type: "answers_json", key: "trained" } } as any);
check(!("trained" in validateForm(yesNoTemplate, { ...baseValues(), trained: false })) && "trained" in validateForm(yesNoTemplate, baseValues()), "false counts as present");
check("title" in validateForm(tutoring, { ...baseValues(), title: "ab" }) && "title" in validateForm(tutoring, { ...baseValues(), title: "a".repeat(151) }), "title of 2 and 151 characters fail");
check(!("title" in validateForm(tutoring, { ...baseValues(), title: "abc" })) && !("title" in validateForm(tutoring, { ...baseValues(), title: "a".repeat(150) })), "title of 3 and 150 characters pass");
check("fulfillment_types" in validateForm(tutoring, { ...baseValues(), fulfillment_types: [] }), "multi_select with 0 selections fails minimum_selections 1");
check("subjects_taught_other" in validateForm(tutoring, { ...baseValues(), subjects_taught: ["math", "other"] }), "other selected without custom value fails");
check("subjects_taught_other" in validateForm(tutoring, { ...baseValues(), subjects_taught: ["math"], subjects_taught_other: "Physics" }), "custom value without other selected fails");
check(!("subjects_taught_other" in validateForm(tutoring, { ...baseValues(), subjects_taught: ["math", "other"], subjects_taught_other: "Physics" })), "other with custom value passes");
const personalValues = (): FormValues => ({ ...baseValues(), fulfillment_types: [1], learner_delivery: undefined, session_duration_minutes: undefined, qualifications: undefined, price_unit_id: 2, conditions_worked_with: ["injuries"], cori_background_check: [cori], business_verification: [license] });
check(Object.keys(validateForm(personal, personalValues())).length === 0, "complete personal form validates", validateForm(personal, personalValues()));
check("conditions_worked_with" in validateForm(personal, { ...personalValues(), conditions_worked_with: ["na", "injuries"] }), "exclusive na combined with another value fails");
check(!("conditions_worked_with" in validateForm(personal, { ...personalValues(), conditions_worked_with: ["na"] })), "na alone passes");
check("cori_background_check" in validateForm(personal, { ...personalValues(), cori_background_check: [] }), "required dynamic file missing fails");
check("business_verification" in validateForm(personal, { ...personalValues(), business_verification: [file("x.webp", "image/webp")] }), "disallowed extension rejected for dynamic file");
check("price_unit_id" in validateForm(tutoring, { ...baseValues(), pricing_type: "quote_required", amount: undefined, price_unit_id: undefined }), "quote_required still requires price_unit_id");
check(!("amount" in validateForm(tutoring, { ...baseValues(), pricing_type: "quote_required", amount: undefined })), "quote_required allows empty amount");
check("price_unit_id" in validateForm(tutoring, { ...baseValues(), learner_delivery: "group", price_unit_id: 2 }), "unit not allowed for the format fails");
check("profile_pricing_scope" in validateForm(tutoring, { ...baseValues(), learner_delivery: "group", price_unit_id: 3 }), "required profile_pricing_scope missing fails");
check(!("profile_pricing_scope" in validateForm(tutoring, { ...baseValues(), learner_delivery: "group", price_unit_id: 3, profile_pricing_scope: "per_profile" })), "required profile_pricing_scope present passes");
check("service_radius" in validateForm(pet, { title: "Dog sitting at home", fulfillment_types: [2], description: "Caring, reliable dog sitting at your home every day.", portfolio_images: [jpg], pricing_type: "fixed_price", amount: 20, price_unit_id: 1, information_accuracy_acknowledgement: true }), "customer_location requires service_radius");
check("information_accuracy_acknowledgement" in validateForm(tutoring, { ...baseValues(), information_accuracy_acknowledgement: false }), "acknowledgement must be accepted");

// ===========================================================================
section("1.5 Payload builders: guide examples 18, 19, 20");
// Guide §18 Automotive-style generic create (using the spec's generic fields).
const petIdentity = { categoryId: 15, subcategoryId: 93, providerType: "individual" as const };
const fd18 = buildCreateFormData(pet, {
  title: "Mobile car detailing", fulfillment_types: [2], service_radius: 15, service_radius_unit: "mile",
  description: "Full interior and exterior detailing at your driveway with premium products.",
  pricing_type: "fixed_price", amount: 125, price_unit_id: 1, information_accuracy_acknowledgement: true,
  portfolio_images: [jpg, jpg2], certificates: { description: "Certified automotive detailing professional", files: [pdf] },
}, petIdentity);
const e18 = Object.fromEntries(entriesOf(fd18).filter(([k]) => !k.endsWith("[]")));
check(e18.category_id === "15" && e18.subcategory_id === "93" && e18.provider_type === "individual" && !keysOf(fd18).includes("business_id"), "§18 identity fields, no business_id for individual");
check(get(fd18, "fulfillment_type_ids[]").join() === "2" && e18.service_radius === "15" && e18.service_radius_unit === "mile", "§18 fulfillment array + radius + unit");
check(e18.pricing_type === "fixed_price" && e18.amount === "125" && e18.currency === "USD" && e18.price_unit_id === "1", "§18 pricing fields with USD from context");
check(e18.answers_json === "{}", "§18 generic-only answers_json is {}");
check(e18.information_accuracy_acknowledgement === "true", "§18 acknowledgement true on create");
check(get(fd18, "portfolio_images[]").length === 2 && e18.certificate_description === "Certified automotive detailing professional" && get(fd18, "certificate_files[]")[0] === pdf, "§18 portfolio + certificate bundle");
check(!keysOf(fd18).includes("address_id") && !keysOf(fd18).includes("profile_pricing_scope") && !keysOf(fd18).includes("charge_in_usd"), "§18 no address_id, prohibited scope omitted, no charge_in_usd");

// Guide §19 Tutoring dynamic create.
const fd19 = buildCreateFormData(tutoring, {
  title: "Online algebra tutoring", fulfillment_types: [4],
  description: "One-to-one algebra tutoring with guided practice and lesson plans.",
  pricing_type: "fixed_price", amount: 50, price_unit_id: 2, charge_in_usd: false,
  learner_delivery: "individual", qualifications: "B.Ed. in Mathematics", student_types_served: ["high_school"], subjects_taught: ["math"],
  information_accuracy_acknowledgement: true, portfolio_images: [file("lesson-sample.png", "image/png")],
}, { categoryId: 6, subcategoryId: 41, providerType: "individual" });
const e19 = Object.fromEntries(entriesOf(fd19).filter(([k]) => !k.endsWith("[]")));
check(e19.currency === "CAD" && e19.amount === "50" && e19.price_unit_id === "2", "§19 CAD local currency when toggle off");
check(JSON.parse(e19.answers_json as string).qualifications === "B.Ed. in Mathematics" && JSON.parse(e19.answers_json as string).student_types_served[0] === "high_school" && JSON.parse(e19.answers_json as string).learner_delivery === "individual", "§19 dynamic answers in answers_json");
check(!("title" in JSON.parse(e19.answers_json as string)) && !("fulfillment_type_ids" in JSON.parse(e19.answers_json as string)), "§19 generic keys never land in answers_json");
check(!("session_duration_minutes" in JSON.parse(e19.answers_json as string)), "§19 hidden/empty dynamic key absent, not null");
check(!keysOf(fd19).includes("dynamic_file_keys[]"), "§19 no dynamic files when none uploaded");
check(!keysOf(fd19).includes("charge_in_usd"), "§19 charge_in_usd never sent");
const fd19usd = buildCreateFormData(tutoring, { title: "t", fulfillment_types: [4], pricing_type: "fixed_price", amount: 50, price_unit_id: 2, charge_in_usd: true }, { categoryId: 6, subcategoryId: 41, providerType: "individual" });
check(get(fd19usd, "currency")[0] === "USD", "§19 toggle on submits USD");
const fd19other = buildCreateFormData(tutoring, { ...baseValues(), subjects_taught: ["math", "other"], subjects_taught_other: "Physics" }, { categoryId: 6, subcategoryId: 41, providerType: "individual" });
check(JSON.parse(get(fd19other, "answers_json")[0] as string).subjects_taught_other === "Physics", "Other custom value included when other is selected");

// Guide §20 Personal business create with two dynamic files.
const fd20 = buildCreateFormData(personal, {
  title: "Guided wellness program", fulfillment_types: [4],
  description: "A structured remote wellness program with guided weekly sessions.",
  pricing_type: "fixed_price", amount: 75, price_unit_id: 3,
  program_details: "Eight weekly sessions", conditions_worked_with: ["chronic_conditions"],
  cori_background_check: [cori], business_verification: [license],
  information_accuracy_acknowledgement: true, portfolio_images: [file("program.png", "image/png")],
}, { categoryId: 14, subcategoryId: 90, providerType: "business", businessId: 12 });
const e20 = Object.fromEntries(entriesOf(fd20).filter(([k]) => !k.endsWith("[]")));
check(e20.provider_type === "business" && e20.business_id === "12", "§20 business identity");
check(e20.currency === "USD" && e20.amount === "75" && e20.price_unit_id === "3", "§20 USD pricing");
check(JSON.stringify(JSON.parse(e20.answers_json as string)) === JSON.stringify({ program_details: "Eight weekly sessions", conditions_worked_with: ["chronic_conditions"] }), "§20 answers_json matches the guide");
const dk = get(fd20, "dynamic_file_keys[]"), df = get(fd20, "dynamic_files[]");
check(dk.join() === "cori_background_check,business_verification" && df[0] === cori && df[1] === license, "§20 paired dynamic files in order");
check(!("cori_background_check" in JSON.parse(e20.answers_json as string)), "§20 new files never in answers_json");

// Information-only and candidate builders.
const editValues: FormValues = { ...baseValues(), title: "Updated online algebra tutoring", portfolio_images: [file("new-sample.png", "image/png")], certificates: { description: "Updated shared certificate description", files: [pdf] } };
const fdInfo = buildInformationFormData(tutoring, editValues, { deletePortfolioIds: [301], deleteCertificateIds: [99] });
const kInfo = keysOf(fdInfo);
check(!kInfo.some((k) => ["category_id", "subcategory_id", "provider_type", "business_id"].includes(k)), "information: identity omitted");
check(!kInfo.some((k) => ["pricing_type", "amount", "currency", "price_unit_id", "profile_pricing_scope"].includes(k)), "information: pricing omitted");
check(!kInfo.includes("information_accuracy_acknowledgement"), "information: acknowledgement omitted");
check(get(fdInfo, "delete_portfolio_ids[]").join() === "301" && get(fdInfo, "delete_certificate_ids[]").join() === "99", "information: delete id arrays");
check(get(fdInfo, "title")[0] === "Updated online algebra tutoring" && get(fdInfo, "certificate_description")[0] === "Updated shared certificate description", "information: title + certificate description");

const fdCand = buildCandidateFormData(tutoring, { ...editValues, learner_delivery: "group", price_unit_id: 3, profile_pricing_scope: "per_request" }, { deletePortfolioIds: [301], clearDynamicFileKeys: ["cori_background_check"] });
const kCand = keysOf(fdCand);
check(get(fdCand, "answers_mode")[0] === "replace", "candidate: answers_mode=replace");
check(!kCand.includes("information_accuracy_acknowledgement") && !kCand.includes("charge_in_usd"), "candidate: acknowledgement and charge_in_usd omitted");
check(!kCand.some((k) => ["category_id", "subcategory_id", "provider_type", "business_id"].includes(k)), "candidate: identity omitted");
check(get(fdCand, "clear_dynamic_file_keys[]").join() === "cori_background_check" && get(fdCand, "delete_portfolio_ids[]").join() === "301", "candidate: clear_dynamic_file_keys and delete ids pass through");
check(get(fdCand, "pricing_type")[0] === "fixed_price" && get(fdCand, "price_unit_id")[0] === "3" && get(fdCand, "profile_pricing_scope")[0] === "per_request", "candidate: pricing included with required scope");

// Never-submit keys are stripped even if a template mistakenly routes them.
const badTemplate = asTemplate(JSON.parse(JSON.stringify(tutoringFixture)));
badTemplate.fields.push({ field_key: "booking_policy", label: "Booking", field_type: "text", field_scope: "dynamic", is_required: false, requiredness: "optional", submit_as: { type: "answers_json", key: "booking_policy" } } as any);
badTemplate.fields.push({ field_key: "address_id", label: "Addr", field_type: "number", field_scope: "generic", is_required: false, requiredness: "optional", submit_as: { type: "top_level", key: "address_id" } } as any);
const badPayload = buildPayload(badTemplate, { ...baseValues(), booking_policy: "x", address_id: 5 }, "create");
check(!("booking_policy" in badPayload.answers) && !("address_id" in badPayload.entries) && !("booking_policy" in badPayload.entries), "address_id / booking_policy never appear (prohibited provider fields + never-submit list)");

// Hidden dynamic key for the other format is omitted.
const groupHidden = buildPayload(tutoring, { ...baseValues(), learner_delivery: undefined, session_duration_minutes: 60 }, "create");
check(!("session_duration_minutes" in groupHidden.answers), "dynamic key hidden by visible_when is omitted, not null");

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
console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exitCode = 1;
