import {
  INVITE_CODE_LENGTH,
  normalizeInviteCode,
  previewInviteCode,
  redeemInviteCode,
  type InviteCodeRedeemResult,
} from "@/api/invite-codes";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ServiceChips } from "@/components/ServiceChips";
import { useSuspendedGuard } from "@/components/SuspendedGuard";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import LottieView from "lottie-react-native";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { neutral, text, background } = Colors;

/**
 * Join a business with a 5-character invite code. Opened from
 * "Add Collaboration" on My Collaborations, or from a `/join/{code}` link
 * which prefills `code`.
 */
export default function JoinBusinessScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { guard, suspendedModal } = useSuspendedGuard();
  const reducedMotion = useReducedMotion();

  const [code, setCode] = useState(() =>
    normalizeInviteCode(params.code ?? "").slice(0, INVITE_CODE_LENGTH),
  );
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState<InviteCodeRedeemResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canContinue = code.length === INVITE_CODE_LENGTH && !submitting;

  function handleChangeCode(value: string) {
    setCode(normalizeInviteCode(value).slice(0, INVITE_CODE_LENGTH));
  }

  async function handleContinue() {
    if (!canContinue) return;
    setSubmitting(true);
    try {
      // Preview fails early with the same checks as redeem, without using
      // the code. Redeem then creates the active membership.
      await previewInviteCode(code);
      const result = await redeemInviteCode(code);
      setJoined(result);
    } catch (error: any) {
      // The API's message is user-facing ("Invalid code.", "This code has
      // expired.", ...) and is shown as-is.
      setErrorMessage(
        error?.message || "Failed to join this business. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openCollaborations() {
    // My Collaborations reloads the business list on focus.
    router.replace({
      pathname: "/business-management",
      params: { tab: "affiliations" },
    });
  }

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {joined ? (
          // The success state is terminal: no back button, per the design.
          <View style={styles.plainHeader}>
            <Text style={styles.plainHeaderTitle}>You&apos;re in</Text>
          </View>
        ) : (
          <ScreenHeader title="Add Collaboration" />
        )}

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentWidthStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {joined ? (
            <>
              <LottieView
                source={require("@/assets/Animated icons/Json/Fist Bump.json")}
                autoPlay={!reducedMotion}
                loop={false}
                resizeMode="contain"
                style={styles.animation}
              />
              <Text style={styles.title}>
                Affiliated with {joined.business_name}
              </Text>
              {!!joined.joined_at && (
                <Text style={styles.joinedDate}>Joined {joined.joined_at}</Text>
              )}
              {joined.sub_categories.length > 0 && (
                <>
                  <Text style={styles.centeredDescription}>
                    You can start publishing services under the following
                    subcategories.
                  </Text>
                  <ServiceChips
                    services={joined.sub_categories.map((name, index) => ({
                      id: index,
                      name,
                    }))}
                    size="sm"
                    centered
                  />
                </>
              )}
            </>
          ) : (
            <>
              <ExpoImage
                source={require("@/assets/global-icons/invite-by-phone.png")}
                style={styles.illustration}
                contentFit="contain"
              />
              <Text style={styles.title}>Enter your invite code</Text>
              <Text style={styles.description}>
                Request your invite code from the business owner. It will be a
                {" "}
                {INVITE_CODE_LENGTH}-character code.
              </Text>
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={handleChangeCode}
                placeholder="INVITE CODE"
                placeholderTextColor={neutral[400]}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                maxLength={INVITE_CODE_LENGTH}
                returnKeyType="done"
                onSubmitEditing={() => guard(handleContinue)}
                editable={!submitting}
                accessibilityLabel="Invite code"
              />
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, contentWidthStyle]}>
          {joined ? (
            <Button
              title="View Collaboration"
              variant="primary"
              size="lg"
              onPress={openCollaborations}
            />
          ) : (
            <Button
              title="Continue"
              variant="primary"
              size="lg"
              disabled={!canContinue}
              loading={submitting}
              onPress={() => guard(handleContinue)}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={errorMessage !== null}
        type="error"
        title="Couldn't Join"
        message={errorMessage ?? ""}
        confirmLabel="OK"
        onConfirm={() => setErrorMessage(null)}
      />
      {suspendedModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  flex: { flex: 1 },
  plainHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    minHeight: 62,
  },
  plainHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  illustration: {
    width: 160,
    height: 160,
    marginBottom: 12,
  },
  animation: {
    width: 220,
    height: 220,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
  },
  description: {
    alignSelf: "stretch",
    fontSize: 15,
    lineHeight: 20,
    color: text.primary,
    letterSpacing: -0.408,
  },
  centeredDescription: {
    fontSize: 15,
    lineHeight: 20,
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
    paddingHorizontal: 8,
  },
  joinedDate: {
    fontSize: 15,
    color: neutral[500],
    letterSpacing: -0.408,
  },
  codeInput: {
    alignSelf: "stretch",
    height: 60,
    borderRadius: 12,
    backgroundColor: neutral[50],
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: "500",
    letterSpacing: 5,
    textAlign: "center",
    color: text.primary,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
});
