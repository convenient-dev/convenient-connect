import { deleteBusiness, getBusinessForEdit, toggleBusinessStatus } from "@/api/business";
import { toAbsoluteUrl } from "@/api/client";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TabBar } from "@/components/TabBar";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, border, status } = Colors;

type TabKey = "members" | "guidelines";

interface Member {
  id: number;
  name: string;
  email: string;
}

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
  services: {
    sub_category_id: number;
    sub_category_name: string;
    sub_category_logo: string | null;
  }[];
  service_sub_category_ids: number[];
}

// TODO: Load members from the API once team management endpoints exist.
const ACTIVE_MEMBERS: Member[] = [];
const PENDING_MEMBERS: Member[] = [];

function MemberRow({ member }: { member: Member }) {
  return (
    <TouchableOpacity
      style={styles.memberRow}
      activeOpacity={0.7}
      onPress={() => {
        // TODO: Open the member detail view once it exists.
      }}
    >
      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.name}
        </Text>
        <Text style={styles.memberEmail} numberOfLines={1}>
          {member.email}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={26} color={neutral[800]} />
    </TouchableOpacity>
  );
}

function MemberSection({ title, members }: { title: string; members: Member[] }) {
  if (members.length === 0) return null;
  return (
    <View>
      <Text style={styles.sectionTitle}>
        {title} ({members.length})
      </Text>
      {members.map((member) => (
        <MemberRow key={member.id} member={member} />
      ))}
    </View>
  );
}

export default function BusinessDetailScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("members");
  const [acceptingJobs, setAcceptingJobs] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const loadBusiness = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getBusinessForEdit(Number(id));
      setBusiness(data);
      setAcceptingJobs(data.status);
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

  const handleToggleStatus = async () => {
    if (!business) return;
    try {
      const newStatus = await toggleBusinessStatus(business.business_id);
      setAcceptingJobs(newStatus);
      Alert.alert("Success", `Business is now ${newStatus ? "active" : "inactive"}`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update status");
      setAcceptingJobs(!acceptingJobs);
    }
  };

  const handleDelete = () => {
    if (!business) return;
    Alert.alert(
      "Delete Business",
      `Are you sure you want to delete ${business.business_name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBusiness(business.business_id);
              Alert.alert("Success", "Business deleted successfully");
              router.back();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete business");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <ScreenHeader />
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
        <ScreenHeader />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Business not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isVerified = business.business_verification;
  const services = business.services ?? [];

  const tabs: { key: TabKey; label: string }[] = [
    { key: "members", label: "Members" },
    { key: "guidelines", label: "Guidelines" },
  ];

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <ScreenHeader
        onBack={() => router.back()}
        rightAccessory={
          <TouchableOpacity
            style={styles.menuButton}
            hitSlop={8}
            onPress={() => setMenuVisible(true)}
          >
            <MaterialIcons name="more-horiz" size={22} color={neutral[700]} />
          </TouchableOpacity>
        }
      />

      <View style={styles.titleBlock}>
        <View style={styles.nameRow}>
          <Text style={styles.businessName} numberOfLines={2}>
            {business.business_name}
          </Text>
          <MaterialIcons
            name={isVerified ? "check-circle" : "schedule"}
            size={22}
            color={isVerified ? status.active : status.inactive}
          />
        </View>

        {services.length > 0 && (
          <View style={styles.chipRow}>
            {services.map((service) => {
              const logo = toAbsoluteUrl(service.sub_category_logo);
              return (
                <View key={service.sub_category_id} style={styles.chip}>
                  {logo && (
                    <ExpoImage
                      source={{ uri: logo }}
                      style={styles.chipIcon}
                      contentFit="contain"
                    />
                  )}
                  <Text style={styles.chipText}>{service.sub_category_name}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.statusRow}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Business Status</Text>
            <Text style={styles.statusSubtitle}>Accepting new jobs</Text>
          </View>
          <Switch
            value={isVerified && acceptingJobs}
            onValueChange={handleToggleStatus}
            disabled={!isVerified}
            trackColor={{ false: neutral[200], true: primary[400] }}
            thumbColor={neutral[0]}
          />
        </View>
      </View>

      <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "members" ? (
          ACTIVE_MEMBERS.length === 0 && PENDING_MEMBERS.length === 0 ? (
            <Text style={styles.emptyText}>No members yet</Text>
          ) : (
            <>
              <MemberSection title="Active" members={ACTIVE_MEMBERS} />
              <MemberSection title="Pending" members={PENDING_MEMBERS} />
            </>
          )
        ) : (
          <Text style={styles.guidelinesText}>
            Guidelines for your business will appear here.
          </Text>
        )}
      </ScrollView>

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Invite New Member"
          variant="primary"
          size="lg"
          disabled={!isVerified}
          onPress={() => {
            // TODO: Open the invite-member screen once it exists.
          }}
        />
      </View>

      <BottomSheet
        visible={menuVisible}
        title="Manage Business"
        onClose={() => setMenuVisible(false)}
        options={[
          {
            label: "Business Details",
            icon: require("@/assets/global-icons/view-detail.svg"),
            onPress: () => {
              setMenuVisible(false);
              router.push({
                pathname: "/business-management/view-business-detail",
                params: { id: String(business.business_id) },
              });
            },
          },
          {
            label: "Edit Service",
            icon: require("@/assets/global-icons/edit.svg"),
            onPress: () => {
              setMenuVisible(false);
              router.push({
                pathname: "/business-management/select-category",
                params: {
                  flow: "edit-business",
                  businessId: String(business.business_id),
                },
              });
            },
          },
          {
            label: "Delete Business",
            icon: require("@/assets/global-icons/cancel.svg"),
            onPress: () => {
              setMenuVisible(false);
              handleDelete();
            },
          },
        ]}
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
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: neutral[50],
    alignItems: "center",
    justifyContent: "center",
  },
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

  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  businessName: {
    flexShrink: 1,
    fontSize: 28,
    fontWeight: "700",
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
  chipIcon: {
    width: 18,
    height: 18,
  },
  chipText: {
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  statusInfo: {
    flex: 1,
    gap: 2,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  statusSubtitle: {
    fontSize: 15,
    color: neutral[400],
    letterSpacing: -0.408,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: border.default,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: border.default,
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 17,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  memberEmail: {
    fontSize: 15,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  guidelinesText: {
    fontSize: 14,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  emptyText: {
    fontSize: 14,
    color: neutral[400],
    textAlign: "center",
    paddingVertical: 24,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
});
