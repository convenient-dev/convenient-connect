import { laravelFetch, toAbsoluteUrl } from "./client";
import type { components } from "./generated/api-types";
import type { AuthUserProfile } from "@/auth/AuthContext";

type AuthUser = components["schemas"]["AuthUser"];
type AuthUserProfileData = components["schemas"]["AuthUserProfileData"];
type ProviderProfileData = components["schemas"]["ProviderProfileData"];

function mapAuthUserProfile(data: AuthUserProfileData): AuthUserProfile {
  return {
    user: data.user!,
    profileImage: toAbsoluteUrl(data.profile_image),
    backgroundVerification: (data.background_verification as "Pending" | "Verified" | "Not Verified") ?? "Pending",
  };
}

export async function getAuthUser(): Promise<AuthUserProfile> {
  const data = await laravelFetch<AuthUserProfileData>(
    "/service-provider/auth-user",
  );
  console.log("[API] getAuthUser raw response:", {
    hasUser: !!data.user,
    userId: data.user?.user_id,
    hasProfileImage: !!data.profile_image,
    backgroundVerification: data.background_verification,
  });
  return mapAuthUserProfile(data);
}

export async function completeProfile(params: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
}): Promise<{ user: components["schemas"]["AuthUser"] }> {
  console.log("[API] completeProfile request:", params);

  // Build request body. Only include phone_number if it's a new phone being added.
  const body: Record<string, string> = {
    first_name: params.firstName,
    last_name: params.lastName,
    email: params.email,
  };

  // Only include phone_number if provided (for email signup flow)
  if (params.phoneNumber) {
    body.phone_number = params.phoneNumber;
  }

  console.log("[API] completeProfile body:", body);

  const data = await laravelFetch<ProviderProfileData>(
    "/service-provider/complete-profile",
    {
      method: "POST",
      body,
    },
  );
  console.log("[API] completeProfile response:", {
    hasUser: !!data.user,
    userId: data.user?.user_id,
  });
  return {
    user: data.user!,
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

export async function submitBackgroundCheck(): Promise<
  "Pending" | "Verified" | "Not Verified"
> {
  const data = await laravelFetch<{
    background_verification?: "Pending" | "Verified" | "Not Verified";
  }>(`${SETTINGS_PREFIX}/background-check`, { method: "POST" });
  return data.background_verification ?? "Pending";
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
  console.log("[API] deleteUserAccount called with:", {
    otp: otp.substring(0, 2) + "**",
    deliveryType,
    deviceToken: deviceToken ? "present" : "not provided",
  });
  const response = await laravelFetch<string>("/service-provider/delete-user-acount", {
    method: "POST",
    body: { otp, delivery_type: deliveryType, device_token: deviceToken },
  });
  console.log("[API] deleteUserAccount backend response:", response);
  console.log("[API] deleteUserAccount completed successfully");
}
