/**
 * Business invite codes.
 *
 * TODO: The Laravel API does not expose invite-code endpoints yet (see
 * docs/business-invite-flow.md for the expected design). Until it does, this
 * module keeps codes in memory for the current app session so the
 * "Invite Code" tab and the "Invite Codes" screen can be exercised end to end.
 * Swap the bodies of these functions for `laravelFetch` calls once the
 * endpoints exist; the screens only depend on the exported types.
 */

/** Public join URL shown on code cards and copied by "Copy link". */
export const INVITE_JOIN_BASE_URL = "https://convenientconnect.app/join";

/** Codes are valid for 48 hours per the design. */
export const INVITE_CODE_TTL_MS = 48 * 60 * 60 * 1000;

export interface InviteCodeService {
  sub_category_id: number;
  sub_category_name: string;
}

export interface InviteCode {
  id: number;
  business_id: number;
  /** Owner-facing label, e.g. "Weekend barbers". */
  name: string;
  /** Short shareable code, e.g. "HTMX8". */
  code: string;
  /** Public join URL for this code. */
  url: string;
  services: InviteCodeService[];
  created_at: string;
  expires_at: string;
}

export interface InviteCodeList {
  active: InviteCode[];
  expired: InviteCode[];
}

export function isInviteCodeExpired(code: InviteCode, now = Date.now()): boolean {
  return new Date(code.expires_at).getTime() <= now;
}

export function inviteCodeUrl(code: string): string {
  return `${INVITE_JOIN_BASE_URL}/${code}`;
}

// ---------------------------------------------------------------------------
// Session-only store (placeholder until the API exists)
// ---------------------------------------------------------------------------

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;

let nextId = 1;
const store: InviteCode[] = [];

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return store.some((c) => c.code === code) ? generateCode() : code;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List invite codes for a business, split into active and expired.
 */
export async function listInviteCodes(
  businessId: number,
): Promise<InviteCodeList> {
  const now = Date.now();
  const codes = store
    .filter((c) => c.business_id === businessId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    active: codes.filter((c) => !isInviteCodeExpired(c, now)),
    expired: codes.filter((c) => isInviteCodeExpired(c, now)),
  };
}

/**
 * Create a new 48-hour invite code that grants the given services.
 */
export async function createInviteCode(params: {
  businessId: number;
  name: string;
  services: InviteCodeService[];
}): Promise<InviteCode> {
  const createdAt = new Date();
  const code = generateCode();
  const record: InviteCode = {
    id: nextId++,
    business_id: params.businessId,
    name: params.name.trim(),
    code,
    url: inviteCodeUrl(code),
    services: params.services,
    created_at: createdAt.toISOString(),
    expires_at: new Date(createdAt.getTime() + INVITE_CODE_TTL_MS).toISOString(),
  };
  store.push(record);
  return record;
}

/**
 * Delete an invite code so it can no longer be used.
 */
export async function deleteInviteCode(codeId: number): Promise<void> {
  const index = store.findIndex((c) => c.id === codeId);
  if (index !== -1) store.splice(index, 1);
}
