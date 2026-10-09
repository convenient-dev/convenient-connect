import type {
  FormatContract,
  ListingCapability,
  PriceUnitOption,
  PricingType,
  ProfilePricingScopeStateContract,
} from "./types";

const PROHIBITED_STATE: ProfilePricingScopeStateContract = {
  state: "prohibited",
  applicable: false,
  required: false,
  allowed_values: [],
};

/**
 * Picks the active format key.
 *
 * - With a `business_format` selector, the provider's selected value is the key.
 *   Until they select one there is no active format.
 * - Without a selector, `default` is used when it is the only entry; otherwise
 *   the first format whose fulfillment list covers every selected code, then
 *   the first that covers any, then `default`, then the first key.
 */
export function resolveActiveFormatKey(
  capability: ListingCapability | null | undefined,
  selection: { businessFormatValue?: unknown; fulfillmentCodes?: string[] },
): string | null {
  if (!capability) return null;
  const keys = Object.keys(capability.formats ?? {});
  if (keys.length === 0) return null;

  if (capability.business_format) {
    const value = selection.businessFormatValue;
    if (value === null || value === undefined || value === "") return null;
    return keys.includes(String(value)) ? String(value) : null;
  }

  if (keys.length === 1) return keys[0];

  const selected = selection.fulfillmentCodes ?? [];
  if (selected.length > 0) {
    const coversAll = keys.find((key) =>
      selected.every((code) =>
        (capability.formats[key].fulfillment ?? []).includes(code),
      ),
    );
    if (coversAll) return coversAll;
    const coversAny = keys.find((key) =>
      selected.some((code) =>
        (capability.formats[key].fulfillment ?? []).includes(code),
      ),
    );
    if (coversAny) return coversAny;
  }

  return keys.includes("default") ? "default" : keys[0];
}

export function getFormat(
  capability: ListingCapability | null | undefined,
  formatKey: string | null,
): FormatContract | null {
  if (!capability || !formatKey) return null;
  return capability.formats?.[formatKey] ?? null;
}

/** Price-unit codes allowed for the format and pricing type. */
export function allowedPriceUnitCodes(
  format: FormatContract | null,
  pricingType: PricingType | null | undefined,
): string[] {
  if (!format || !pricingType) return [];
  return format.pricing?.[pricingType] ?? [];
}

/** Filters the template's price units to the codes the format allows. */
export function filterPriceUnits(
  units: PriceUnitOption[] | undefined,
  allowedCodes: string[],
): PriceUnitOption[] {
  if (!units) return [];
  return units.filter((unit) => allowedCodes.includes(unit.code));
}

/**
 * Fulfillment codes allowed for the format. When `fulfillment_by_price_unit`
 * names the selected unit, that list replaces the format list. An empty result
 * means the fulfillment control is hidden and `fulfillment_type_ids` is omitted.
 */
export function allowedFulfillmentCodes(
  format: FormatContract | null,
  selectedPriceUnitCode: string | null | undefined,
): string[] {
  if (!format) return [];
  const byUnit = format.fulfillment_by_price_unit;
  if (
    selectedPriceUnitCode &&
    byUnit &&
    !Array.isArray(byUnit) &&
    Array.isArray(byUnit[selectedPriceUnitCode])
  ) {
    return byUnit[selectedPriceUnitCode];
  }
  return format.fulfillment ?? [];
}

/**
 * State of the `profile_pricing_scope` control for the selected pricing type
 * and price unit, falling back to `default_state`, then prohibited.
 */
export function profilePricingScopeState(
  format: FormatContract | null,
  pricingType: PricingType | null | undefined,
  priceUnitCode: string | null | undefined,
): ProfilePricingScopeStateContract {
  const contract = format?.profile_pricing_scope;
  if (!contract) return PROHIBITED_STATE;
  if (pricingType && priceUnitCode) {
    const entry = contract.by_pricing_type?.[pricingType]?.[priceUnitCode];
    if (entry) return entry;
  }
  return contract.default_state ?? PROHIBITED_STATE;
}

/** Keys the provider must never render or submit (e.g. `booking_policy`). */
export function isProhibitedProviderField(
  capability: ListingCapability | null | undefined,
  key: string,
): boolean {
  const list = capability?.prohibited_provider_fields ?? [];
  return list.some((entry) => entry === key || key.startsWith(`${entry}.`));
}
