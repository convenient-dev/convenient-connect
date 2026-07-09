import { BackButton } from "@/components/BackButton";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Colors } from "@/constants/theme";
import { useBusinessSignup } from "@/contexts/BusinessSignupContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, text, background } = Colors;

export default function BusinessManagementScreen() {
  const router = useRouter();
  const { pendingBusinesses } = useBusinessSignup();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.title}>Business Management</Text>
      </View>

      {pendingBusinesses.length === 0 ? (
        <View style={styles.emptyBody}>
          <ExpoImage
            source={require("@/assets/global-icons/create-business-icon.png")}
            style={styles.illustration}
            contentFit="contain"
          />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {pendingBusinesses.map((business) => (
            <TouchableOpacity
              key={business.id}
              style={styles.businessRow}
              activeOpacity={0.7}
              onPress={() => {
                // TODO: Open the business detail view once it exists.
              }}
            >
              <View style={styles.businessInfo}>
                <Text style={styles.businessName} numberOfLines={1}>
                  {business.name}
                </Text>
                <View style={styles.chipRow}>
                  {business.categories.map((category) => (
                    <View key={category} style={styles.chip}>
                      <CategoryIcon name={category} size={18} />
                      <Text style={styles.chipText}>{category}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={26}
                color={neutral[800]}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.createButton}
          activeOpacity={0.85}
          onPress={() => router.push("/business-management/business-details")}
        >
          <MaterialIcons name="add" size={22} color={neutral[0]} />
          <Text style={styles.createText}>Create Business</Text>
        </TouchableOpacity>
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
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  emptyBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  illustration: {
    width: 180,
    height: 180,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
  },
  businessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  businessInfo: {
    flex: 1,
    gap: 10,
  },
  businessName: {
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: primary[50],
  },
  chipText: {
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  createButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: secondary[400],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  createText: {
    fontSize: 17,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
