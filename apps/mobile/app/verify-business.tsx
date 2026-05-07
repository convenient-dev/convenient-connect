import { BackButton } from "@/components/BackButton";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

interface UploadCardProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  acceptedHeading: string;
  acceptedItems: string[];
  uploaded: string | null;
  onPick: () => void;
}

function UploadCard({
  icon,
  title,
  description,
  acceptedHeading,
  acceptedItems,
  uploaded,
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
        <Text style={styles.uploadText}>{uploaded ?? "Upload Document"}</Text>
      </TouchableOpacity>

      <View style={styles.uploadMeta}>
        <Text style={styles.metaText}>Accepted formats: PDF, JPG, PNG</Text>
        <Text style={styles.metaText}>Max size: 5MB</Text>
      </View>
    </View>
  );
}

export default function VerifyBusinessScreen() {
  const router = useRouter();

  const [registrationDoc, setRegistrationDoc] = useState<string | null>(null);
  const [governmentId, setGovernmentId] = useState<string | null>(null);
  const [ein, setEin] = useState("");

  function formatEin(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  const einValid = /^\d{2}-\d{7}$/.test(ein);
  const canContinue = !!registrationDoc && !!governmentId && einValid;

  function handleContinue() {
    router.push("/update-bank-account");
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
            onPick={() => setRegistrationDoc("registration.pdf")}
          />

          <UploadCard
            icon="badge"
            title="Government-Issued ID"
            description="Upload a valid ID for the business owner or authorized representative."
            acceptedHeading="Accepted IDs:"
            acceptedItems={["Driver's License", "Passport", "State ID"]}
            uploaded={governmentId}
            onPick={() => setGovernmentId("id.pdf")}
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
              onChangeText={(v) => setEin(formatEin(v))}
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
