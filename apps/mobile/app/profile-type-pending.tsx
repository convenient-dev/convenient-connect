import { BackButton } from "@/components/BackButton";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, status } = Colors;

type AccountType = "individual" | "business";

function label(type: AccountType): string {
  return type === "business" ? "Business" : "Individual";
}

export default function ProfileTypePendingScreen() {
  const router = useRouter();
  const { accountType } = useLocalSearchParams<{ accountType?: string }>();

  const current: AccountType = accountType === "business" ? "business" : "individual";
  const target: AccountType = current === "individual" ? "business" : "individual";

  function handleSupport() {
    // TODO: Open the support center.
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Profile Type</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="hourglass-empty" size={32} color={status.inactive} />
        </View>

        <Text style={styles.title}>Change Under Review</Text>

        <View style={styles.transitionRow}>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{label(current)}</Text>
          </View>
          <MaterialIcons name="arrow-forward" size={18} color={neutral[400]} />
          <View style={[styles.typePill, styles.typePillTarget]}>
            <Text style={[styles.typePillText, styles.typePillTextTarget]}>
              {label(target)}
            </Text>
          </View>
        </View>

        <Text style={styles.message}>
          You have submitted a profile change from{" "}
          <Text style={styles.bold}>{label(current)}</Text> to{" "}
          <Text style={styles.bold}>{label(target)}</Text>. It is under review —
          we&apos;ll notify you once the change has completed.
        </Text>

        <Text style={styles.message}>
          If you have any questions, visit our{" "}
          <Text style={styles.link} onPress={handleSupport}>
            support center
          </Text>
          .
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
  },
  headerSpacer: { width: 40 },

  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: status.inactive + "22",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
    marginBottom: 18,
  },
  transitionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: neutral[100],
  },
  typePillTarget: {
    backgroundColor: primary[100],
  },
  typePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  typePillTextTarget: {
    color: primary[600],
  },
  message: {
    fontSize: 14,
    color: neutral[500],
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: -0.408,
    marginBottom: 14,
  },
  bold: {
    fontWeight: "700",
    color: text.primary,
  },
  link: {
    color: primary[500],
    fontWeight: "600",
  },
});
