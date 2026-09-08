import { getBusinessForEdit } from "@/api/business";
import { inviteBusinessMember } from "@/api/business-members";
import { createInviteCode, listInviteCodes } from "@/api/invite-codes";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  ServiceAssignmentChips,
  type ServiceChipItem,
} from "@/components/ServiceChips";
import { TabBar } from "@/components/TabBar";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

const { primary, secondary, neutral, text, background } = Colors;

type InviteTab = "email" | "code";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MAX_LENGTH = 500;

interface ModalState {
  type: "success" | "error";
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm?: () => void;
}

interface BusinessServicesData {
  business_id: number;
  services?: { sub_category_id: number; sub_category_name: string }[];
}

export default function InviteMemberScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const businessId = Number(params.id);

  const [activeTab, setActiveTab] = useState<InviteTab>(
    params.tab === "code" ? "code" : "email",
  );
  const [services, setServices] = useState<ServiceChipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);

  // Shared between tabs so switching doesn't lose the selection.
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  // By Email
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Invite Code
  const [codeName, setCodeName] = useState("");
  const [existingCodeCount, setExistingCodeCount] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      try {
        const data: BusinessServicesData = await getBusinessForEdit(businessId);
        setServices(
          (data.services ?? []).map((s) => ({
            id: s.sub_category_id,
            name: s.sub_category_name,
          })),
        );
      } catch (error: any) {
        setModal({
          type: "error",
          title: "Error",
          message: error?.message || "Failed to load business services",
          confirmLabel: "OK",
          onConfirm: () => router.back(),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [businessId, router]);

  // Refresh the count whenever we come back from the Invite Codes screen.
  useFocusEffect(
    useCallback(() => {
      if (!businessId) return;
      listInviteCodes(businessId)
        .then((codes) => setExistingCodeCount(codes.active.length))
        .catch(() => setExistingCodeCount(0));
    }, [businessId]),
  );

  const selectedServices = services.filter((s) =>
    selectedServiceIds.includes(s.id),
  );
  const availableServices = services.filter(
    (s) => !selectedServiceIds.includes(s.id),
  );

  const addService = (service: ServiceChipItem) =>
    setSelectedServiceIds((prev) => [...prev, service.id]);
  const removeService = (service: ServiceChipItem) =>
    setSelectedServiceIds((prev) => prev.filter((id) => id !== service.id));

  const hasServices = selectedServiceIds.length > 0;
  const canSendInvite = EMAIL_RE.test(email.trim()) && hasServices;
  const canCreateCode = codeName.trim().length > 0 && hasServices;

  async function handleSendInvite() {
    if (!canSendInvite || submitting) return;
    setSubmitting(true);
    try {
      await inviteBusinessMember({
        businessId,
        email: email.trim(),
        serviceSubCategoryIds: selectedServiceIds,
        message: message.trim() || null,
      });
      setModal({
        type: "success",
        title: "Invite Sent",
        message: `An invitation has been emailed to ${email.trim()}. They'll appear under Pending until they accept.`,
        confirmLabel: "Done",
        // The business hub refetches members on focus.
        onConfirm: () => router.back(),
      });
    } catch (error: any) {
      setModal({
        type: "error",
        title: "Error",
        message: error?.message || "Failed to send invite. Please try again.",
        confirmLabel: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCode() {
    if (!canCreateCode || submitting) return;
    setSubmitting(true);
    try {
      await createInviteCode({
        businessId,
        name: codeName,
        services: selectedServices.map((s) => ({
          sub_category_id: s.id,
          sub_category_name: s.name,
        })),
      });
      setCodeName("");
      router.push({
        pathname: "/business-management/[id]/invite-codes",
        params: { id: String(businessId) },
      });
    } catch (error: any) {
      setModal({
        type: "error",
        title: "Error",
        message: error?.message || "Failed to create code. Please try again.",
        confirmLabel: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openManageCodes() {
    router.push({
      pathname: "/business-management/[id]/invite-codes",
      params: { id: String(businessId) },
    });
  }

  const tabs: { key: InviteTab; label: string }[] = [
    { key: "email", label: "By Email" },
    { key: "code", label: "Invite Code" },
  ];

  const servicesField = (
    <View style={styles.field}>
      <Text style={styles.label}>
        Services Permitted<Text style={styles.required}>*</Text>
      </Text>
      {services.length === 0 ? (
        <Text style={styles.emptyServices}>
          This business has no services yet. Add services before inviting
          members.
        </Text>
      ) : (
        <ServiceAssignmentChips
          selected={selectedServices}
          available={availableServices}
          disabled={submitting}
          onAdd={addService}
          onRemove={removeService}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader title="Add Member" />

        <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={primary[400]} />
          </View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, contentWidthStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "email" ? (
              <>
                <Text style={styles.description}>
                  This individual will receive an email with instructions to
                  create an account and join your team. Upon signing up they
                  will be automatically able to operate under your business.
                </Text>

                <View style={styles.field}>
                  <Text style={styles.label}>
                    Email Address <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="member@example.com"
                    placeholderTextColor={neutral[300]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>

                {servicesField}

                <View style={styles.field}>
                  <Text style={styles.label}>Message</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={message}
                    onChangeText={(value) =>
                      setMessage(value.slice(0, MESSAGE_MAX_LENGTH))
                    }
                    placeholder="Add a note to your invite..."
                    placeholderTextColor={neutral[300]}
                    multiline
                    textAlignVertical="top"
                    maxLength={MESSAGE_MAX_LENGTH}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.description}>
                  Create and share this code with anyone you&apos;d like to add
                  as a member of your business. While creating a Convenient
                  account they simply use this code to become a service
                  provider under your business.
                </Text>

                <View style={styles.field}>
                  <Text style={styles.label}>
                    Code Name <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={codeName}
                    onChangeText={setCodeName}
                    placeholder="ex: Weekend barbers"
                    placeholderTextColor={neutral[300]}
                    autoCapitalize="sentences"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                </View>

                {servicesField}

                <Text style={styles.hint}>
                  Everyone who signs up using this code will be permitted to
                  provide the selected services under your business. Codes are
                  valid for 48 hours.
                </Text>

                <TouchableOpacity
                  style={styles.manageLink}
                  onPress={openManageCodes}
                  activeOpacity={0.7}
                  hitSlop={8}
                >
                  <MaterialIcons name="vpn-key" size={22} color={primary[400]} />
                  <Text style={styles.manageLinkText}>
                    Manage existing codes ({existingCodeCount})
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        )}

        <View style={[styles.footer, contentWidthStyle]}>
          {activeTab === "email" ? (
            <Button
              title="Send Invite"
              variant="primary"
              size="lg"
              disabled={loading || !canSendInvite}
              loading={submitting}
              onPress={handleSendInvite}
            />
          ) : (
            <Button
              title="Create Code"
              variant="primary"
              size="lg"
              disabled={loading || !canCreateCode}
              loading={submitting}
              onPress={handleCreateCode}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={modal !== null}
        type={modal?.type ?? "error"}
        title={modal?.title ?? ""}
        message={modal?.message ?? ""}
        confirmLabel={modal?.confirmLabel}
        onConfirm={() => {
          const fn = modal?.onConfirm;
          setModal(null);
          fn?.();
        }}
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
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 22,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: text.primary,
    letterSpacing: -0.408,
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  required: {
    color: secondary[400],
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: text.primary,
    letterSpacing: -0.408,
  },
  inputMultiline: {
    height: 160,
    paddingTop: 14,
    paddingBottom: 14,
    lineHeight: 22,
  },
  emptyServices: {
    fontSize: 14,
    lineHeight: 20,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  hint: {
    fontSize: 15,
    lineHeight: 22,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  manageLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  manageLinkText: {
    fontSize: 17,
    fontWeight: "500",
    color: primary[400],
    letterSpacing: -0.408,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
});
