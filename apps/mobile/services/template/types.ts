/**
 * Template engine types.
 *
 * The generated OpenAPI types leave several nested template objects untyped
 * (`options`, `validation`, `formats`, ...). These interfaces narrow them to the
 * shapes documented in api-doc.json examples and the integration guide. They
 * are structural supersets, so a template payload can be cast once at the
 * boundary (see `asTemplate`).
 */
import type { MultipartFile } from "../../api/multipart";
import type {
  ProviderListingCapability as GeneratedCapability,
  ServiceFormTemplate as GeneratedTemplate,
  ServiceFormTemplateField as GeneratedField,
  ServiceFormTemplateSection,
  ServiceFormSubmitAs,
} from "../../api/service-management";

export type { ServiceFormTemplateSection, ServiceFormSubmitAs };

export type ProviderType = "individual" | "business";
export type PricingType = "fixed_price" | "quote_required";
export type ProfilePricingScope = "per_request" | "per_profile";
export type ProfilePricingScopeState = "required" | "optional" | "prohibited";

export type FieldType = NonNullable<GeneratedField["field_type"]>;
export type SubmitAsType = NonNullable<ServiceFormSubmitAs["type"]>;

export type Scalar = string | number | boolean;

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

export type PredicateOperator =
  | "equals"
  | "not_equals"
  | "in"
  | "not_in"
  | "empty"
  | "not_empty"
  | "contains"
  | "not_contains"
  | "contains_any"
  | "less_than"
  | "greater_than";

export interface Predicate {
  all?: Predicate[];
  any?: Predicate[];
  not?: Predicate | null;
  /** Another template field, compared by option `code` when the field has coded options. */
  field_key?: string;
  /** Alias of `field_key` used by some descriptors. */
  field?: string;
  /** A context value such as `pricing_type` or `can_charge_in_usd`. */
  context_key?: string;
  operator?: PredicateOperator;
  value?: Scalar | null;
  values?: Scalar[];
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

export interface FieldOption {
  label: string;
  value: Scalar;
  /** Master-backed options (fulfillment, price units) carry a stable code. */
  code?: string;
  allows_custom_value?: boolean;
  custom_value_key?: string;
  custom_value_label?: string;
}

export interface FieldValidation {
  data_type?: "string" | "number" | "integer" | "boolean" | string;
  minimum_length?: number;
  maximum_length?: number;
  minimum?: number;
  maximum?: number;
  minimum_selections?: number;
  maximum_selections?: number;
  allowed_values?: Scalar[];
  /** yes_no fields that must be answered with this value (acknowledgement). */
  accepted_value?: Scalar;
  integer?: boolean;
}

export interface SelectionRules {
  /** Values that cannot be combined with any other selection (e.g. "na"). */
  exclusive_values?: Scalar[];
}

/**
 * Cross-field constraint declared on the field it applies to, e.g.
 * `min_guest_count` <= `answers_json.max_guest_count`. `other_path` is a wire
 * path; `answers_json.` is stripped to find the other field.
 */
export interface FieldRelation {
  operator: "less_than_or_equal" | "on_or_after";
  other_path: string;
  when?: "both_present";
}

export interface PricingSubField {
  label?: string;
  required?: boolean;
  visible?: boolean;
  value_key?: string;
  placeholder?: string;
  minimum?: number;
  maximum?: number;
  validation?: FieldValidation;
}

export interface PriceUnitOption {
  label: string;
  value: number;
  code: string;
}

export interface ChargeInUsdControl {
  label?: string;
  default?: boolean;
  value_key?: string;
  visible_when?: Predicate | null;
}

export type TemplateField = Omit<
  GeneratedField,
  | "options"
  | "validation"
  | "visible_when"
  | "required_when"
  | "prohibited_when"
  | "unit_options"
  | "unit_validation"
  | "pricing_types"
  | "price_units"
  | "fixed_price_fields"
  | "quote_required_fields"
  | "charge_in_usd"
  | "default"
> & {
  options?: FieldOption[];
  validation?: FieldValidation | [] | null;
  selection_rules?: SelectionRules | null;
  relations?: FieldRelation[] | null;
  visible_when?: Predicate | null;
  required_when?: Predicate | null;
  prohibited_when?: Predicate | null;
  default?: Scalar;
  // number-with-unit fields (service_radius)
  unit_options?: FieldOption[];
  unit_validation?: FieldValidation | null;
  // pricing field
  pricing_types?: FieldOption[];
  price_units?: PriceUnitOption[];
  fixed_price_fields?: Record<string, PricingSubField> | null;
  quote_required_fields?: Record<string, PricingSubField> | null;
  charge_in_usd?: ChargeInUsdControl | null;
};

// ---------------------------------------------------------------------------
// Capability
// ---------------------------------------------------------------------------

export interface ProfilePricingScopeStateContract {
  state: ProfilePricingScopeState;
  applicable?: boolean;
  required?: boolean;
  allowed_values?: ProfilePricingScope[];
}

export interface ProfilePricingScopeContract {
  field_key?: "profile_pricing_scope";
  label?: string;
  help_text?: string | null;
  options?: FieldOption[];
  default_state?: ProfilePricingScopeStateContract;
  by_pricing_type?: Partial<
    Record<PricingType, Record<string, ProfilePricingScopeStateContract>>
  >;
}

export interface CapabilityControlField {
  field_key: string;
  label: string;
  field_type: string;
  is_required?: boolean;
  options?: FieldOption[];
  validation?: FieldValidation | [] | null;
  default?: number;
}

export interface FormatContract {
  label?: string;
  pricing?: Partial<Record<PricingType, string[]>>;
  profile_pricing_scope?: ProfilePricingScopeContract;
  /** Price-unit code -> fulfillment codes that replace `fulfillment` for that unit. */
  fulfillment_by_price_unit?: Record<string, string[]> | [];
  fulfillment?: string[];
  provider_fields?: CapabilityControlField[];
}

export interface BusinessFormatSelector {
  field_key: string;
  label: string;
  required: boolean;
  options: FieldOption[];
}

export type ListingCapability = Omit<
  GeneratedCapability,
  "formats" | "business_format"
> & {
  formats: Record<string, FormatContract>;
  business_format?: BusinessFormatSelector | null;
};

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export type FormTemplate = Omit<
  GeneratedTemplate,
  "fields" | "provider_listing_capability"
> & {
  fields: TemplateField[];
  provider_listing_capability?: ListingCapability;
};

/** Narrows a template payload from the API to the engine's field types. */
export function asTemplate(template: GeneratedTemplate): FormTemplate {
  return template as unknown as FormTemplate;
}

// ---------------------------------------------------------------------------
// Form values
// ---------------------------------------------------------------------------

/** One shared description with new files to upload. */
export interface CertificateBundleValue {
  description?: string;
  files?: MultipartFile[];
}

/**
 * Form state keyed by `field_key`, plus derived keys the template names:
 * `unit_value_key` (e.g. `service_radius_unit`), `custom_value_key` for Other
 * inputs, and the pricing keys `pricing_type`, `amount`, `price_unit_id`,
 * `profile_pricing_scope`, `charge_in_usd`.
 *
 * File fields hold `MultipartFile[]` (new uploads only). The certificate field
 * holds a {@link CertificateBundleValue}.
 */
export type FormValues = Record<string, unknown>;

export const PRICING_VALUE_KEYS = {
  pricingType: "pricing_type",
  amount: "amount",
  priceUnitId: "price_unit_id",
  profilePricingScope: "profile_pricing_scope",
  chargeInUsd: "charge_in_usd",
} as const;
