import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { deriveNames } from "./names";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({
    // iOS requires an explicit client ID since we don't bundle GoogleService-Info.plist
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  configured = true;
}

export type GoogleSignInResult =
  | { status: "success"; email: string; firstName: string; lastName: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  ensureConfigured();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      return { status: "cancelled" };
    }
    const { user } = response.data;
    return {
      status: "success",
      email: user.email,
      ...deriveNames(user, "Google"),
    };
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.IN_PROGRESS) {
        return { status: "cancelled" };
      }
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          status: "error",
          message: "Google Play Services is not available on this device.",
        };
      }
    }
    return {
      status: "error",
      message: "Google sign-in failed. Please try again.",
    };
  }
}

/** Clears the cached Google session so the account picker reappears on retry. */
export async function googleSignOutQuietly(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // best-effort
  }
}
