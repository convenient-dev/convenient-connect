import { getToken, clearToken } from "@/auth/token-store";
import type { components } from "./generated/api-types";

export const LARAVEL_API_BASE_URL =
  process.env.EXPO_PUBLIC_LARAVEL_API_URL ??
  "https://uatservices-backend.theconvenientapp.store/api/v1";

// The API returns storage paths relative to the host (e.g. "/storage/...").
const LARAVEL_HOST = LARAVEL_API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

/** Resolves a relative storage path from the API into an absolute URL. */
export function toAbsoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${LARAVEL_HOST}${path}`;
}

export type PaginationMeta = components["schemas"]["PaginationMeta"];

export type PublishabilityIssue =
  components["schemas"]["ProviderPublishabilityIssue"];

/**
 * `data` of a 422 when create, information/pricing update, or activation fails
 * commercial publishability. `errors` is keyed by field key.
 */
export type CommercialPublishabilityErrorData = NonNullable<
  components["schemas"]["ProviderCommercialPublishabilityError"]["data"]
>;

export class ApiError extends Error {
  statusCode: number;
  /** The error envelope's `data`, when the backend returned one (e.g. publishability errors). */
  data: unknown;

  constructor(message: string, statusCode: number, data: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
  }
}

export function isCommercialPublishabilityError(
  error: unknown,
): error is ApiError & { data: CommercialPublishabilityErrorData } {
  if (!(error instanceof ApiError)) return false;
  const data = error.data as Partial<CommercialPublishabilityErrorData> | null;
  return data?.type === "commercial_publishability" && !!data.errors;
}

/**
 * Flattens publishability `errors` into one message list per field key so a
 * form can show them under the matching field.
 */
export function getPublishabilityFieldMessages(
  error: ApiError & { data: CommercialPublishabilityErrorData },
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [field, issues] of Object.entries(error.data.errors ?? {})) {
    result[field] = (issues ?? [])
      .map((issue) => issue.message)
      .filter((message): message is string => !!message);
  }
  return result;
}

interface LaravelEnvelope<T = unknown, M = unknown> {
  status: string;
  message: string;
  data: T;
  meta: M;
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void): void {
  onUnauthorized = callback;
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
  skipAuth?: boolean;
}

async function laravelRequest<T, M>(
  path: string,
  options: FetchOptions = {},
): Promise<LaravelEnvelope<T, M>> {
  const { method = "GET", body, isFormData = false, skipAuth = false } = options;

  const headers: Record<string, string> = {};

  if (!skipAuth) {
    const token = await getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
    headers["Accept"] = "application/json";
  } else {
    headers["Accept"] = "application/json";
  }

  // Prevent iOS URLSession caching
  if (method === "GET") {
    headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    headers["Pragma"] = "no-cache";
    headers["Expires"] = "0";
  }

  const url = `${LARAVEL_API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body
      ? isFormData
        ? (body as FormData)
        : JSON.stringify(body)
      : undefined,
  });

  if (res.status === 401) {
    await clearToken();
    onUnauthorized?.();
    throw new ApiError("Unauthenticated.", 401);
  }

  let json: any;
  try {
    json = await res.json();
  } catch (parseError) {
    console.error("[laravelFetch] Failed to parse response as JSON:", {
      url,
      status: res.status,
      parseError,
    });
    throw new ApiError("Invalid server response", res.status);
  }

  if (!res.ok) {
    console.error("[laravelFetch] Error response:", {
      url,
      status: res.status,
      json,
    });

    // Extract error message from various possible formats. A 403 for a
    // suspended provider carries its message here and is surfaced unchanged.
    const errorMessage =
      json?.message ||
      json?.error ||
      json?.errors?.[0]?.message ||
      "Something went wrong";

    throw new ApiError(errorMessage, res.status, json?.data ?? null);
  }

  return json as LaravelEnvelope<T, M>;
}

/** Calls the Laravel API and returns the envelope's `data`. */
export async function laravelFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const envelope = await laravelRequest<T, unknown>(path, options);

  // Debug logging for business/services endpoint
  if (path.includes('/business/services')) {
    console.log(`[laravelFetch] ${path} - Status: ${envelope.status}, Data length: ${Array.isArray(envelope.data) ? envelope.data.length : 'N/A'}`);
  }

  return envelope.data;
}

export interface PaginatedResult<T, M = PaginationMeta> {
  data: T;
  meta: M;
}

/**
 * Like {@link laravelFetch} but keeps the envelope's `meta`, which paginated
 * endpoints use for `current_page`, `last_page`, `per_page` and `total`.
 */
export async function laravelFetchWithMeta<T, M = PaginationMeta>(
  path: string,
  options: FetchOptions = {},
): Promise<PaginatedResult<T, M>> {
  const envelope = await laravelRequest<T, M>(path, options);
  return { data: envelope.data, meta: envelope.meta };
}

/** Builds a query string from defined params, omitting null/undefined values. */
export function buildQuery(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
