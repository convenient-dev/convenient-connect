/**
 * Business invite codes (invite-by-code).
 *
 * Owners create 5-character, one-time codes that grant a set of the
 * business's services; any signed-in provider can redeem one to join as an
 * active member. This is separate from the email invite flow in
 * `business-members.ts`.
 *
 * Endpoints are documented in `api-doc.json` and in
 * `service-provider-invite-by-code-api-guide.md`.
 */
import { buildQuery, laravelFetch } from "./client";
import type { components } from "./generated/api-types";

const CODES_PREFIX = "/service-provider/business-invite-codes";

// ---------------------------------------------------------------------------
// Types (from generated OpenAPI schemas)
// ---------------------------------------------------------------------------

type InviteCodeModel = components["schemas"]["BusinessInviteCodeModel"];
type InviteCodeCreateRequest =
  components["schemas"]["BusinessInviteCodeCreateRequest"];
type InviteCodeRedeemRequest =
  components["schemas"]["BusinessInviteCodeRedeemRequest"];

export type InviteCodeStatus = NonNullable<InviteCodeModel["status"]>;

export interface InviteCodeService {
  sub_category_id: number;
  sub_category_name: string;
}

/** A code with the schema's optional fields normalized for the screens. */
export interface InviteCode {
  id: number;
  business_id: number;
  business_name: string;
  /** Owner-facing label for the intended person, e.g. "Weekend barbers". */
  name: string;
  /** Server-generated 5-character code, e.g. "HTMX8". */
  code: string;
  /** Computed by the API: `used` wins over the clock, `expired` is unused and past `expires_at`. */
  status: InviteCodeStatus;
  /** Public join URL for this code (`{INVITE_CODE_JOIN_URL}/{code}`). */
  link: string;
  expires_at: string | null;
  used_at: string | null;
  services: InviteCodeService[];
  /** `max(0, services.length - 2)`, for a "+N" chip after the first two names. */
  extra_services_count: number;
}

export interface InviteCodeList {
  activeCount: number;
  usedCount: number;
  expiredCount: number;
  totalCount: number;
  /** `status === "active"`: unused and not past `expires_at`. */
  active: InviteCode[];
  /** `status === "used"` or `"expired"`, newest first. */
  used: InviteCode[];
}

/**
 * Redeem response. `joined_at` is preformatted ("Oct 22, 2026"), not ISO,
 * and `sub_categories` are names. Not documented as a schema in
 * `api-doc.json`; the shape comes from the integration guide (section 8).
 */
export interface InviteCodeRedeemResult {
  business_member_id: number;
  business_id: number;
  business_name: string;
  joined_at: string;
  sub_categories: string[];
  invite_code: string;
}

/**
 * List response `data`. Not documented as a schema in `api-doc.json`; the
 * shape comes from the integration guide (section 5).
 */
interface InviteCodeListData {
  active_count?: number;
  used_count?: number;
  expired_count?: number;
  total_count?: number;
  codes?: InviteCodeModel[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const INVITE_CODE_LENGTH = 5;

/**
 * Mirrors the server's input normalization: strip non-alphanumerics and
 * uppercase. The API accepts un-normalized input too; this keeps the field
 * display consistent while typing.
 */
export function normalizeInviteCode(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function mapInviteCode(raw: InviteCodeModel): InviteCode {
  return {
    id: raw.id ?? 0,
    business_id: raw.business_id ?? 0,
    business_name: raw.business_name ?? "",
    name: raw.name ?? "",
    code: raw.code ?? "",
    status: raw.status ?? "active",
    link: raw.link ?? "",
    expires_at: raw.expires_at ?? null,
    used_at: raw.used_at ?? null,
    services: (raw.services ?? []).map((s) => ({
      sub_category_id: s.sub_category_id ?? 0,
      sub_category_name: s.sub_category_name ?? "",
    })),
    extra_services_count: raw.extra_services_count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Owner
// ---------------------------------------------------------------------------

/**
 * List every invite code of an owned business, split into active and
 * used/expired. Counts describe the whole business. 404 if the caller does
 * not own the business.
 */
export async function listInviteCodes(
  businessId: number,
): Promise<InviteCodeList> {
  const data = await laravelFetch<InviteCodeListData>(
    `${CODES_PREFIX}${buildQuery({ business_id: businessId })}`,
  );
  const codes = (data?.codes ?? []).map(mapInviteCode);

  return {
    activeCount: data?.active_count ?? 0,
    usedCount: data?.used_count ?? 0,
    expiredCount: data?.expired_count ?? 0,
    totalCount: data?.total_count ?? 0,
    active: codes.filter((c) => c.status === "active"),
    used: codes.filter((c) => c.status !== "active"),
  };
}

/**
 * Create a one-time code valid for 48 hours that grants the given services.
 * The services must belong to the business. Requires an operational (not
 * suspended) provider account.
 */
export async function createInviteCode(params: {
  businessId: number;
  name: string;
  serviceSubCategoryIds: number[];
}): Promise<InviteCode> {
  const body: InviteCodeCreateRequest = {
    business_id: params.businessId,
    name: params.name,
    service_sub_category_ids: params.serviceSubCategoryIds,
  };
  const data = await laravelFetch<InviteCodeModel>(CODES_PREFIX, {
    method: "POST",
    body,
  });
  return mapInviteCode(data);
}

// ---------------------------------------------------------------------------
// Invitee
// ---------------------------------------------------------------------------

/**
 * Validate a code without consuming it. Fails with the same user-facing
 * messages as redeem ("Invalid code.", "This code has expired.", ...).
 */
export async function previewInviteCode(code: string): Promise<InviteCode> {
  const body: InviteCodeRedeemRequest = { code: normalizeInviteCode(code) };
  const data = await laravelFetch<InviteCodeModel>(`${CODES_PREFIX}/preview`, {
    method: "POST",
    body,
  });
  return mapInviteCode(data);
}

/**
 * Join the code's business as an active member and mark the code used.
 * Requires an operational (not suspended) provider account.
 */
export async function redeemInviteCode(
  code: string,
): Promise<InviteCodeRedeemResult> {
  const body: InviteCodeRedeemRequest = { code: normalizeInviteCode(code) };
  const data = await laravelFetch<Partial<InviteCodeRedeemResult>>(
    `${CODES_PREFIX}/redeem`,
    { method: "POST", body },
  );
  return {
    business_member_id: data?.business_member_id ?? 0,
    business_id: data?.business_id ?? 0,
    business_name: data?.business_name ?? "",
    joined_at: data?.joined_at ?? "",
    sub_categories: data?.sub_categories ?? [],
    invite_code: data?.invite_code ?? normalizeInviteCode(code),
  };
}
