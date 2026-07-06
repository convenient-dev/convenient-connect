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
  const token = SecureStore
    ? await SecureStore.getItemAsync(TOKEN_KEY)
    : memoryStore.get(TOKEN_KEY) ?? null;
  console.log(
    `[TOKEN-STORE] getToken() -> ${token ? `found (${token.substring(0, 20)}...)` : "null"}`
  );
  return token;
}

export async function setToken(token: string): Promise<void> {
  console.log(
    `[TOKEN-STORE] setToken() -> storing token (${token.substring(0, 20)}...)`
  );
  console.log("[TOKEN-STORE] setToken() called from:", new Error().stack);
  if (SecureStore) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    memoryStore.set(TOKEN_KEY, token);
  }
  console.log("[TOKEN-STORE] Token stored successfully");
}

export async function clearToken(): Promise<void> {
  console.log("[TOKEN-STORE] clearToken() -> deleting token...");
  if (SecureStore) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    console.log("[TOKEN-STORE] Token deleted from SecureStore");
  } else {
    memoryStore.delete(TOKEN_KEY);
    console.log("[TOKEN-STORE] Token deleted from memory store");
  }
  // Verify it was actually cleared
  const check = SecureStore
    ? await SecureStore.getItemAsync(TOKEN_KEY)
    : memoryStore.get(TOKEN_KEY) ?? null;
  console.log(`[TOKEN-STORE] Verification after clear: ${check === null ? "SUCCESS (null)" : "FAILED (still exists)"}`);
}
