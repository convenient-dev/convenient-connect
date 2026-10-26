import {
  getAccountStatus,
  isSuspendedStatus,
  mapProviderAccountStatus,
  type ProviderAccountStatus,
  type ProviderStatusFields,
} from "@/api/account-status";
import { ApiError, setOnSuspended, setOnUnauthorized } from "@/api/client";
import type { components } from "@/api/generated/api-types";
import { useRouter, useSegments } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clearToken, getToken, setToken as storeToken } from "./token-store";

type AuthUser = components["schemas"]["AuthUser"];

export interface AuthUserProfile {
  user: AuthUser;
  profileImage: string | null;
  backgroundVerification: "Pending" | "Verified" | "Not Verified";
  /** Provider status and open suspension from login, auth-user or account-status. */
  accountStatus: ProviderAccountStatus;
}

interface AuthState {
  token: string | null;
  user: AuthUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /**
   * True while the provider account is suspended. The session stays valid and
   * reads keep working; marketplace writes are rejected with 403 by the API.
   */
  isSuspended: boolean;
  login: (token: string, profile: AuthUserProfile) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (profile: AuthUserProfile) => void;
  /** Re-reads `GET /account-status` into the session. Failures are ignored. */
  refreshAccountStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const logout = useCallback(async () => {
    console.log("[AUTH] Starting logout...");
    console.log("[AUTH] Clearing token from storage...");
    await clearToken();
    console.log("[AUTH] Token cleared from storage");
    setTokenState(null);
    setUser(null);
    console.log("[AUTH] Auth state cleared, logout complete");
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
  }, [logout]);

  const applyAccountStatus = useCallback((status: ProviderAccountStatus) => {
    setUser((current) => (current ? { ...current, accountStatus: status } : current));
  }, []);

  // A suspended 403 carries the current status, so sync it without refetching.
  useEffect(() => {
    setOnSuspended((data) => {
      applyAccountStatus(
        mapProviderAccountStatus(data as ProviderStatusFields | null),
      );
    });
  }, [applyAccountStatus]);

  const refreshAccountStatus = useCallback(async () => {
    try {
      applyAccountStatus(await getAccountStatus());
    } catch (error) {
      console.log("[AUTH] Failed to refresh account status:", error);
    }
  }, [applyAccountStatus]);

  useEffect(() => {
    (async () => {
      console.log("[AUTH] Checking for stored token on app start...");
      const storedToken = await getToken();
      if (storedToken) {
        console.log("[AUTH] Found stored token, fetching user profile...");
        setTokenState(storedToken);
        try {
          const { getAuthUser } = await import("@/api/profile");
          const profile = await getAuthUser();

          console.log("[AUTH] getAuthUser() returned:", {
            hasUser: !!profile.user,
            userId: profile.user?.user_id,
            userFname: profile.user?.user_fname,
            userLname: profile.user?.user_lname,
            backgroundVerification: profile.backgroundVerification,
            hasEmail: !!profile.user?.user_email,
            hasPhone: !!profile.user?.user_contact,
          });

          // Validate profile data - check user_id not id
          if (!profile.user || !profile.user.user_id) {
            console.log("[AUTH] Invalid profile data, user_id missing:", profile.user?.user_id);
            throw new Error("Invalid profile data");
          }

          console.log("[AUTH] User profile loaded:", profile.user.user_email);
          setUser(profile);
        } catch (error) {
          // A 401 already cleared the token in laravelFetch and fired logout.
          // Any other failure (offline, timeout, 5xx) keeps the token so the
          // user stays signed in and the next request retries.
          console.log("[AUTH] Failed to load profile on app start:", error);
          if (error instanceof ApiError && error.statusCode === 401) {
            setTokenState(null);
          }
        }
      } else {
        console.log("[AUTH] No stored token found");
      }
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    // Public routes are the welcome screen (index, no first segment) and the
    // pre-account flow, which all live in the (onboarding) route group.
    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = !firstSegment || firstSegment === "(onboarding)";

    if (!token && !inAuthGroup) {
      router.replace("/");
      return;
    }

    // Cold start lands on the welcome screen. Send a restored session with a
    // completed profile to the tabs; onboarding screens handle the rest.
    const hasCompletedProfile =
      !!user?.user.user_fname?.trim() && !!user?.user.user_lname?.trim();
    if (token && !firstSegment && hasCompletedProfile) {
      router.replace("/(tabs)/home");
    }
  }, [token, user, segments, isLoading, router]);

  const login = useCallback(
    async (newToken: string, profile: AuthUserProfile) => {
      await storeToken(newToken);
      setTokenState(newToken);
      setUser(profile);
    },
    [],
  );

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      isAuthenticated: !!token && !!user,
      isLoading,
      isSuspended: isSuspendedStatus(user?.accountStatus),
      login,
      logout,
      setUser,
      refreshAccountStatus,
    }),
    [token, user, isLoading, login, logout, refreshAccountStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
