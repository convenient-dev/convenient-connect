import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { neutral, text, background, border } = Colors;

interface EarningsRow {
  key: string;
  label: string;
  onPress?: () => void;
}

export default function EarningsScreen() {
  const router = useRouter();

  const rows: EarningsRow[] = [
    {
      key: "payout-methods",
      label: "Manage Payout Methods",
      onPress: () => router.push("/manage-payout-methods" as never),
    },
    {
      key: "earning-history",
      label: "Earning History",
      onPress: () => router.push("/earning-history" as never),
    },
    {
      key: "tax-documents",
      label: "Tax Documents",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Earnings" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryCard, styles.summaryCardEarnings]}>
          <Text style={styles.summaryLabel}>Earnings</Text>
          <Text style={styles.summaryAmount}>$148.80</Text>
        </View>

        <View style={[styles.summaryCard, styles.summaryCardUpcoming]}>
          <Text style={styles.summaryLabel}>Upcoming Earnings</Text>
          <Text style={styles.summaryAmount}>$144.00</Text>
        </View>

        <View style={styles.linksList}>
          {rows.map((row, i) => (
            <React.Fragment key={row.key}>
              <TouchableOpacity
                style={styles.linkRow}
                activeOpacity={0.7}
                onPress={row.onPress}
              >
                <Text style={styles.linkLabel}>{row.label}</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={neutral[400]}
                />
              </TouchableOpacity>
              {i < rows.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 10,
    marginBottom: 12,
  },
  summaryCardEarnings: {
    backgroundColor: "#E4F2E4",
  },
  summaryCardUpcoming: {
    backgroundColor: "#FBEEDB",
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  summaryAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },

  linksList: {
    marginTop: 6,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
  },
  linkLabel: {
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: border.default,
  },
});
