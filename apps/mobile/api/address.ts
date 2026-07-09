import * as Location from "expo-location";
import { laravelFetch } from "./client";
import type { components } from "./generated/api-types";

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
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface GooglePlaceDetail {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
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

export async function createAddress(params: AddressUpsert): Promise<Address> {
  console.log('[createAddress] Creating address:', params);
  const data = await laravelFetch<AddressModel>(PREFIX, {
    method: "POST",
    body: params,
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
  const data = await laravelFetch<AddressModel>(`${PREFIX}/${id}`, {
    method: "PUT",
    body: params,
  });
  return mapAddress(data);
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

/**
 * Reverse geocode using Google Maps Geocoding API.
 * Converts coordinates to a human-readable address.
 */
async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results?.[0]) {
      return data.results[0].formatted_address;
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
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry&key=${GOOGLE_MAPS_API_KEY}`;

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
  const address = await reverseGeocode(latitude, longitude);

  return { address, latitude, longitude };
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
