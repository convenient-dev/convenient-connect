import { laravelFetch } from "./client";
import type { components } from "./generated/api-types";

const AVAILABILITY_PREFIX = "/service-provider/availability";
const DATE_AVAILABILITY_PREFIX = "/service-provider/date-availability";

// ---------------------------------------------------------------------------
// Types (from generated OpenAPI schemas)
// ---------------------------------------------------------------------------

// Weekly (recurring) availability
export type AvailabilitySlotInput =
  components["schemas"]["ProviderAvailabilitySlotInput"];
export type AvailabilityDayInput =
  components["schemas"]["ProviderAvailabilityDayInput"];
export type AvailabilitySaveApplyToAllRequest =
  components["schemas"]["ProviderAvailabilitySaveApplyToAllRequest"];
export type AvailabilitySaveByDaysRequest =
  components["schemas"]["ProviderAvailabilitySaveByDaysRequest"];
export type AvailabilitySaveRequest =
  | AvailabilitySaveApplyToAllRequest
  | AvailabilitySaveByDaysRequest;

export type AvailabilitySlot = components["schemas"]["ProviderAvailabilitySlot"];
export type AvailabilityDay = components["schemas"]["ProviderAvailabilityDay"];
export type Availability = components["schemas"]["ProviderAvailabilityPayload"];

export type AvailabilityDayOption = NonNullable<
  components["schemas"]["ProviderAvailabilityDaysListResponse"]["data"]
>[number];
export type AvailabilityTimezone = NonNullable<
  components["schemas"]["ProviderAvailabilityTimezoneListResponse"]["data"]
>[number];

type AvailabilityToggleStatusData = NonNullable<
  components["schemas"]["ProviderAvailabilityToggleStatusSuccessResponse"]["data"]
>;

// Single-date overrides
export type DateAvailabilitySlotInput =
  components["schemas"]["ProviderDateAvailabilitySlotInput"];
export type DateAvailabilityUpsertRequest =
  components["schemas"]["ProviderDateAvailabilityUpsertRequest"];
export type DateAvailabilitySlot =
  components["schemas"]["ProviderDateAvailabilitySlot"];
export type DateAvailability =
  components["schemas"]["ProviderDateAvailabilityPayload"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeAvailability(data: Availability | null | undefined): Availability {
  return {
    ...data,
    is_available: data?.is_available ?? false,
    apply_to_all: data?.apply_to_all ?? false,
    slots: data?.slots ?? [],
    days: (data?.days ?? []).map((day) => ({
      ...day,
      slots: day.slots ?? [],
    })),
  };
}

function normalizeDateAvailability(
  data: DateAvailability | null | undefined,
): DateAvailability {
  return {
    ...data,
    is_override: data?.is_override ?? false,
    is_available: data?.is_available ?? null,
    slots: data?.slots ?? [],
    bookings: data?.bookings ?? [],
  };
}

// ---------------------------------------------------------------------------
// Weekly availability
// ---------------------------------------------------------------------------

/**
 * Get the provider's recurring availability: timezone, is_available,
 * apply_to_all, selected days and their slots. When apply_to_all is true the
 * shared slots are in `slots`; otherwise each day carries its own `slots`.
 */
export async function getAvailability(): Promise<Availability> {
  const data = await laravelFetch<Availability>(AVAILABILITY_PREFIX);
  return normalizeAvailability(data);
}

/**
 * Create or update the provider's recurring availability. Existing
 * availability and slots are replaced with the request payload.
 *
 * Pass `apply_to_all: true` with top-level `slots` and `days: [{ day_id }]`
 * to share the same slots across days, or `apply_to_all: false` with
 * per-day `days: [{ day_id, slots }]`.
 */
export async function saveAvailability(
  body: AvailabilitySaveRequest,
): Promise<Availability> {
  const data = await laravelFetch<Availability>(`${AVAILABILITY_PREFIX}/save`, {
    method: "POST",
    body,
  });
  return normalizeAvailability(data);
}

/**
 * Flip the provider profile's is_available flag. Returns the new value.
 */
export async function toggleAvailabilityStatus(): Promise<boolean> {
  const data = await laravelFetch<AvailabilityToggleStatusData>(
    `${AVAILABILITY_PREFIX}/toggle-status`,
    { method: "POST" },
  );
  return data?.is_available ?? false;
}

/**
 * Master list of days (id, day_name, short_name) used to build the
 * availability form.
 */
export async function listAvailabilityDays(): Promise<AvailabilityDayOption[]> {
  const data = await laravelFetch<AvailabilityDayOption[]>(
    `${AVAILABILITY_PREFIX}/days`,
  );
  return data ?? [];
}

/**
 * Master list of timezones (id, timezone, country_name).
 */
export async function listAvailabilityTimezones(): Promise<AvailabilityTimezone[]> {
  const data = await laravelFetch<AvailabilityTimezone[]>(
    `${AVAILABILITY_PREFIX}/timezones`,
  );
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Date availability (single-date overrides)
// ---------------------------------------------------------------------------

/**
 * Get the availability override for one date (YYYY-MM-DD). When no override
 * exists the API returns is_override=false with is_available=null and no
 * slots.
 */
export async function getDateAvailability(
  date: string,
): Promise<DateAvailability> {
  const params = new URLSearchParams({ date });
  const data = await laravelFetch<DateAvailability>(
    `${DATE_AVAILABILITY_PREFIX}?${params.toString()}`,
  );
  return normalizeDateAvailability(data);
}

/**
 * Create or update the availability override for one date without touching
 * the weekly availability. `slots` is optional (omit or pass [] to mark the
 * date unavailable).
 */
export async function saveDateAvailability(
  body: DateAvailabilityUpsertRequest,
): Promise<DateAvailability> {
  const data = await laravelFetch<DateAvailability>(DATE_AVAILABILITY_PREFIX, {
    method: "POST",
    body,
  });
  return normalizeDateAvailability(data);
}
