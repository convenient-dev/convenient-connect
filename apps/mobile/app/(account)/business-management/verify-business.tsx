import { BackButton } from "@/components/BackButton";
import { Colors } from "@/constants/theme";
import {
  UploadedDoc,
  useBusinessSignup,
} from "@/contexts/BusinessSignupContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, text, background, border } = Colors;

const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png"];

type DocType = "registration" | "governmentId";

interface UploadCardProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  acceptedHeading: string;
  acceptedItems: string[];
  uploaded: UploadedDoc | null;
  error: string | null;
  onPick: () => void;
}

function UploadCard({
  icon,
  title,
  description,
  acceptedHeading,
  acceptedItems,
  uploaded,
  error,
  onPick,
}: UploadCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <MaterialIcons name={icon} size={22} color={primary[500]} />
        </View>
        <Text style={styles.cardTitle}>
          {title} <Text style={styles.required}>*</Text>
        </Text>
      </View>

      <Text style={styles.cardDescription}>{description}</Text>

      <Text style={styles.acceptedHeading}>{acceptedHeading}</Text>
      <View style={styles.bulletList}>
        {acceptedItems.map((item) => (
          <View key={item} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.uploadZone}
        activeOpacity={0.7}
        onPress={onPick}
      >
        <MaterialIcons
          name={uploaded ? "check-circle" : "file-upload"}
          size={22}
          color={uploaded ? primary[500] : neutral[400]}
        />
        <Text style={styles.uploadText}>
          {uploaded?.fileName ?? "Upload Document"}
        </Text>
      </TouchableOpacity>

      <View style={styles.uploadMeta}>
        <Text style={styles.metaText}>Accepted formats: PDF, JPG, PNG</Text>
        <Text style={styles.metaText}>Max size: 5MB</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export default function VerifyBusinessScreen() {
  const router = useRouter();
  // Business details entered on the previous screen, forwarded through
  // each step of the create-business flow.
  const params = useLocalSearchParams();
  const { data, update } = useBusinessSignup();
  const { registrationDoc, governmentId, ein } = data;

  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );
  const [governmentIdError, setGovernmentIdError] = useState<string | null>(
    null,
  );

  function formatEin(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  const einValid = /^\d{2}-\d{7}$/.test(ein);
  const canContinue = !!registrationDoc && !!governmentId && einValid;

  function handlePickDoc(docType: DocType) {
    Alert.alert("Upload Document", "Choose where to pick the file from.", [
      { text: "Choose from Files", onPress: () => pickFromFiles(docType) },
      { text: "Choose from Photos", onPress: () => pickFromPhotos(docType) },
      { text: "Take Photo", onPress: () => pickFromCamera(docType) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function pickFromCamera(docType: DocType) {
    const setError =
      docType === "registration" ? setRegistrationError : setGovernmentIdError;
    setError(null);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setError("Camera permission denied.");
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        exif: false,
      });
    } catch {
      setError("Camera is not available on this device.");
      return;
    }
    if (result.canceled) return;

    const asset = result.assets[0];
    const mime = asset.mimeType ?? "image/jpeg";
    const fallbackName = `photo-${Date.now()}.${mime === "image/png" ? "png" : "jpg"}`;
    await uploadAsset(docType, {
      uri: asset.uri,
      name: asset.fileName ?? fallbackName,
      mime,
      size: asset.fileSize ?? null,
    });
  }

  async function pickFromFiles(docType: DocType) {
    const setError =
      docType === "registration" ? setRegistrationError : setGovernmentIdError;
    setError(null);

    const result = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_MIME,
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const mime = asset.mimeType ?? "application/octet-stream";
    await uploadAsset(docType, {
      uri: asset.uri,
      name: asset.name,
      mime,
      size: asset.size ?? null,
    });
  }

  async function pickFromPhotos(docType: DocType) {
    const setError =
      docType === "registration" ? setRegistrationError : setGovernmentIdError;
    setError(null);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Photo library permission denied.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
      exif: false,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const mime = asset.mimeType ?? "image/jpeg";
    const fallbackName = `photo-${Date.now()}.${mime === "image/png" ? "png" : "jpg"}`;
    await uploadAsset(docType, {
      uri: asset.uri,
      name: asset.fileName ?? fallbackName,
      mime,
      size: asset.fileSize ?? null,
    });
  }

  async function uploadAsset(
    docType: DocType,
    asset: { uri: string; name: string; mime: string; size: number | null },
  ) {
    const setError =
      docType === "registration" ? setRegistrationError : setGovernmentIdError;

    if (!ACCEPTED_MIME.includes(asset.mime)) {
      setError("Unsupported file type. Use PDF, JPG, or PNG.");
      return;
    }
    if (asset.size && asset.size > 5 * 1024 * 1024) {
      setError("File exceeds 5MB limit.");
      return;
    }

    // TODO: Upload to the create-business API on final submit. For now the
    // picked file is kept locally (its uri) so the user can continue.
    const doc: UploadedDoc = { url: asset.uri, fileName: asset.name };
    if (docType === "registration") {
      update({ registrationDoc: doc });
    } else {
      update({ governmentId: doc });
    }
  }

  function handleContinue() {
    router.push({
      pathname: "/business-management/update-bank-account",
      params,
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Verify Your Business</Text>
          <Text style={styles.subtitle}>
            Please upload the required documents below.
          </Text>

          <UploadCard
            icon="description"
            title="Business Registration Document"
            description="Upload one of the following documents below that confirms your business registration."
            acceptedHeading="Accepted documents:"
            acceptedItems={[
              "Certificate of Incorporation",
              "Certificate of Formation",
              "Articles of Organization",
              "Business License",
            ]}
            uploaded={registrationDoc}
            error={registrationError}
            onPick={() => handlePickDoc("registration")}
          />

          <UploadCard
            icon="badge"
            title="Government-Issued ID"
            description="Upload a valid ID for the business owner or authorized representative."
            acceptedHeading="Accepted IDs:"
            acceptedItems={["Driver's License", "Passport", "State ID"]}
            uploaded={governmentId}
            error={governmentIdError}
            onPick={() => handlePickDoc("governmentId")}
          />

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <MaterialIcons name="tag" size={22} color={primary[500]} />
              </View>
              <Text style={styles.cardTitle}>
                Business Tax ID (EIN) <Text style={styles.required}>*</Text>
              </Text>
            </View>

            <Text style={styles.cardDescription}>
              Enter your business tax identification number.
            </Text>

            <Text style={styles.fieldLabel}>
              Business EIN <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="XX-XXXXXXX"
              placeholderTextColor={neutral[400]}
              value={ein}
              onChangeText={(v) => update({ ein: formatEin(v) })}
              keyboardType="number-pad"
              maxLength={10}
            />
            <Text style={styles.helperText}>
              You can find your EIN on your IRS confirmation letter or tax
              documents.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !canContinue && styles.continueButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  flex: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerSpacer: { flex: 1 },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },

  title: {
    fontSize: 24,
    fontWeight: "600",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 8,
  },

  card: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 14,
    padding: 16,
    backgroundColor: background.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
  },
  required: {
    color: text.primary,
  },
  cardDescription: {
    fontSize: 13,
    color: text.primary,
    lineHeight: 18,
    letterSpacing: -0.408,
    marginBottom: 14,
  },

  acceptedHeading: {
    fontSize: 13,
    color: neutral[500],
    letterSpacing: -0.408,
    marginBottom: 4,
  },
  bulletList: {
    marginBottom: 14,
    gap: 2,
    paddingLeft: 4,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
  },
  bullet: {
    fontSize: 13,
    color: neutral[500],
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: neutral[500],
    lineHeight: 18,
    letterSpacing: -0.408,
  },

  uploadZone: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: neutral[50],
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  uploadText: {
    fontSize: 13,
    color: neutral[500],
    letterSpacing: -0.408,
  },
  uploadMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  metaText: {
    fontSize: 12,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  errorText: {
    fontSize: 12,
    color: secondary[500],
    marginTop: 8,
    letterSpacing: -0.408,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  helperText: {
    fontSize: 12,
    color: neutral[400],
    lineHeight: 16,
    letterSpacing: -0.408,
    marginTop: 8,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  continueButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
