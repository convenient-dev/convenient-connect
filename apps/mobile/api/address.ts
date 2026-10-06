import * as Location from "expo-location";
import { laravelFetch } from "./client";
import type { components } from "./generated/api-types";
import { getCities, getCountries, getStates } from "./location";

type AddressModel = components["schemas"]["ProviderAddressModel"];
type AddressUpsert = components["schemas"]["ProviderAddressUpsertRequest"];

const PREFIX = "/service-provider/address";
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Google Maps API types
interface GoogleGeocodingResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components?: GoogleAddressComponent[];
}

interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GooglePlaceDetail {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components?: GoogleAddressComponent[];
}

/**
 * Country / state / city fields the address API stores as
 * `address_components`. Names match `ProviderAddressUpsertRequest`.
 */
export type AddressComponents = Pick<
  AddressUpsert,
  "country_name" | "country_short_name" | "state_name" | "state_code" | "city_name"
>;

/** Maps Google address components onto the API's address component fields. */
function parseAddressComponents(
  components: GoogleAddressComponent[] | undefined,
): AddressComponents {
  const find = (...types: string[]) =>
    components?.find((c) => types.some((t) => c.types.includes(t)));
  const country = find("country");
  const state = find("administrative_area_level_1");
  const city = find("locality", "postal_town", "sublocality_level_1", "administrative_area_level_2");
  return {
    country_name: country?.long_name ?? null,
    country_short_name: country?.short_name ?? null,
    state_name: state?.long_name ?? null,
    state_code: state?.short_name ?? null,
    city_name: city?.long_name ?? null,
  };
}

function sameName(a: string | null | undefined, b: string | null | undefined) {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Looks the geocoder's country / state / city names up in the location
 * endpoints so the address payload carries the backend's canonical names and
 * `state_code`. Each level falls back to the geocoded value when there is no
 * match, and any lookup failure leaves the geocoded components untouched so
 * a location outage never blocks saving an address.
 */
export async function resolveAddressComponents(
  components: AddressComponents,
): Promise<AddressComponents> {
  const resolved: AddressComponents = { ...components };
  if (!components.country_name) return resolved;

  try {
    const countries = await getCountries(components.country_name);
    const country =
      countries.find((c) => sameName(c.name, components.country_name)) ??
      countries[0];
    if (!country) return resolved;
    resolved.country_name = country.name;

    if (!components.state_name) return resolved;
    const states = await getStates(country.id, components.state_name);
    const state =
      states.find((s) => sameName(s.name, components.state_name)) ?? states[0];
    if (!state) return resolved;
    resolved.state_name = state.name;

    if (!components.city_name) return resolved;
    const cities = await getCities(state.id, components.city_name);
    const city =
      cities.find((c) => sameName(c.name, components.city_name)) ?? cities[0];
    if (!city) return resolved;
    resolved.city_name = city.name;
    // The cities endpoint is the only place the backend exposes a state code.
    if (city.stateCode) resolved.state_code = city.stateCode;
  } catch (error) {
    console.error("[resolveAddressComponents] Lookup failed:", error);
  }

  return resolved;
}

export interface Address {
  id: number;
  userId: number;
  address: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

function mapAddress(m: AddressModel): Address {
  return {
    id: m.id!,
    userId: m.user_id!,
    address: m.address!,
    latitude: m.latitude!,
    longitude: m.longitude!,
    isDefault: m.is_default ?? false,
  };
}

export async function listAddresses(): Promise<Address[]> {
  const data = await laravelFetch<AddressModel[]>(PREFIX);
  console.log('[listAddresses] Raw API response:', JSON.stringify(data, null, 2));
  const mapped = (data ?? []).map(mapAddress);
  console.log('[listAddresses] Mapped addresses:', mapped);
  return mapped;
}

/**
 * Builds the full upsert body: `is_default` is always explicit (false unless
 * requested) and the country / state / city components are resolved through
 * the location endpoints; see {@link resolveAddressComponents}. Both create
 * and update send this shape, because the backend replaces the stored
 * components with whatever the request carries.
 */
async function buildUpsertPayload(params: AddressUpsert): Promise<AddressUpsert> {
  const components = await resolveAddressComponents({
    country_name: params.country_name ?? null,
    country_short_name: params.country_short_name ?? null,
    state_name: params.state_name ?? null,
    state_code: params.state_code ?? null,
    city_name: params.city_name ?? null,
  });
  return {
    address: params.address,
    latitude: params.latitude,
    longitude: params.longitude,
    is_default: params.is_default ?? false,
    ...components,
  };
}

export async function createAddress(params: AddressUpsert): Promise<Address> {
  const payload = await buildUpsertPayload(params);
  console.log('[createAddress] Creating address:', payload);
  const data = await laravelFetch<AddressModel>(PREFIX, {
    method: "POST",
    body: payload,
  });
  console.log('[createAddress] API response:', data);
  return mapAddress(data);
}

export async function getDefaultAddress(): Promise<Address | null> {
  try {
    const data = await laravelFetch<AddressModel>(`${PREFIX}/default`);
    return mapAddress(data);
  } catch (e: unknown) {
    if (e instanceof Error && "statusCode" in e && (e as any).statusCode === 404) {
      return null;
    }
    throw e;
  }
}

export async function getAddress(id: number): Promise<Address> {
  const data = await laravelFetch<AddressModel>(`${PREFIX}/${id}`);
  return mapAddress(data);
}

export async function updateAddress(
  id: number,
  params: AddressUpsert,
): Promise<Address> {
  const payload = await buildUpsertPayload(params);
  const data = await laravelFetch<AddressModel>(`${PREFIX}/${id}`, {
    method: "PUT",
    body: payload,
  });
  return mapAddress(data);
}

/**
 * Marks a saved address as the provider default. The list/detail responses
 * do not expose the stored components, and the update endpoint overwrites
 * them with the request body, so the components are re-derived from the
 * saved coordinates before the update. The saved address text is kept.
 */
export async function setDefaultAddress(address: Address): Promise<Address> {
  let components: AddressComponents = {};
  try {
    const { address: _ignored, ...geocoded } = await reverseGeocode(
      address.latitude,
      address.longitude,
    );
    components = geocoded;
  } catch (error) {
    console.error("[setDefaultAddress] Reverse geocode failed:", error);
  }
  return updateAddress(address.id, {
    address: address.address,
    latitude: address.latitude,
    longitude: address.longitude,
    is_default: true,
    ...components,
  });
}

export async function deleteAddress(id: number): Promise<void> {
  console.log('[deleteAddress] Deleting address ID:', id);
  await laravelFetch<unknown>(`${PREFIX}/${id}`, { method: "DELETE" });
  console.log('[deleteAddress] Delete successful for ID:', id);
}

// ---------------------------------------------------------------------------
// Device location — resolves coordinates + a readable address for the upsert
// payload above. Lives here so the geocoding output matches AddressUpsert.
// ---------------------------------------------------------------------------

/**
 * A resolved place: a human-readable address, its coordinates and, when the
 * geocoder returned them, the country / state / city components the backend
 * needs to treat the address as having a valid country.
 */
export interface ResolvedLocation extends AddressComponents {
  address: string;
  latitude: number;
  longitude: number;
}

/** Thrown when the user declines the foreground location permission. */
export class LocationPermissionError extends Error {
  constructor(message = "Location permission was denied.") {
    super(message);
    this.name = "LocationPermissionError";
  }
}

/**
 * Reverse geocode using Google Maps Geocoding API.
 * Converts coordinates to a human-readable address plus its components.
 */
async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ address: string } & AddressComponents> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results?.[0]) {
      const result = data.results[0] as GoogleGeocodingResult;
      return {
        address: result.formatted_address,
        ...parseAddressComponents(result.address_components),
      };
    }

    throw new Error(`Geocoding failed: ${data.status}`);
  } catch (error) {
    console.error("[reverseGeocode] Error:", error);
    throw new Error("Failed to reverse geocode location");
  }
}

