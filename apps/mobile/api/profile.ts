import { laravelFetch } from "./client";
import type { components } from "./generated/api-types";
import type { AuthUserProfile } from "@/auth/AuthContext";

type AuthUserProfileData = components["schemas"]["AuthUserProfileData"];
type ProviderProfileData = components["schemas"]["ProviderProfileData"];

function mapAuthUserProfile(data: AuthUserProfileData): AuthUserProfile {
  return {
    user: data.user!,
    providerType: (data.provider_type as AuthUserProfile["providerType"]) ?? null,
    profileImage: data.profile_image ?? null,
    backgroundVerification: data.background_verification ?? false,
    businessVerification: data.business_verification ?? false,
    business: data.business
      ? {
          userId: data.business.user_id!,
          businessName: data.business.business_name!,
          address: data.business.address!,
          businessVerification: data.business.business_verification ?? false,
          about: data.business.about ?? null,
        }
      : null,
  };
}

export async function getAuthUser(): Promise<AuthUserProfile> {
  const data = await laravelFetch<AuthUserProfileData>(
    "/service-provider/auth-user",
  );
  return mapAuthUserProfile(data);
}

export async function completeProfile(params: {
  providerType: "individual" | "business";
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  businessName?: string;
  businessAddress?: string;
  countryId?: number;
  stateId?: number;
  cityId?: number;
  zipcode?: string;
}): Promise<{ user: components["schemas"]["AuthUser"]; providerType: string }> {
  const data = await laravelFetch<ProviderProfileData>(
    "/service-provider/complete-profile",
    {
      method: "POST",
      body: {
        provider_type: params.providerType,
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
        phone_number: params.phoneNumber,
        business_name: params.businessName,
        business_address: params.businessAddress,
        country_id: params.countryId,
        state_id: params.stateId,
        city_id: params.cityId,
        zipcode: params.zipcode,
      },
    },
  );
  return {
    user: data.user!,
    providerType: data.provider_type!,
  };
}
