import { laravelFetch } from "./client";
import type { components } from "./generated/api-types";

type ProviderBusinessModel = components["schemas"]["ProviderBusinessModel"];

const PREFIX = "/service-provider/account-settings/business";

export interface BusinessProfile {
  providerType: "individual" | "business" | null;
  business: ProviderBusinessModel | null;
}

export async function setProviderType(
  params: components["schemas"]["ProviderBusinessTypeRequest"],
): Promise<BusinessProfile> {
  const data = await laravelFetch<{
    provider_type?: "individual" | "business" | null;
    business?: ProviderBusinessModel;
  }>(`${PREFIX}/provider-type`, { method: "POST", body: params });
  return {
    providerType: data.provider_type ?? null,
    business: data.business ?? null,
  };
}

export async function getBusinessProfile(): Promise<BusinessProfile> {
  const data = await laravelFetch<{
    provider_type?: "individual" | "business" | null;
    business?: ProviderBusinessModel;
  }>(`${PREFIX}/profile`);
  return {
    providerType: data.provider_type ?? null,
    business: data.business ?? null,
  };
}

export async function getBusinessAbout(): Promise<string | null> {
  const data = await laravelFetch<{ about?: string | null }>(
    `${PREFIX}/about`,
  );
  return data.about ?? null;
}

export async function updateBusinessAbout(
  about: string,
): Promise<string | null> {
  const data = await laravelFetch<{ about?: string | null }>(
    `${PREFIX}/about`,
    { method: "POST", body: { about } },
  );
  return data.about ?? null;
}

export async function updateBusinessName(
  businessName: string,
): Promise<string> {
  const data = await laravelFetch<{ business_name?: string }>(
    `${PREFIX}/name`,
    { method: "POST", body: { business_name: businessName } },
  );
  return data.business_name ?? businessName;
}

export async function updateBusinessAddress(
  businessAddress: string,
): Promise<string> {
  const data = await laravelFetch<{ address?: string }>(
    `${PREFIX}/address`,
    { method: "POST", body: { business_address: businessAddress } },
  );
  return data.address ?? businessAddress;
}

export async function verifyBusinessAccount(): Promise<boolean> {
  const data = await laravelFetch<{ business_verification?: boolean }>(
    `${PREFIX}/verify-business-account`,
    { method: "POST" },
  );
  return data.business_verification ?? false;
}
