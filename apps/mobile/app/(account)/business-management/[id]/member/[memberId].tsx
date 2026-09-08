import { getBusinessForEdit } from "@/api/business";
import {
  addBusinessMemberService,
  getBusinessMember,
  removeBusinessMember,
  removeBusinessMemberService,
  resendBusinessMemberInvitation,
  type BusinessMember,
} from "@/api/business-members";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  ServiceAssignmentChips,
  type ServiceChipItem,
} from "@/components/ServiceChips";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, border, status } = Colors;

interface ModalState {
  type?: "success" | "error" | "warning";
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Hide the cancel button for informational (success/error) pop-ups. */
  showCancel?: boolean;
  onConfirm?: () => void | Promise<void>;
}

interface BusinessServicesData {
  business_id: number;
  services?: { sub_category_id: number; sub_category_name: string }[];
}

// The API returns joined_at preformatted (e.g. "Sep 07, 2026"). Reformat
// only when it parses as a real date; otherwise show it verbatim.
function formatJoinDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export default function ManageMemberScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; memberId: string }>();
  const businessId = Number(params.id);
  const memberId = Number(params.memberId);

  const [member, setMember] = useState<BusinessMember | null>(null);
  const [businessServices, setBusinessServices] = useState<ServiceChipItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);

  // TODO: Wire to a member-earnings endpoint once the API exposes one.
  const earningsTotal = 0;

  const showError = useCallback((message: string, onConfirm?: () => void) => {
    setModal({
      type: "error",
      title: "Error",
      message,
      confirmLabel: "OK",
      showCancel: false,
      onConfirm,
    });
  }, []);

  const load = useCallback(async () => {
    if (!businessId || !memberId) return;
    try {
      setLoading(true);
      const [memberData, businessData] = await Promise.all([
        getBusinessMember(businessId, memberId),
        getBusinessForEdit(businessId) as Promise<BusinessServicesData>,
      ]);
      setMember(memberData);
      setBusinessServices(
        (businessData.services ?? []).map((s) => ({
          id: s.sub_category_id,
          name: s.sub_category_name,
        })),
      );
    } catch (error: any) {
      showError(error?.message || "Failed to load member", () => router.back());
    } finally {
      setLoading(false);
    }
  }, [businessId, memberId, router, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const assigned = member?.assigned_service_sub_categories ?? [];
  const assignedItems: ServiceChipItem[] = assigned
    .filter((s) => typeof s.sub_category_id === "number")
    .map((s) => ({
      id: s.sub_category_id as number,
      name: s.sub_category_name ?? "Service",
    }));
  const assignedIds = assignedItems.map((s) => s.id);
  const available = businessServices.filter((s) => !assignedIds.includes(s.id));
  const isPending = member?.status === "pending";

  // -------------------------------------------------------------------------
  // Services
  // -------------------------------------------------------------------------

  function handleAddService(service: ServiceChipItem) {
    setModal({
      title: "Add Service",
      message: (
        <>
          Add <Text style={styles.bold}>{service.name}</Text> to this member?
          They will be able to provide it under your business.
        </>
      ),
      confirmLabel: "Add",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        setBusy(true);
        try {
          await addBusinessMemberService(businessId, memberId, service.id);
          await load();
        } catch (error: any) {
          showError(error?.message || "Failed to add service");
          await load();
        } finally {
          setBusy(false);
        }
      },
    });
  }

  function handleRemoveService(subCategoryId: number, name: string) {
    if (assignedIds.length <= 1) {
      setModal({
        type: "warning",
        title: "Can't Remove",
        message:
          "A member must have at least one service. Add another service before removing this one.",
        confirmLabel: "OK",
        showCancel: false,
      });
      return;
    }
    setModal({
      type: "warning",
      title: `Remove ${name}?`,
      message: (
        <>
          Once removed,{" "}
          <Text style={styles.bold}>
            {member?.name?.trim() || "this member"}
          </Text>{" "}
          will not be able to create listings under {name}.
        </>
      ),
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        setBusy(true);
        try {
          await removeBusinessMemberService(
            businessId,
            memberId,
            subCategoryId,
          );
          await load();
        } catch (error: any) {
          showError(error?.message || "Failed to remove service");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  // -------------------------------------------------------------------------
  // Member
  // -------------------------------------------------------------------------

  function handleResendInvitation() {
    setModal({
      title: "Resend Invitation?",
      message: `We'll email a new invitation to ${member?.email ?? "this member"} and extend its expiry by 7 days.`,
      confirmLabel: "Resend",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        setBusy(true);
        try {
          await resendBusinessMemberInvitation(memberId);
          setModal({
            type: "success",
            title: "Invitation Sent",
            message: "A new invitation email is on its way.",
            confirmLabel: "Done",
            showCancel: false,
          });
        } catch (error: any) {
          showError(error?.message || "Failed to resend invitation");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  function handleRemoveMember() {
    const label = member?.name?.trim() || member?.email || "this member";
    setModal({
      type: "warning",
      title: isPending ? "Cancel Invite?" : `Remove ${label}?`,
      message: isPending
        ? `This will cancel the pending invitation for ${label}. They will no longer be able to join your business using this invite.`
        : `This cannot be undone. Their account will be removed from your business.`,
      confirmLabel: isPending ? "Cancel Invite" : "Remove",
      cancelLabel: "Keep",
      onConfirm: async () => {
        setBusy(true);
        try {
          await removeBusinessMember(businessId, memberId);
          setModal({
            type: "success",
            title: "Success",
            message: isPending
              ? "The invitation has been cancelled."
              : "The member has been removed from your business.",
            confirmLabel: "Done",
            showCancel: false,
            // The business hub refetches members on focus.
            onConfirm: () => router.back(),
          });
        } catch (error: any) {
          showError(error?.message || "Failed to remove member");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const confirmModal = (
    <ConfirmModal
      visible={modal !== null}
      type={modal?.type ?? "warning"}
      title={modal?.title ?? ""}
      message={modal?.message ?? ""}
      confirmLabel={modal?.confirmLabel}
      cancelLabel={modal?.cancelLabel}
      onCancel={modal?.showCancel === false ? undefined : () => setModal(null)}
      onConfirm={() => {
        const fn = modal?.onConfirm;
        setModal(null);
        fn?.();
      }}
    />
  );

  if (loading || !member) {
    return (
      <SafeAreaView
        style={[styles.container, screenPaddingStyle]}
        edges={["top", "bottom"]}
      >
        <StatusBar style="dark" />
        <ScreenHeader title="Manage Member" />
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator size="large" color={primary[400]} />
          ) : (
            <Text style={styles.notFoundText}>Member not found</Text>
          )}
        </View>
        {confirmModal}
      </SafeAreaView>
    );
  }

  const joinDate = formatJoinDate(member.joined_at);
  const displayName = member.name?.trim() || "Unknown member";

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />

      <ScreenHeader title="Manage Member" />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {!!member.email && (
            <View style={styles.emailWrap}>
              <Text style={styles.email} numberOfLines={1} selectable>
                {member.email}
              </Text>
            </View>
          )}
          {isPending ? (
            <View style={styles.pendingBadge}>
              <MaterialIcons
                name="schedule"
                size={14}
                color={status.inactive}
              />
              <Text style={styles.pendingText}>Invitation pending</Text>
            </View>
          ) : (
            joinDate && <Text style={styles.joined}>Join {joinDate}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Provided Services</Text>
          <ServiceAssignmentChips
            selected={assignedItems}
            available={available}
            disabled={busy}
            onAdd={handleAddService}
            onRemove={(service) =>
              handleRemoveService(service.id, service.name)
            }
          />
          {available.length === 0 && businessServices.length > 0 && (
            <Text style={styles.helper}>
              This member already provides every service your business offers.
            </Text>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.earningsHeader}>
          <Text style={styles.sectionTitle}>Earnings History</Text>
          <Text style={styles.earningsTotal}>
            {formatCurrency(earningsTotal)}
          </Text>
        </View>

        <View style={styles.emptyEarnings}>
          <ExpoImage
            source={require("@/assets/global-icons/money.png")}
            style={styles.emptyIllustration}
            contentFit="contain"
          />
          <Text style={styles.emptyMessage}>No Earnings yet</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title={isPending ? "Cancel Invite" : "Remove"}
          variant="secondary"
          size="lg"
          disabled={busy}
          loading={busy}
          onPress={handleRemoveMember}
        />
        {isPending && (
          <Button
            title="Resend Invite"
            variant="ghost"
            size="md"
            disabled={busy}
            onPress={handleResendInvitation}
          />
        )}
      </View>

      {confirmModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  flex: { flex: 1 },
  center: {
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
    gap: 20,
  },

  identity: {
    alignItems: "center",
    gap: 6,
    paddingBottom: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  emailWrap: {
    paddingBottom: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: border.default,
  },
  email: {
    fontSize: 16,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  joined: {
    fontSize: 16,
    color: neutral[400],
    letterSpacing: -0.408,
    marginTop: 2,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  pendingText: {
    fontSize: 15,
    color: status.inactive,
    letterSpacing: -0.408,
  },

  section: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  helper: {
    fontSize: 13,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  bold: {
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: border.default,
  },

  earningsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  earningsTotal: {
    fontSize: 20,
    fontWeight: "700",
    color: status.active,
    letterSpacing: -0.408,
  },
  emptyEarnings: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyIllustration: {
    width: 100,
    height: 100,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[700],
    letterSpacing: -0.408,
  },
  emptyMessage: {
    fontSize: 14,
    color: neutral[300],
    textAlign: "center",
    letterSpacing: -0.408,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 10,
  },
});
