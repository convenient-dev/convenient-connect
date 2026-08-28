import { getUserCategories } from "@/api/legacy";
import { getAboutMe } from "@/api/profile";
import {
  getCategoryLogoIndex,
  lookupCategoryLogo,
  type CategoryLogoIndex,
} from "@/api/services";
import { useAuth } from "@/auth/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  avatarUrl: string | null;
  backgroundVerification: "Pending" | "Verified" | "Not Verified";
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
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryLogos, setCategoryLogos] = useState<CategoryLogoIndex>({});
  const [aboutMe, setAboutMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategoryLogoIndex()
      .then(setCategoryLogos)
      .catch(() => {});
  }, []);

  const user: UserProfile | null = authUser
    ? {
        firstName: authUser.user.user_fname ?? null,
        lastName: authUser.user.user_lname ?? null,
        email: authUser.user.user_email ?? null,
        phoneNumber: authUser.user.user_contact ?? null,
        emailVerified: authUser.user.email_verified,
        phoneVerified: authUser.user.phone_verified,
        avatarUrl: authUser.profileImage,
        backgroundVerification: authUser.backgroundVerification,
        aboutMe,
      }
    : null;

  function handleBack() {
    if (from === "background-check") {
      router.replace({ pathname: "/home", params: { openMenu: "1" } });
      return;
    }
    router.back();
  }

  useFocusEffect(
    useCallback(() => {
      if (!authUser?.user.user_id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000),
      );
      Promise.race([getUserCategories(authUser.user.user_id), timeout])
        .then((cats: UserCategory[]) => {
          setCategories((cats ?? []).map((c) => c.name));
        })
        .catch(() => setCategories([]))
        .finally(() => setLoading(false));

      // Load the saved About Me text so the row reflects the latest value and
      // we can seed the editor with it. Refreshes on every focus, including
      // when returning from the About Me screen after a save.
      getAboutMe()
        .then((text) => setAboutMe(text))
        .catch(() => {});
    }, [authUser?.user.user_id]),
  );

  const fullName = useMemo(() => {
    if (!user) return "—";
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "—";
  }, [user]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <ActivityIndicator
          size="large"
          color={primary[400]}
          style={styles.loader}
        />
      </SafeAreaView>
    );
  }

  const backgroundStatus = user?.backgroundVerification ?? "Pending";

  const backgroundLabel =
    backgroundStatus === "Verified"
      ? "Background check verified"
      : backgroundStatus === "Pending"
        ? "Background check pending"
        : "Background check not verified";

  const backgroundIcon =
    backgroundStatus === "Verified" ? "verified" : ("warning" as const);

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader
        title="My Profile"
        onBack={handleBack}
        titleAccessory={
          user?.backgroundVerification === "Verified" ? (
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
        contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
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
                  pathname: "/profile/update-avatar",
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
            {categories.map((c) => {
              const logo = lookupCategoryLogo(categoryLogos, c);
              return (
                <View key={c} style={styles.chip}>
                  {logo && (
                    <ExpoImage
                      source={{ uri: logo }}
                      style={styles.chipIcon}
                      contentFit="contain"
                    />
                  )}
                  <Text style={styles.chipText}>{titleCase(c)}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.list}>
          <ProfileRow
            label="Name"
            value={fullName}
            valueMuted
            onPress={() =>
              router.push({
                pathname: "/profile/update-name",
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
            trailingIcon={user?.phoneVerified ? "verified" : undefined}
            onPress={() =>
              router.push({
                pathname: "/profile/update-phone",
                params: { phoneNumber: user?.phoneNumber ?? "" },
              })
            }
          />
          <View style={styles.rowDivider} />

          <ProfileRow
            label="Email"
            value={user?.email ?? "—"}
            valueMuted
            trailingIcon={user?.emailVerified ? "verified" : undefined}
            onPress={() =>
              router.push({
                pathname: "/profile/update-email",
                params: { email: user?.email ?? "" },
              })
            }
          />
          <View style={styles.rowDivider} />

          <ProfileRow
            label="Background Check"
            value={backgroundLabel}
            valueMuted
            trailingIcon={backgroundIcon}
            onPress={() => router.push("/background-check/step-1")}
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
                pathname: "/profile/about-me",
                params: user?.aboutMe ? { aboutMe: user.aboutMe } : {},
              })
            }
          />
          <View style={styles.rowDivider} />
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
  chipIcon: {
    width: 14,
    height: 14,
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
