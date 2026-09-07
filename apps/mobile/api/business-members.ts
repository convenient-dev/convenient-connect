import { laravelFetch, toAbsoluteUrl } from "./client";
import type { components } from "./generated/api-types";

const MEMBERS_PREFIX = "/service-provider/business-members";

// ---------------------------------------------------------------------------
// Types (from generated OpenAPI schemas)
// ---------------------------------------------------------------------------

export type BusinessMember = components["schemas"]["BusinessMemberModel"];
export type BusinessMemberSubCategory =
  components["schemas"]["BusinessMemberSubCategoryModel"];
export type BusinessMemberStatus = NonNullable<BusinessMember["status"]>;

export type BusinessMemberInviteRequest =
  components["schemas"]["BusinessMemberInviteRequest"];
export type BusinessMemberServiceAssignRequest =
  components["schemas"]["BusinessMemberServiceAssignRequest"];

type BusinessMembersListData = NonNullable<
  components["schemas"]["BusinessMembersListResponse"]["data"]
>;
type BusinessMemberServiceMutationData = NonNullable<
  components["schemas"]["BusinessMemberServiceMutationResponse"]["data"]
>;

export interface BusinessMembersList {
  activeCount: number;
  pendingCount: number;
  archiveCount: number;
  activeMembers: BusinessMember[];
  pendingMembers: BusinessMember[];
  archiveMembers: BusinessMember[];
}

export interface BusinessMemberServiceMutation {
  memberId: number;
  serviceSubCategoryId: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withBusinessId(path: string, businessId: number): string {
  const params = new URLSearchParams({ business_id: businessId.toString() });
  return `${path}?${params.toString()}`;
}

function mapSubCategory(
  sub: BusinessMemberSubCategory,
): BusinessMemberSubCategory {
  return {
    ...sub,
    sub_category_icon: toAbsoluteUrl(sub.sub_category_icon ?? null),
    sub_category_banner: toAbsoluteUrl(sub.sub_category_banner ?? null),
  };
}

// The live API prefixes member fields with `member_` (member_id, member_name,
// member_email, member_status) while the OpenAPI schema documents them
// unprefixed. Accept both so a schema fix on the backend won't break us.
type RawBusinessMember = BusinessMember & {
  member_id?: number;
  member_name?: string | null;
  member_email?: string | null;
  member_status?: BusinessMember["status"];
};

function mapMember(raw: RawBusinessMember): BusinessMember {
  const { member_id, member_name, member_email, member_status, ...rest } = raw;
  return {
    ...rest,
    id: rest.id ?? member_id,
    name: rest.name ?? member_name ?? null,
    email: rest.email ?? member_email ?? undefined,
    status: rest.status ?? member_status,
    // Returned preformatted (e.g. "Sep 07, 2026"), not as an ISO timestamp.
    joined_at: rest.joined_at ?? null,
    assigned_service_sub_categories: (
      rest.assigned_service_sub_categories ?? []
    ).map(mapSubCategory),
  };
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

/**
 * List active, pending and archived members of a business.
 */
export async function listBusinessMembers(
  businessId: number,
): Promise<BusinessMembersList> {
  const data = await laravelFetch<BusinessMembersListData>(
    withBusinessId(MEMBERS_PREFIX, businessId),
  );

  return {
    activeCount: data?.active_count ?? 0,
    pendingCount: data?.pending_count ?? 0,
    archiveCount: data?.archive_count ?? 0,
    activeMembers: (data?.active_members ?? []).map(mapMember),
    pendingMembers: (data?.pending_members ?? []).map(mapMember),
    archiveMembers: (data?.archive_members ?? []).map(mapMember),
  };
}

/**
 * Get one member of a business, including joined_at and assigned services.
 */
export async function getBusinessMember(
  businessId: number,
  memberId: number,
): Promise<BusinessMember> {
  const data = await laravelFetch<BusinessMember>(
    withBusinessId(`${MEMBERS_PREFIX}/${memberId}`, businessId),
  );
  return mapMember(data);
}

/**
 * Invite a member to a business by email. The invitee must already have a
 * provider (role_id=3) account. The invitation link expires in 7 days.
 */
export async function inviteBusinessMember(params: {
  businessId: number;
  email: string;
  serviceSubCategoryIds: number[];
  message?: string | null;
}): Promise<void> {
  const body: BusinessMemberInviteRequest = {
    business_id: params.businessId,
    email: params.email,
    service_sub_category_ids: params.serviceSubCategoryIds,
    message: params.message ?? null,
  };

  await laravelFetch<unknown>(`${MEMBERS_PREFIX}/invite`, {
    method: "POST",
    body,
  });
}

/**
 * Resend the invitation email for a pending member and extend its expiry
 * by 7 days. Fails with 422 if the member is not pending.
 */
export async function resendBusinessMemberInvitation(
  memberId: number,
): Promise<void> {
  await laravelFetch<unknown>(
    `${MEMBERS_PREFIX}/${memberId}/resend-invitation`,
    { method: "POST" },
  );
}

/**
 * Soft-remove a member from a business (status becomes "deleted").
 */
export async function removeBusinessMember(
  businessId: number,
  memberId: number,
): Promise<void> {
  await laravelFetch<unknown>(
    withBusinessId(`${MEMBERS_PREFIX}/${memberId}`, businessId),
    { method: "DELETE" },
  );
}

// ---------------------------------------------------------------------------
// Member services
// ---------------------------------------------------------------------------

/**
 * Assign one service sub-category to a member. The sub-category must already
 * be assigned to the business.
 */
export async function addBusinessMemberService(
  businessId: number,
  memberId: number,
  serviceSubCategoryId: number,
): Promise<BusinessMemberServiceMutation> {
  const body: BusinessMemberServiceAssignRequest = {
    business_id: businessId,
    service_sub_category_id: serviceSubCategoryId,
  };

  const data = await laravelFetch<BusinessMemberServiceMutationData>(
    `${MEMBERS_PREFIX}/${memberId}/services`,
    { method: "POST", body },
  );

  return {
    memberId: data?.member_id ?? memberId,
    serviceSubCategoryId: data?.service_sub_category_id ?? serviceSubCategoryId,
  };
}

/**
 * Remove one assigned service sub-category from a member.
 */
export async function removeBusinessMemberService(
  businessId: number,
  memberId: number,
  serviceSubCategoryId: number,
): Promise<BusinessMemberServiceMutation> {
  const data = await laravelFetch<BusinessMemberServiceMutationData>(
    withBusinessId(
      `${MEMBERS_PREFIX}/${memberId}/services/${serviceSubCategoryId}`,
      businessId,
    ),
    { method: "DELETE" },
  );

  return {
    memberId: data?.member_id ?? memberId,
    serviceSubCategoryId: data?.service_sub_category_id ?? serviceSubCategoryId,
  };
}
