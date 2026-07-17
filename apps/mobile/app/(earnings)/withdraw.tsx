import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, border, secondary, status } =
  Colors;

// TODO: Replace with backend-provided balance and connected payout method.
const AVAILABLE_BALANCE = 148.8;
const PAYOUT_METHOD = "Bank account ending in 5114";

function formatAmount(value: number) {
  return `$${value.toFixed(2)}`;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export default function WithdrawScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const parsed = useMemo(() => parseAmount(amount), [amount]);
  const exceedsBalance = parsed > AVAILABLE_BALANCE;
  const isValid = parsed > 0 && !exceedsBalance;

  function handleWithdrawAll() {
    setAmount(AVAILABLE_BALANCE.toFixed(2));
  }

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      // TODO: POST withdrawal request to backend.
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSuccessVisible(true);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSuccessConfirm() {
    setSuccessVisible(false);
    router.replace("/withdrawal-history" as never);
  }

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "left", "right"]}
    >
      <ScreenHeader title="Withdraw" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceAmount}>
              {formatAmount(AVAILABLE_BALANCE)}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Amount</Text>
          <View
            style={[
              styles.amountInputRow,
              exceedsBalance && styles.amountInputRowError,
            ]}
          >
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={neutral[300]}
              keyboardType="decimal-pad"
              inputMode="decimal"
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.maxButton}
              activeOpacity={0.7}
              onPress={handleWithdrawAll}
            >
              <Text style={styles.maxButtonText}>Withdraw all</Text>
            </TouchableOpacity>
          </View>
          {exceedsBalance && (
            <Text style={styles.errorText}>
              Amount exceeds available balance.
            </Text>
          )}

          <Text style={styles.sectionLabel}>Payout method</Text>
          <View style={styles.methodCard}>
            <MaterialIcons
              name="account-balance"
              size={22}
              color={text.primary}
            />
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>{PAYOUT_METHOD}</Text>
              <Text style={styles.methodHint}>
                Deposits arrive in 1–3 business days
              </Text>
            </View>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={status.active}
            />
          </View>

          <Text style={styles.helperText}>
            Funds will be transferred to your connected Stripe payout method.
            You can review the status under Withdrawal History.
          </Text>
        </ScrollView>

        <View style={[styles.footer, contentWidthStyle]}>
          <Button
            title={parsed > 0 ? `Withdraw ${formatAmount(parsed)}` : "Withdraw"}
            variant="primary"
            size="lg"
            disabled={!isValid}
            loading={submitting}
            onPress={handleSubmit}
          />
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={successVisible}
        icon="success"
        title="Withdrawal requested"
        message={`${formatAmount(
          parsed,
        )} will be sent to your ${PAYOUT_METHOD.toLowerCase()}. You can track its status in Withdrawal History.`}
        confirmLabel="View history"
        onConfirm={handleSuccessConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },

  balanceCard: {
    backgroundColor: primary[800],
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: text.muted,
    letterSpacing: -0.408,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: neutral[0],
    letterSpacing: -0.5,
    marginTop: 4,
  },

  sectionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: neutral[500],
    letterSpacing: -0.408,
    marginBottom: 8,
    marginTop: 16,
  },

  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 56,
    gap: 6,
  },
  amountInputRowError: {
    borderColor: secondary[500],
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: "600",
    color: text.primary,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "600",
    color: text.primary,
    paddingVertical: 0,
  },
  maxButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: neutral[50],
  },
  maxButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: secondary[500],
    letterSpacing: -0.408,
  },

  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: neutral[50],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  methodHint: {
    fontSize: 12,
    color: neutral[400],
    letterSpacing: -0.408,
    marginTop: 2,
  },

  helperText: {
    fontSize: 12,
    color: neutral[400],
    lineHeight: 18,
    letterSpacing: -0.408,
    marginTop: 18,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
});
