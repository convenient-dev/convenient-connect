import { laravelFetch, toAbsoluteUrl } from "./client";
import type { components } from "./generated/api-types";

type OtpLoginData = components["schemas"]["OtpLoginData"];

export interface LoginResult {
  accessToken: string;
  user: components["schemas"]["AuthUser"];
  profileImage: string | null;
  backgroundVerification: "Pending" | "Verified" | "Not Verified";
}

function mapLoginData(data: OtpLoginData): LoginResult {
  return {
    accessToken: data.access_token!,
    user: data.user!,
    profileImage: toAbsoluteUrl(data.profile_image),
    backgroundVerification: (data.background_verification as "Pending" | "Verified" | "Not Verified") ?? "Pending",
  };
}

// email-signup/number-login/social logins return two shapes at HTTP 200:
// the normal OTP-sent payload, or (for a soft-deleted account) the
// restore_required payload with deletion dates — branch with isRestoreRequired().
export type OtpSentData = Partial<
  components["schemas"]["AccountDeletedRestoreRequiredData"]
>;

export function isRestoreRequired(
  result: LoginResult | OtpSentData,
): result is OtpSentData {
  return (result as OtpSentData).restore_required === true;
}

export async function emailSignup(params: {
  email: string;
  restore?: boolean;
  deviceToken?: string;
  deviceType?: "android" | "ios";
  referralCode?: string;
}): Promise<OtpSentData> {
  return laravelFetch<OtpSentData>(
    "/service-provider/auth/email-signup",
    {
      method: "POST",
      body: {
        email: params.email,
        restore: params.restore,
        device_token: params.deviceToken,
        device_type: params.deviceType,
        referral_code: params.referralCode,
      },
      skipAuth: true,
    },
  );
}

export async function confirmEmail(
  email: string,
  otp: string,
): Promise<LoginResult> {
  const data = await laravelFetch<OtpLoginData>(
    "/service-provider/auth/confirm-email",
    {
      method: "POST",
      body: { email, otp },
      skipAuth: true,
    },
  );
  return mapLoginData(data);
}

export async function resendOtpEmail(email: string): Promise<{ email: string }> {
  return laravelFetch<{ email: string }>(
    "/service-provider/auth/resend-otp-email",
    {
      method: "POST",
      body: { email },
      skipAuth: true,
    },
  );
}

export async function numberLogin(params: {
  phone: string;
  restore?: boolean;
  deviceToken?: string;
  deviceType?: "android" | "ios";
  referralCode?: string;
}): Promise<OtpSentData> {
  return laravelFetch<OtpSentData>(
    "/service-provider/auth/number-login",
    {
      method: "POST",
      body: {
        phone: params.phone,
        restore: params.restore,
        device_token: params.deviceToken,
        device_type: params.deviceType,
        referral_code: params.referralCode,
      },
      skipAuth: true,
    },
  );
}

export async function confirmNumber(
  phone: string,
  otp: string,
): Promise<LoginResult> {
  const data = await laravelFetch<OtpLoginData>(
    "/service-provider/auth/confirm-number",
    {
      method: "POST",
      body: { phone, otp },
      skipAuth: true,
    },
  );
  return mapLoginData(data);
}

export async function resendOtpNumber(phone: string): Promise<{ phone: string }> {
  return laravelFetch<{ phone: string }>(
    "/service-provider/auth/resend-otp-number",
    {
      method: "POST",
      body: { phone },
      skipAuth: true,
    },
  );
}

export async function facebookLogin(params: {
  email: string;
  firstName: string;
  lastName: string;
  restore?: boolean;
  deviceToken?: string;
  deviceType?: "android" | "ios";
  referralCode?: string;
}): Promise<LoginResult | OtpSentData> {
  const data = await laravelFetch<OtpLoginData | OtpSentData>(
    "/service-provider/auth/facebook-login",
    {
      method: "POST",
      body: {
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        restore: params.restore,
        device_token: params.deviceToken,
        device_type: params.deviceType,
        referral_code: params.referralCode,
      },
      skipAuth: true,
    },
  );
  if ((data as OtpSentData).restore_required) return data as OtpSentData;
  return mapLoginData(data as OtpLoginData);
}

export async function googleLogin(params: {
  email: string;
  firstName: string;
  lastName: string;
  restore?: boolean;
  deviceToken?: string;
  deviceType?: "android" | "ios";
  referralCode?: string;
}): Promise<LoginResult | OtpSentData> {
  const data = await laravelFetch<OtpLoginData | OtpSentData>(
    "/service-provider/auth/google-login",
    {
      method: "POST",
      body: {
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        restore: params.restore,
        device_token: params.deviceToken,
        device_type: params.deviceType,
        referral_code: params.referralCode,
      },
      skipAuth: true,
    },
  );
  if ((data as OtpSentData).restore_required) return data as OtpSentData;
  return mapLoginData(data as OtpLoginData);
}

export async function appleLogin(params: {
  appleUserId: string;
  restore?: boolean;
  deviceToken?: string;
  deviceType?: "android" | "ios";
  referralCode?: string;
}): Promise<LoginResult | OtpSentData> {
  const data = await laravelFetch<OtpLoginData | OtpSentData>(
    "/service-provider/auth/apple-login",
    {
      method: "POST",
      body: {
        apple_user_id: params.appleUserId,
        restore: params.restore,
        device_token: params.deviceToken,
        device_type: params.deviceType,
        referral_code: params.referralCode,
      },
      skipAuth: true,
    },
  );
  if ((data as OtpSentData).restore_required) return data as OtpSentData;
  return mapLoginData(data as OtpLoginData);
}

// Permanent-delete endpoints are public (no bearer token): they act on a
// soft-deleted account the user can no longer log into. Email only — the
// backend has no phone variant.
export async function sendPermanentDeleteOtp(
  email: string,
): Promise<{ sent_to: string }> {
  return laravelFetch<{ sent_to: string }>(
    "/service-provider/auth/send-permanent-delete-otp",
    {
      method: "POST",
      body: { email },
      skipAuth: true,
    },
  );
}

export async function confirmPermanentDeleteOtp(
  email: string,
  otp: string,
): Promise<void> {
  await laravelFetch<string>(
    "/service-provider/auth/confirm-permanent-delete-otp",
    {
      method: "POST",
      body: { email, otp },
      skipAuth: true,
    },
  );
}

export async function logout(deviceToken?: string): Promise<void> {
  await laravelFetch<string>("/service-provider/auth/logout", {
    method: "POST",
    body: deviceToken ? { device_token: deviceToken } : undefined,
  });
}
