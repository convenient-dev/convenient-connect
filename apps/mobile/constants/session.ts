// Session / API configuration shared across screens.

import { useSyncExternalStore } from "react";

export const LARAVEL_API_BASE_URL =
  process.env.EXPO_PUBLIC_LARAVEL_API_URL ??
  "https://uatservices-backend.theconvenientapp.store/api/v1";

// The signed-in user. Hardcoded until auth lands; can be overridden at runtime
// via setCurrentUserId (e.g. when the signup flow picks a provider type).
// Replace this store with a real auth source (not its shape) when auth is
// wired up.
const DEFAULT_USER_ID = 1;

let currentUserId = DEFAULT_USER_ID;
const listeners = new Set<() => void>();

export function setCurrentUserId(userId: number): void {
  if (userId === currentUserId) return;
  currentUserId = userId;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): number {
  return currentUserId;
}

// TODO: add loading/null states when auth lands.
export function useCurrentUser(): { userId: number } {
  const userId = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { userId };
}
