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
  businessDocuments?: File | Blob | { uri: string; name: string; type: string };
  governmentIssuedId?:
    | File
    | Blob
    | { uri: string; name: string; type: string };
  businessEin?: string | null;
  serviceSubCategoryIds: number[];
  stripeAccountId?: string;
  stripeAccountLastFour?: string;
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
    formData.append("business_documents", params.businessDocuments as any);
  }
  if (params.governmentIssuedId) {
    formData.append("government_issued_id", params.governmentIssuedId as any);
  }
  if (params.businessEin) formData.append("business_ein", params.businessEin);
  params.serviceSubCategoryIds.forEach((id) => {
    formData.append("service_sub_category_ids[]", id.toString());
  });
  if (params.stripeAccountId) {
    formData.append("stripe_account_id", params.stripeAccountId);
  }
  if (params.stripeAccountLastFour) {
    formData.append("stripe_account_last_four", params.stripeAccountLastFour);
  }

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
    businessDocuments?:
      | File
      | Blob
      | { uri: string; name: string; type: string };
    governmentIssuedId?:
      | File
      | Blob
      | { uri: string; name: string; type: string };
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
    formData.append("business_documents", params.businessDocuments as any);
  }
  if (params.governmentIssuedId) {
    formData.append("government_issued_id", params.governmentIssuedId as any);
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
 * Get services assigned to a specific business.
 */
export async function getBusinessServices(businessId: number): Promise<any[]> {
  const data = await laravelFetch<{ services?: any[] }>(
    `${BUSINESS_PREFIX}/${businessId}/services`,
  );
  return data.services ?? [];
}
