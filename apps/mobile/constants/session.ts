// Session / API configuration shared across screens.
//
// `useCurrentUser` is intentionally shaped as a hook even though it currently
// returns a hardcoded user. When real auth lands, swap the body to read from
// the session/auth context (and add loading/null states) without touching any
// of the ~20 call sites — they already consume it as `const { userId } = useCurrentUser()`.

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

// The signed-in user. Hardcoded until auth lands; override per-environment
// with EXPO_PUBLIC_USER_ID. Replace the hook body (not its shape) when auth
// is wired up.
const HARDCODED_USER_ID = Number(process.env.EXPO_PUBLIC_USER_ID ?? 1);

export function useCurrentUser(): { userId: number } {
  return { userId: HARDCODED_USER_ID };
}
