import { Platform } from "react-native";
import {
  GraphRequest,
  GraphRequestManager,
  LoginManager,
  Profile,
  Settings,
} from "react-native-fbsdk-next";
import { deriveNames } from "./names";

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  // isAutoInitEnabled is false in app.json, so the SDK must be initialized here
  Settings.initializeSDK();
  initialized = true;
}

export type FacebookSignInResult =
  | { status: "success"; email: string; firstName: string; lastName: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

interface GraphProfile {
  email?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
}

// Classic-login fallback (Android / iOS with tracking): limited login on iOS
// has no Graph API access, but there Profile.getCurrentProfile() carries email.
function fetchGraphProfile(): Promise<GraphProfile | null> {
  return new Promise((resolve) => {
    const request = new GraphRequest(
      "/me",
      { parameters: { fields: { string: "email,first_name,last_name,name" } } },
      (error, result) => {
        resolve(error || !result ? null : (result as GraphProfile));
      },
    );
    new GraphRequestManager().addRequest(request).start();
  });
}

export async function signInWithFacebook(): Promise<FacebookSignInResult> {
  ensureInitialized();
  try {
    const result = await LoginManager.logInWithPermissions(
      ["public_profile", "email"],
      Platform.OS === "ios" ? "limited" : undefined,
    );
    if (result.isCancelled) {
      return { status: "cancelled" };
    }

    const profile = await Profile.getCurrentProfile();
    let email = profile?.email ?? null;
    let firstName = profile?.firstName ?? null;
    let lastName = profile?.lastName ?? null;
    let fullName = profile?.name ?? null;

    if (!email) {
      const graph = await fetchGraphProfile();
      email = graph?.email ?? null;
      firstName = firstName ?? graph?.first_name ?? null;
      lastName = lastName ?? graph?.last_name ?? null;
      fullName = fullName ?? graph?.name ?? null;
    }

    if (!email) {
      await facebookSignOutQuietly();
      return {
        status: "error",
        message:
          "We couldn't get an email address from your Facebook account. Please allow email access or sign up another way.",
      };
    }

    return {
      status: "success",
      email,
      ...deriveNames(
        { name: fullName, email, givenName: firstName, familyName: lastName },
        "Facebook",
      ),
    };
  } catch {
    return {
      status: "error",
      message: "Facebook sign-in failed. Please try again.",
    };
  }
}

/** Clears the cached Facebook session so a fresh login is possible on retry. */
export async function facebookSignOutQuietly(): Promise<void> {
  try {
    LoginManager.logOut();
  } catch {
    // best-effort
  }
}
