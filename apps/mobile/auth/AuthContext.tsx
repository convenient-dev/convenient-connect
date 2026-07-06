import { setOnUnauthorized } from "@/api/client";
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
  providerType: "individual" | "business" | null;
  profileImage: string | null;
  backgroundVerification: boolean;
  businessVerification: boolean;
  business?: {
    userId: number;
    businessName: string;
    address: string;
    businessVerification: boolean;
    about: string | null;
  } | null;
}

interface AuthState {
  token: string | null;
  user: AuthUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, profile: AuthUserProfile) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (profile: AuthUserProfile) => void;
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

          // Validate profile data
          if (!profile.user || !profile.user.id) {
            console.log("[AUTH] Invalid profile data (user is null/undefined), clearing token");
            throw new Error("Invalid profile data");
          }

          console.log("[AUTH] User profile loaded:", profile.user.email);
          setUser(profile);
        } catch (error) {
          console.log("[AUTH] Failed to load profile, clearing token:", error);
          await clearToken();
          setTokenState(null);
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
    }
  }, [token, segments, isLoading, router]);

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
      login,
      logout,
      setUser,
    }),
    [token, user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
