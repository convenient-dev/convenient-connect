// Backend validation: names are required, letters/spaces only, max 70 chars
export function sanitizeName(value: string): string {
  return value
    .replace(/[^\p{L} ]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);
}

export function deriveNames(
  user: {
    name: string | null;
    email: string;
    givenName: string | null;
    familyName: string | null;
  },
  fallbackFirstName: string,
): { firstName: string; lastName: string } {
  let first = user.givenName ?? "";
  let last = user.familyName ?? "";
  if (!first || !last) {
    const parts = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
    if (!first) first = parts[0] ?? "";
    if (!last) last = parts.slice(1).join(" ");
  }
  if (!first) first = user.email.split("@")[0];
  return {
    firstName: sanitizeName(first) || fallbackFirstName,
    lastName: sanitizeName(last) || "User",
  };
}
