import { getBusinessForEdit } from "@/api/business";
import { getCities, getCountries, getStates } from "@/api/location";
import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, border, status } = Colors;

interface Business {
  business_id: number;
  business_name: string;
  business_address: string;
  about: string | null;
  country_id: number;
  state_id: number;
  city_id: number;
  zipcode: string | null;
  business_ein: string | null;
  status: boolean;
  business_verification: boolean;
}

interface LocationNames {
  country?: string;
  state?: string;
  city?: string;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

export default function ViewBusinessDetailScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [business, setBusiness] = useState<Business | null>(null);
  const [locationNames, setLocationNames] = useState<LocationNames>({});
  const [loading, setLoading] = useState(true);

  const loadBusiness = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getBusinessForEdit(Number(id));
      setBusiness(data);

      // The API returns only location ids, so resolve their names via the
      // location endpoints. Unresolved names fall back to "—".
      try {
        const [countries, states, cities] = await Promise.all([
          getCountries(),
          getStates(data.country_id),
          getCities(data.state_id),
        ]);
        setLocationNames({
          country: countries.find((c) => c.id === data.country_id)?.name,
          state: states.find((s) => s.id === data.state_id)?.name,
          city: cities.find((c) => c.id === data.city_id)?.name,
        });
      } catch {
        // Leave unresolved names empty.
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load business");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <ScreenHeader title="Business Details" />
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={primary[400]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <ScreenHeader title="Business Details" />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Business not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isVerified = business.business_verification;

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <ScreenHeader title="Business Details" />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <DetailField label="Business Name" value={business.business_name} />
          <DetailField label="Business Address" value={business.business_address} />
        </View>

        <View style={styles.card}>
          <DetailField label="Country" value={locationNames.country || "—"} />
          <DetailField label="State" value={locationNames.state || "—"} />
          <DetailField label="City" value={locationNames.city || "—"} />
          <DetailField label="Zip code" value={business.zipcode || "—"} />
        </View>

        <View style={styles.card}>
          <DetailField label="About" value={business.about || "—"} />
        </View>

        {business.business_ein && (
          <View style={styles.card}>
            <DetailField label="Business EIN" value={business.business_ein} />
          </View>
        )}

        {/* TODO: Show the connected bank account once the API exposes it. */}

        <View style={[styles.card, styles.verificationCard]}>
          <Text style={styles.verificationText}>
            Business Document Verification
          </Text>
          <MaterialIcons
            name={isVerified ? "check-circle" : "schedule"}
            size={20}
            color={isVerified ? status.active : status.inactive}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Edit"
          variant="secondary"
          size="lg"
          onPress={() => {
            router.push({
              pathname: "/business-management/edit-business",
              params: { id: String(business.business_id) },
            });
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  flex: { flex: 1 },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 15,
    color: neutral[400],
    letterSpacing: -0.408,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 14,
    padding: 18,
    backgroundColor: background.card,
    gap: 16,
  },
  cardTitle: {
    fontSize: 17,
    color: neutral[500],
    letterSpacing: -0.408,
  },
  fieldBlock: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 15,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  fieldValue: {
    fontSize: 17,
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 24,
  },
  verificationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  verificationText: {
    fontSize: 17,
    color: text.primary,
    letterSpacing: -0.408,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
});
