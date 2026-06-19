import { Platform } from "react-native";

const TOKEN_KEY = "auth_bearer_token";

let SecureStore: typeof import("expo-secure-store") | null = null;
try {
  SecureStore = require("expo-secure-store");
} catch {
  // Native module unavailable (e.g. Expo Go or stale dev build).
  // Falls back to in-memory storage below — rebuild with
  // `npx expo run:ios` / `npx expo run:android` to enable SecureStore.
}

// In-memory fallback when the native module isn't linked yet.
const memoryStore = new Map<string, string>();

export async function getToken(): Promise<string | null> {
  if (SecureStore) {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }
  return memoryStore.get(TOKEN_KEY) ?? null;
}

export async function setToken(token: string): Promise<void> {
  if (SecureStore) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    memoryStore.set(TOKEN_KEY, token);
  }
}

export async function clearToken(): Promise<void> {
  if (SecureStore) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } else {
    memoryStore.delete(TOKEN_KEY);
  }
}
