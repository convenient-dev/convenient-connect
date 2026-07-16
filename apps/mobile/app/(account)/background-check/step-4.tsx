import { Button } from "@/components/Button";
import { Colors } from "@/constants/theme";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { background, text, neutral, primary } = Colors;

const WEB_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api"
).replace(/\/api\/?$/, "");

type AccountStatus = {
  readyToReceivePayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string | null;
};

export default function BackgroundCheck4Screen() {
  const router = useRouter();
  // accountId is forwarded from background-check-3 after the user creates
  // their connected account. The webhook keeps Stripe state authoritative —
  // this screen just pulls the latest snapshot on mount / on refresh.
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();

  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!accountId) {
      // No account id (e.g. screen opened directly) — nothing to check.
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${WEB_BASE_URL}/api/stripe/accounts/${accountId}/status`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load status");
      setStatus(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  function handleDone() {
    // Pop the whole background-check stack so it can't be surfaced later,
    // then switch to the profile tab. The `from` param drives the custom
    // back behavior on /profile (back goes to home with SideMenu open).
    router.dismissAll();
    router.navigate("/profile?from=background-check");
  }

  const verified =
    !!status?.onboardingComplete && !!status?.readyToReceivePayments;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <ExpoImage
          source={
            verified
              ? require("@/assets/global-icons/verified-success.png")
              : require("@/assets/global-icons/verified-success.png")
          }
          style={[styles.illustration, !verified && styles.illustrationMuted]}
          contentFit="contain"
        />

        {loading ? (
          <>
            <ActivityIndicator color={primary[300]} style={{ marginTop: 12 }} />
            <Text style={styles.message}>Checking verification status…</Text>
          </>
        ) : verified ? (
          <>
            <Text style={styles.title}>Verified</Text>
            <Text style={styles.message}>
              Your background check is complete.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Verification in progress</Text>
            <Text style={styles.message}>
              We&apos;re still waiting on Stripe to finish verifying your
              account. This usually takes just a few minutes — tap Refresh
              once you&apos;ve finished the steps in your browser.
            </Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <Button
              title="Refresh"
              variant="outline"
              size="lg"
              style={{ alignSelf: "center", paddingHorizontal: 60, marginTop: 12 }}
              onPress={fetchStatus}
            />
          </>
        )}

        {!loading && (
          <Button
            title="Done"
            variant="primary"
            size="lg"
            style={{ alignSelf: "center", paddingHorizontal: 60, marginTop: 12 }}
            onPress={handleDone}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  illustration: {
    alignSelf: "center",
    width: 200,
    height: 200,
    marginTop: 56,
  },
  illustrationMuted: {
    opacity: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
    marginBottom: 18,
  },
  message: {
    fontSize: 14,
    color: neutral[500],
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: -0.408,
    marginBottom: 14,
  },
  error: {
    fontSize: 13,
    color: "#c00",
    textAlign: "center",
    marginBottom: 12,
  },
});
