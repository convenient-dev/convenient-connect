import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { updateProfileImage, getAuthUser } from "@/api/profile";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background } = Colors;


export default function EditAvatarScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { currentAvatarUrl } = useLocalSearchParams<{
    currentAvatarUrl?: string;
  }>();
  const { setUser } = useAuth();

  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pickFromLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pickFromLibrary() {
    setError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Photo library permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPickedUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!pickedUri) return;
    setSaving(true);
    setError(null);
    try {
      const ext = pickedUri.split(".").pop()?.toLowerCase() ?? "jpg";
      const mimeType =
        ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";

      const formData = new FormData();
      if (Platform.OS === "web") {
        const blobRes = await fetch(pickedUri);
        const blob = await blobRes.blob();
        formData.append(
          "profile_image",
          new File([blob], `avatar.${ext}`, { type: mimeType }),
        );
      } else {
        formData.append("profile_image", {
          uri: pickedUri,
          name: `avatar.${ext}`,
          type: mimeType,
        } as unknown as Blob);
      }

      await updateProfileImage(formData);
      router.back();
      getAuthUser().then(setUser).catch(() => {});
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Failed to upload. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const previewSource = pickedUri
    ? { uri: pickedUri }
    : currentAvatarUrl
      ? { uri: currentAvatarUrl }
      : require("@/assets/default-avatar-square.svg");

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Edit Photo" />

      <View style={[styles.body, contentWidthStyle]}>
        <View style={styles.previewWrap}>
          <ExpoImage
            source={previewSource}
            style={styles.preview}
            contentFit="cover"
          />
        </View>

        <TouchableOpacity
          style={styles.pickButton}
          activeOpacity={0.7}
          onPress={pickFromLibrary}
          disabled={saving}
        >
          <MaterialIcons name="photo-library" size={18} color={primary[600]} />
          <Text style={styles.pickButtonText}>
            {pickedUri ? "Choose a different photo" : "Choose from library"}
          </Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Save"
          variant="primary"
          size="md"
          loading={saving}
          disabled={!pickedUri}
          onPress={handleSave}
        />
      </View>
    </SafeAreaView>
  );
}

const PREVIEW_SIZE = 200;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  body: {
    flex: 1,
    alignItems: "center",
    paddingTop: 32,
    paddingHorizontal: 20,
    gap: 24,
  },
  previewWrap: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: neutral[100],
  },
  preview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
  },
  pickButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: primary[50],
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: primary[600],
    letterSpacing: -0.408,
  },
  errorText: {
    fontSize: 13,
    color: "#c54038",
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
