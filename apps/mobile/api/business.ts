import { laravelFetch } from "./client";
import type { components } from "./generated/api-types";

type ProviderBusinessModel = components["schemas"]["ProviderBusinessModel"];

const BUSINESS_PREFIX = "/service-provider/business";
const MEMBERS_PREFIX = "/service-provider/business-members";

export interface BusinessProfile {
  providerType: "individual" | "business" | null;
  business: ProviderBusinessModel | null;
}

// ---------------------------------------------------------------------------
// Business Profile CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new business profile for the authenticated provider.
 * Providers can optionally add business profiles to their account.
 */
export async function addBusinessProfile(params: {
  businessName: string;
  businessAddress: string;
  about: string | null;
  countryId: number;
  stateId: number;
  cityId: number;
  zipcode?: string | null;
  businessDocuments?: File | Blob;
  governmentIssuedId?: File | Blob;
  businessEin?: string | null;
  serviceSubCategoryIds: number[];
}): Promise<any> {
  const formData = new FormData();
  formData.append("business_name", params.businessName);
  formData.append("business_address", params.businessAddress);
  if (params.about) formData.append("about", params.about);
  formData.append("country_id", params.countryId.toString());
  formData.append("state_id", params.stateId.toString());
  formData.append("city_id", params.cityId.toString());
  if (params.zipcode) formData.append("zipcode", params.zipcode);
  if (params.businessDocuments) {
    formData.append("business_documents", params.businessDocuments);
  }
  if (params.governmentIssuedId) {
    formData.append("government_issued_id", params.governmentIssuedId);
  }
  if (params.businessEin) formData.append("business_ein", params.businessEin);
  params.serviceSubCategoryIds.forEach((id) => {
    formData.append("service_sub_category_ids[]", id.toString());
  });

  return laravelFetch<any>(`${BUSINESS_PREFIX}/add`, {
    method: "POST",
    body: formData,
    isFormData: true,
  });
}

/**
 * Update an existing business profile.
 */
export async function updateBusinessProfile(
  businessId: number,
  params: {
    businessName: string;
    businessAddress: string;
    about: string | null;
    countryId: number;
    stateId: number;
    cityId: number;
    zipcode?: string | null;
    businessDocuments?: File | Blob;
    governmentIssuedId?: File | Blob;
    businessEin?: string | null;
    serviceSubCategoryIds: number[];
  },
): Promise<any> {
  const formData = new FormData();
  formData.append("business_name", params.businessName);
  formData.append("business_address", params.businessAddress);
  if (params.about) formData.append("about", params.about);
  formData.append("country_id", params.countryId.toString());
  formData.append("state_id", params.stateId.toString());
  formData.append("city_id", params.cityId.toString());
  if (params.zipcode) formData.append("zipcode", params.zipcode);
  if (params.businessDocuments) {
    formData.append("business_documents", params.businessDocuments);
  }
  if (params.governmentIssuedId) {
    formData.append("government_issued_id", params.governmentIssuedId);
  }
  if (params.businessEin) formData.append("business_ein", params.businessEin);
  params.serviceSubCategoryIds.forEach((id) => {
    formData.append("service_sub_category_ids[]", id.toString());
  });

  return laravelFetch<any>(`${BUSINESS_PREFIX}/update/${businessId}`, {
    method: "POST",
    body: formData,
    isFormData: true,
  });
}

/**
 * List all businesses for the authenticated provider.
 */
export async function listBusinesses(): Promise<any[]> {
  const data = await laravelFetch<{ businesses?: any[] }>(
    `${BUSINESS_PREFIX}/list`,
  );
  return data.businesses ?? [];
}

/**
 * Get a single business for editing.
 */
export async function getBusinessForEdit(businessId: number): Promise<any> {
  return laravelFetch<any>(`${BUSINESS_PREFIX}/edit/${businessId}`);
}

/**
 * Delete a business profile.
 */
export async function deleteBusiness(businessId: number): Promise<void> {
  await laravelFetch<void>(`${BUSINESS_PREFIX}/delete/${businessId}`, {
    method: "DELETE",
  });
}

/**
 * Toggle business status (active/inactive).
 */
export async function toggleBusinessStatus(
  businessId: number,
): Promise<boolean> {
  const data = await laravelFetch<{ status?: boolean }>(
    `${BUSINESS_PREFIX}/status/${businessId}`,
    { method: "POST" },
  );
  return data.status ?? false;
}

/**
 * Get service categories and subcategories.
 * @param search Optional search term to filter by category or subcategory name
 */
export async function getServiceCategories(search?: string): Promise<any[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  const data = await laravelFetch<{ categories?: any[] }>(
    `${BUSINESS_PREFIX}/services${params}`,
  );
  return data.categories ?? [];
}

/**
 * Get services assigned to a specific business.
 */
export async function getBusinessServices(businessId: number): Promise<any[]> {
  const data = await laravelFetch<{ services?: any[] }>(
    `${BUSINESS_PREFIX}/${businessId}/services`,
  );
  return data.services ?? [];
}

// ---------------------------------------------------------------------------
// Business Members Management
// ---------------------------------------------------------------------------

/**
 * Invite a member to join a business.
 */
export async function inviteBusinessMember(params: {
  email: string;
  roleId: number;
}): Promise<any> {
  return laravelFetch<any>(`${MEMBERS_PREFIX}/invite`, {
    method: "POST",
    body: params,
  });
}

/**
 * List all business members.
 */
export async function listBusinessMembers(): Promise<any[]> {
  const data = await laravelFetch<{ members?: any[] }>(`${MEMBERS_PREFIX}`);
  return data.members ?? [];
}

/**
 * Get a specific business member.
 */
export async function getBusinessMember(memberId: number): Promise<any> {
  return laravelFetch<any>(`${MEMBERS_PREFIX}/${memberId}`);
}

/**
 * Resend invitation to a business member.
 */
export async function resendMemberInvitation(memberId: number): Promise<void> {
  await laravelFetch<void>(`${MEMBERS_PREFIX}/${memberId}/resend-invitation`, {
    method: "POST",
  });
}

/**
 * Get services assigned to a business member.
 */
export async function getMemberServices(memberId: number): Promise<any[]> {
  const data = await laravelFetch<{ services?: any[] }>(
    `${MEMBERS_PREFIX}/${memberId}/services`,
  );
  return data.services ?? [];
}

/**
 * Assign or update services for a business member.
 */
export async function updateMemberServices(
  memberId: number,
  serviceSubCategoryId: number,
  params: any,
): Promise<any> {
  return laravelFetch<any>(
    `${MEMBERS_PREFIX}/${memberId}/services/${serviceSubCategoryId}`,
    {
      method: "POST",
      body: params,
    },
  );
}
