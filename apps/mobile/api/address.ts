import * as Location from "expo-location";
import { laravelFetch } from "./client";
import type { components } from "./generated/api-types";

type AddressModel = components["schemas"]["ProviderAddressModel"];
type AddressUpsert = components["schemas"]["ProviderAddressUpsertRequest"];

const PREFIX = "/service-provider/address";

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
  return (data ?? []).map(mapAddress);
}

export async function createAddress(params: AddressUpsert): Promise<Address> {
  const data = await laravelFetch<AddressModel>(PREFIX, {
    method: "POST",
    body: params,
  });
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
  const data = await laravelFetch<AddressModel>(`${PREFIX}/${id}`, {
    method: "PUT",
    body: params,
  });
  return mapAddress(data);
}

export async function deleteAddress(id: number): Promise<void> {
  await laravelFetch<unknown>(`${PREFIX}/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Device location — resolves coordinates + a readable address for the upsert
// payload above. Lives here so the geocoding output matches AddressUpsert.
// ---------------------------------------------------------------------------

/** A resolved place: a human-readable address plus its coordinates. */
export interface ResolvedLocation {
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

/** Formats an expo-location geocode result into a single-line address. */
function formatPlace(place: Location.LocationGeocodedAddress): string {
  const street = [place.streetNumber, place.street].filter(Boolean).join(" ");
  const parts = [
    street || place.name,
    place.city ?? place.subregion,
    place.region,
    place.postalCode,
    place.country,
  ];
  return parts.filter(Boolean).join(", ");
}

/**
 * Requests permission, reads the device's current position, and reverse-geocodes
 * it into a readable address. Throws {@link LocationPermissionError} if denied.
 */
export async function resolveCurrentLocation(): Promise<ResolvedLocation> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) {
    throw new LocationPermissionError();
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  const { latitude, longitude } = position.coords;

  const places = await Location.reverseGeocodeAsync({ latitude, longitude });
  const address = places[0] ? formatPlace(places[0]) : "";

  return { address, latitude, longitude };
}

/**
 * Forward-geocodes a free-text address into a list of candidate places, each
 * with a readable address and coordinates, so the caller can let the user pick
 * the right one instead of guessing. De-duplicates identical addresses and
 * caps the number of reverse-geocode lookups.
 */
export async function searchAddresses(
  query: string,
  limit = 5,
): Promise<ResolvedLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const matches = await Location.geocodeAsync(trimmed);

  const results: ResolvedLocation[] = [];
  const seen = new Set<string>();

  for (const match of matches.slice(0, limit)) {
    const places = await Location.reverseGeocodeAsync({
      latitude: match.latitude,
      longitude: match.longitude,
    });
    const address = places[0] ? formatPlace(places[0]) : trimmed;
    if (seen.has(address)) continue;
    seen.add(address);
    results.push({
      address,
      latitude: match.latitude,
      longitude: match.longitude,
    });
  }

  return results;
}
