// Session / API configuration shared across screens.

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

// The signed-in user. Hardcoded until auth lands; override per-environment
// with EXPO_PUBLIC_USER_ID. Replace the hook body (not its shape) when auth
// is wired up.
const HARDCODED_USER_ID = Number(process.env.EXPO_PUBLIC_USER_ID ?? 1);

// TODO: add loading/null states when auth lands.
export function useCurrentUser(): { userId: number } {
  return { userId: HARDCODED_USER_ID };
}
