import { laravelFetch, LARAVEL_API_BASE_URL } from "./client";
import type { components } from "./generated/api-types";
import type { AuthUserProfile } from "@/auth/AuthContext";

type AuthUser = components["schemas"]["AuthUser"];
type AuthUserProfileData = components["schemas"]["AuthUserProfileData"];
type ProviderProfileData = components["schemas"]["ProviderProfileData"];

const LARAVEL_HOST = LARAVEL_API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

function toAbsoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${LARAVEL_HOST}${path}`;
}

function mapAuthUserProfile(data: AuthUserProfileData): AuthUserProfile {
  return {
    user: data.user!,
    providerType: (data.provider_type as AuthUserProfile["providerType"]) ?? null,
    profileImage: toAbsoluteUrl(data.profile_image),
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

// ---------------------------------------------------------------------------
// Account Settings
// ---------------------------------------------------------------------------

const SETTINGS_PREFIX = "/service-provider/account-settings";

export async function updateName(
  firstName: string,
  lastName: string,
): Promise<AuthUser> {
  return laravelFetch<AuthUser>(`${SETTINGS_PREFIX}/update-name`, {
    method: "POST",
    body: { first_name: firstName, last_name: lastName },
  });
}

export async function getAboutMe(): Promise<string | null> {
  const data = await laravelFetch<{ about_me?: string | null }>(
    `${SETTINGS_PREFIX}/about-me`,
  );
  return data.about_me ?? null;
}

export async function updateAboutMe(aboutMe: string): Promise<string | null> {
  const data = await laravelFetch<{ about_me?: string | null }>(
    `${SETTINGS_PREFIX}/about-me`,
    { method: "POST", body: { about_me: aboutMe } },
  );
  return data.about_me ?? null;
}

export async function updateProfileImage(
  formData: FormData,
): Promise<string | null> {
  const data = await laravelFetch<{ profile_image?: string | null }>(
    `${SETTINGS_PREFIX}/profile-image`,
    { method: "POST", body: formData, isFormData: true },
  );
  return toAbsoluteUrl(data.profile_image);
}

export async function requestPhoneOtp(phone: string): Promise<void> {
  await laravelFetch<unknown>(`${SETTINGS_PREFIX}/update-phone/request-otp`, {
    method: "POST",
    body: { phone_number: phone },
  });
}

export async function verifyPhoneOtp(
  phone: string,
  otp: string,
): Promise<AuthUser> {
  return laravelFetch<AuthUser>(`${SETTINGS_PREFIX}/update-phone/verify-otp`, {
    method: "POST",
    body: { phone_number: phone, otp },
  });
}

export async function resendPhoneOtp(phone: string): Promise<void> {
  await laravelFetch<unknown>(`${SETTINGS_PREFIX}/update-phone/resend-otp`, {
    method: "POST",
    body: { phone_number: phone },
  });
}

export async function requestEmailOtp(email: string): Promise<void> {
  await laravelFetch<unknown>(`${SETTINGS_PREFIX}/update-email/request-otp`, {
    method: "POST",
    body: { email },
  });
}

export async function verifyEmailOtp(
  email: string,
  otp: string,
): Promise<AuthUser> {
  return laravelFetch<AuthUser>(`${SETTINGS_PREFIX}/update-email/verify-otp`, {
    method: "POST",
    body: { email, otp },
  });
}

export async function resendEmailOtp(email: string): Promise<void> {
  await laravelFetch<unknown>(`${SETTINGS_PREFIX}/update-email/resend-otp`, {
    method: "POST",
    body: { email },
  });
}

export async function submitBackgroundCheck(): Promise<boolean> {
  const data = await laravelFetch<{ background_verification?: boolean }>(
    `${SETTINGS_PREFIX}/background-check`,
    { method: "POST" },
  );
  return data.background_verification ?? false;
}

// ---------------------------------------------------------------------------
// Account Deletion
// ---------------------------------------------------------------------------

export type DeleteAccountChannel = "phone" | "email";

/**
 * Sends a delete-account OTP to the authenticated user's phone or email.
 * Returns the destination the OTP was delivered to.
 */
export async function sendDeleteAccountOtp(
  deliveryType: DeleteAccountChannel,
): Promise<string> {
  const data = await laravelFetch<{ sent_to?: string }>(
    "/service-provider/send-delete-account-otp",
    { method: "POST", body: { delivery_type: deliveryType } },
  );
  return data.sent_to ?? "";
}

/**
 * Verifies the delete-account OTP and permanently deactivates the account.
 * On success the backend revokes all tokens, so callers must clear local auth.
 */
export async function deleteUserAccount(
  otp: string,
  deliveryType: DeleteAccountChannel,
  deviceToken?: string,
): Promise<void> {
  await laravelFetch<string>("/service-provider/delete-user-acount", {
    method: "POST",
    body: { otp, delivery_type: deliveryType, device_token: deviceToken },
  });
}
