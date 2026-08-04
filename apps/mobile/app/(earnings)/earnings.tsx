import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
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

const { primary, secondary, neutral, text, background, border } = Colors;

interface EarningsRow {
  key: string;
  label: string;
  onPress?: () => void;
}

export default function EarningsScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();

  const rows: EarningsRow[] = [
    {
      key: "withdrawal-history",
      label: "Withdrawal History",
      onPress: () => router.push("/withdrawal-history" as never),
    },
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
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Earnings" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bentoRow}>
          <View style={styles.availableCard}>
            <View style={styles.decorCircle} />
            <Text style={styles.availableLabel}>AVAILABLE</Text>
            <Text style={styles.availableAmount}>$148.80</Text>
            <View style={styles.readyRow}>
              <View style={styles.goldAccent} />
              <Text style={styles.readyText}>READY TO WITHDRAW</Text>
            </View>
          </View>

          <View style={styles.upcomingCard}>
            <View style={styles.clockBadge}>
              <MaterialIcons name="schedule" size={22} color={primary[800]} />
            </View>
            <Text style={styles.upcomingLabel}>UPCOMING</Text>
            <Text style={styles.upcomingAmount}>$144.00</Text>
          </View>
        </View>

        <Button
          title="Withdraw"
          variant="dark"
          size="lg"
          icon={
            <MaterialIcons name="arrow-forward" size={20} color={neutral[0]} />
          }
          iconPosition="right"
          style={{ marginTop: 14 }}
          onPress={() => router.push("/withdraw" as never)}
        />

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

  bentoRow: {
    flexDirection: "row",
    gap: 12,
  },
  availableCard: {
    flex: 1.7,
    backgroundColor: primary[800],
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    overflow: "hidden",
    justifyContent: "space-between",
    minHeight: 150,
  },
  decorCircle: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 100,
    borderWidth: 10,
    borderColor: primary[600],
    right: -70,
    bottom: -60,
  },
  availableLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: text.muted,
    letterSpacing: 1.2,
  },
  availableAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: neutral[0],
    letterSpacing: -0.5,
    marginTop: 4,
  },
  readyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 24,
  },
  goldAccent: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: primary[200],
  },
  readyText: {
    fontSize: 11,
    fontWeight: "700",
    color: primary[200],
  },
  upcomingCard: {
    flex: 1,
    backgroundColor: secondary[100],
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 18,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 180,
  },
  clockBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: neutral[0],
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  upcomingLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: neutral[500],
    letterSpacing: 1.1,
    marginTop: 4,
  },
  upcomingAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: secondary[900],
    letterSpacing: -0.3,
    marginTop: 2,
  },
  linksList: {
    marginTop: 14,
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
