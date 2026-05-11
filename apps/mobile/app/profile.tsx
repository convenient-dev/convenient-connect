import { CategoryIcon } from "@/components/CategoryIcon";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, status } = Colors;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  isPersonVerified: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  avatarUrl: string | null;
  accountType: "individual" | "business" | string;
  profileTypeStatus?: "active" | "pending" | string;
  backgroundCheckStatus?: "complete" | "pending" | "incomplete" | string;
  aboutMe?: string | null;
}

interface UserCategory {
  id: number;
  name: string;
}

function titleCase(s: string): string {
  return s
    .split(/[\s-]+/)
    .map((p) => (p.length ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
    .join(" ");
}

interface RowProps {
  label: string;
  value: string;
  valueMuted?: boolean;
  trailingIcon?: "verified" | "warning";
  badge?: string;
  onPress?: () => void;
}

function ProfileRow({
  label,
  value,
  valueMuted,
  trailingIcon,
  badge,
  onPress,
}: RowProps) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowValueWrap}>
          <Text
            style={[styles.rowValue, valueMuted && styles.rowValueMuted]}
            numberOfLines={1}
          >
            {value}
          </Text>
          {trailingIcon === "verified" && (
            <MaterialIcons
              name="check-circle"
              size={14}
              color={status.active}
              style={styles.rowValueIcon}
            />
          )}
          {trailingIcon === "warning" && (
            <MaterialIcons
              name="error"
              size={14}
              color={status.error}
              style={styles.rowValueIcon}
            />
          )}
          {badge && (
            <View style={styles.rowBadge}>
              <Text style={styles.rowBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={neutral[300]} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        fetch(`${API_BASE_URL}/users/1`).then((res) => res.json()),
        fetch(`${API_BASE_URL}/users/1/categories`)
          .then((res) => res.json())
          .catch(() => [] as UserCategory[]),
      ])
        .then(([userData, cats]: [UserProfile, UserCategory[]]) => {
          setUser(userData);
          setCategories((cats ?? []).map((c) => c.name));
        })
        .finally(() => setLoading(false));
    }, []),
  );

  const fullName = useMemo(() => {
    if (!user) return "—";
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "—";
  }, [user]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color={primary[400]}
          style={styles.loader}
        />
      </SafeAreaView>
    );
  }

  const profileTypeLabel =
    user?.accountType === "business" ? "Business" : "Individual";
  const backgroundComplete = user?.backgroundCheckStatus === "complete";

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="My Profile"
        titleAccessory={
          user?.isPersonVerified ? (
            <ExpoImage
              source={require("@/assets/global-icons/verified.svg")}
              style={styles.headerBadge}
              contentFit="contain"
            />
          ) : null
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <ExpoImage
              source={
                user?.avatarUrl
                  ? { uri: user.avatarUrl }
                  : require("@/assets/default-avatar-square.svg")
              }
              style={styles.avatar}
              contentFit="cover"
            />
            <TouchableOpacity
              style={styles.cameraButton}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/edit-avatar",
                  params: user?.avatarUrl
                    ? { currentAvatarUrl: user.avatarUrl }
                    : {},
                })
              }
            >
              <MaterialIcons name="photo-camera" size={14} color={neutral[0]} />
            </TouchableOpacity>
          </View>
        </View>

        {categories.length > 0 && (
          <View style={styles.chipsRow}>
            {categories.map((c) => (
              <View key={c} style={styles.chip}>
                <CategoryIcon name={c} size={14} />
                <Text style={styles.chipText}>{titleCase(c)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.list}>
          <ProfileRow
            label="Name"
            value={fullName}
            valueMuted
            onPress={() =>
              router.push({
                pathname: "/update-name",
                params: {
                  firstName: user?.firstName ?? "",
                  lastName: user?.lastName ?? "",
                },
              })
            }
          />
          <View style={styles.rowDivider} />

          <ProfileRow
            label="Phone Number"
            value={user?.phoneNumber ?? "—"}
            valueMuted
            trailingIcon="verified"
            onPress={() =>
              router.push({
                pathname: "/update-phone",
                params: { phoneNumber: user?.phoneNumber ?? "" },
              })
            }
          />
          <View style={styles.rowDivider} />

          <ProfileRow
            label="Email"
            value={user?.email ?? "—"}
            valueMuted
            trailingIcon="verified"
            onPress={() =>
              router.push({
                pathname: "/update-email",
                params: { email: user?.email ?? "" },
              })
            }
          />
          <View style={styles.rowDivider} />

          <ProfileRow
            label="Profile Type"
            value={profileTypeLabel}
            valueMuted
            trailingIcon={
              user?.profileTypeStatus === "pending" ? "warning" : undefined
            }
            onPress={() =>
              router.push({
                pathname:
                  user?.profileTypeStatus === "pending"
                    ? "/profile-type-pending"
                    : "/profile-type",
                params: { accountType: user?.accountType ?? "individual" },
              })
            }
          />
          <View style={styles.rowDivider} />

          <ProfileRow
            label="Background Check"
            value={
              backgroundComplete
                ? "Background check complete"
                : "Please complete your background check"
            }
            valueMuted
            trailingIcon={backgroundComplete ? "verified" : "warning"}
            onPress={() => router.push("/background-check-1")}
          />
          <View style={styles.rowDivider} />

          <ProfileRow
            label="About Me"
            value={
              user?.aboutMe && user.aboutMe.length > 0
                ? user.aboutMe
                : "Help clients learn more about you"
            }
            valueMuted
            onPress={() =>
              router.push({
                pathname: "/about-me",
                params: user?.aboutMe ? { aboutMe: user.aboutMe } : {},
              })
            }
          />
          <View style={styles.rowDivider} />

          <ProfileRow
            label="My Affiliations"
            value="Businesses you're currently affiliated with"
            valueMuted
            onPress={() => router.push("/affiliations")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 96;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  loader: { flex: 1 },

  headerBadge: {
    width: 18,
    height: 18,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 40,
  },

  avatarSection: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 14,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 16,
    backgroundColor: neutral[100],
  },
  cameraButton: {
    position: "absolute",
    right: -5,
    bottom: -5,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: neutral[700],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: neutral[0],
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: primary[100],
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.408,
    color: text.primary,
  },

  list: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 10,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  rowBadge: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: status.inactive + "22",
  },
  rowBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: status.inactive,
    letterSpacing: -0.408,
  },
  rowValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    fontSize: 13,
    color: text.primary,
    flexShrink: 1,
  },
  rowValueMuted: {
    color: neutral[400],
  },
  rowValueIcon: {
    marginLeft: 2,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[100],
  },
});