/**
 * Get place autocomplete suggestions using Google Places Autocomplete API.
 * Returns a list of place predictions based on the search query.
 */
async function getPlacePredictions(
  query: string,
): Promise<GooglePlacePrediction[]> {
  if (!query.trim()) return [];

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.predictions) {
      return data.predictions;
    }

    return [];
  } catch (error) {
    console.error("[getPlacePredictions] Error:", error);
    return [];
  }
}

/**
 * Get detailed place information using Google Places Details API.
 * Fetches full address and coordinates for a given place_id.
 */
async function getPlaceDetails(placeId: string): Promise<GooglePlaceDetail> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry,address_components&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.result) {
      return data.result;
    }

    throw new Error(`Place details failed: ${data.status}`);
  } catch (error) {
    console.error("[getPlaceDetails] Error:", error);
    throw new Error("Failed to get place details");
  }
}

/**
 * Requests permission, reads the device's current position, and reverse-geocodes
 * it into a readable address using Google Maps API.
 * Throws {@link LocationPermissionError} if denied.
 */
export async function resolveCurrentLocation(): Promise<ResolvedLocation> {
  // Use expo-location for native device location (efficient and free)
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) {
    throw new LocationPermissionError();
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  const { latitude, longitude } = position.coords;

  // Use Google Maps for reverse geocoding (better address quality)
  const place = await reverseGeocode(latitude, longitude);

  return { ...place, latitude, longitude };
}

/**
 * Search for addresses using Google Places Autocomplete API.
 * Returns a list of candidate places with full address and coordinates.
 */
export async function searchAddresses(
  query: string,
  limit = 5,
): Promise<ResolvedLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Get autocomplete predictions from Google Places
  const predictions = await getPlacePredictions(trimmed);

  // Fetch details for each prediction (up to the limit)
  const results: ResolvedLocation[] = [];
  const seen = new Set<string>();

  for (const prediction of predictions.slice(0, limit)) {
    try {
      const details = await getPlaceDetails(prediction.place_id);
      const address = details.formatted_address;

      // Skip duplicates
      if (seen.has(address)) continue;
      seen.add(address);

      results.push({
        address,
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        ...parseAddressComponents(details.address_components),
      });
    } catch (error) {
      console.error(
        `[searchAddresses] Failed to get details for place_id ${prediction.place_id}:`,
        error,
      );
      // Continue with other predictions even if one fails
    }
  }

  return results;
}
