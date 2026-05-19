import earningHistoryData from "@/assets/data/earning-history.json";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
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

const { primary, brand, neutral, text, background, border, secondary, status } =
  Colors;

type WithdrawalStatus = "completed" | "pending" | "failed";

interface WithdrawalItem {
  id: string;
  payoutDate: string;
  amount: number;
  status: WithdrawalStatus;
  destination: string;
}

const WITHDRAWALS = earningHistoryData.withdrawals as WithdrawalItem[];

function formatAmount(value: number) {
  return `$${value.toFixed(2)}`;
}

const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
};

function statusStyles(s: WithdrawalStatus) {
  switch (s) {
    case "completed":
      return { bg: "#E4F2E4", fg: status.active };
    case "pending":
      return { bg: "#FBEEDB", fg: status.inactive };
    case "failed":
      return { bg: "#FCE0DF", fg: secondary[500] };
  }
}

export default function WithdrawalHistoryScreen() {
  const router = useRouter();

  const sorted = [...WITHDRAWALS].sort((a, b) => {
    const [ma, da, ya] = a.payoutDate.split("/").map(Number);
    const [mb, db, yb] = b.payoutDate.split("/").map(Number);
    return (
      new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime()
    );
  });

  const completed = WITHDRAWALS.filter((w) => w.status === "completed");
  const totalWithdrawn = completed.reduce((sum, w) => sum + w.amount, 0);
  const transferCount = completed.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Withdrawal History" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>TOTAL WITHDRAWN</Text>
            <Text style={styles.summaryAmount}>
              {formatAmount(totalWithdrawn)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>TRANSFERS</Text>
            <Text style={styles.summaryAmount}>{transferCount}</Text>
          </View>
        </View>

        {sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No withdrawals yet</Text>
            <Text style={styles.emptyBody}>
              Once you withdraw from your earnings, your history will show up
              here.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              activeOpacity={0.85}
              onPress={() => router.push("/withdraw" as never)}
            >
              <Text style={styles.emptyButtonText}>Withdraw now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sorted.map((item, i) => {
            const s = statusStyles(item.status);
            return (
              <View key={item.id}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title} numberOfLines={1}>
                        {formatAmount(item.amount)}
                      </Text>
                    </View>
                    <Text style={styles.meta}>
                      Payout Date: {item.payoutDate}
                    </Text>
                    <Text style={styles.meta}>{item.destination}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.fg }]}>
                      {STATUS_LABEL[item.status]}
                    </Text>
                  </View>
                </View>
                {i < sorted.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })
        )}
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
    backgroundColor: primary[800],
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 8,
    overflow: "hidden",
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: primary[600],
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: text.muted,
    letterSpacing: 1.1,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: neutral[0],
    letterSpacing: -0.5,
    marginTop: 6,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 13,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  amount: {
    fontSize: 17,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: border.default,
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  emptyBody: {
    fontSize: 14,
    color: neutral[400],
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 20,
    height: 48,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
