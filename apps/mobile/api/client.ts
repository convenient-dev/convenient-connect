import { getToken, clearToken } from "@/auth/token-store";

export const LARAVEL_API_BASE_URL =
  process.env.EXPO_PUBLIC_LARAVEL_API_URL ??
  "https://uatservices-backend.theconvenientapp.store/api/v1";

export const LEGACY_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

// The API returns storage paths relative to the host (e.g. "/storage/...").
const LARAVEL_HOST = LARAVEL_API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

/** Resolves a relative storage path from the API into an absolute URL. */
export function toAbsoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${LARAVEL_HOST}${path}`;
}

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

interface LaravelEnvelope<T = unknown> {
  status: string;
  message: string;
  data: T;
  meta: unknown;
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

export async function laravelFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
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

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(
      json.message ?? "Something went wrong",
      res.status,
    );
  }

  // Debug logging for business/services endpoint
  if (path.includes('/business/services')) {
    const envelope = json as LaravelEnvelope<T>;
    console.log(`[laravelFetch] ${path} - Status: ${envelope.status}, Data length: ${Array.isArray(envelope.data) ? envelope.data.length : 'N/A'}`);
  }

  return (json as LaravelEnvelope<T>).data;
}

export async function legacyFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; isFormData?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, isFormData = false } = options;

  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const url = `${LEGACY_API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body
      ? isFormData
        ? (body as FormData)
        : JSON.stringify(body)
      : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(
      errorBody?.error ?? "Request failed",
      res.status,
    );
  }

  return res.json() as Promise<T>;
}
