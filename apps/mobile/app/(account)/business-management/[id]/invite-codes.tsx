import { listInviteCodes, type InviteCode } from "@/api/invite-codes";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ServiceChips } from "@/components/ServiceChips";
import { TabBar } from "@/components/TabBar";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

type CodeTab = "active" | "used";
type CopyKind = "code" | "link";

interface ModalState {
  type: "success" | "error" | "warning";
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  onConfirm?: () => void | Promise<void>;
}

function CopyIconButton({
  icon,
  label,
  copied,
  onPress,
}: {
  icon: "content-copy" | "link";
  label: string;
  copied: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.iconButton}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={copied ? "Copied" : label}
    >
      <MaterialIcons
        name={copied ? "check" : icon}
        size={18}
        color={copied ? status.active : text.primary}
      />
    </TouchableOpacity>
  );
}

function InviteCodeCard({
  code,
  copied,
  onCopy,
}: {
  code: InviteCode;
  copied: CopyKind | null;
  onCopy: (kind: CopyKind) => void;
}) {
  const isActive = code.status === "active";
  const isExpired = code.status === "expired";

  const serviceChips = code.services.map((s) => ({
    id: s.sub_category_id,
    name: s.sub_category_name,
  }));

  return (
    <View style={[styles.card, !isActive && styles.cardInactive]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {code.name}
          </Text>
          <Text
            style={[styles.code, !isActive && styles.codeInactive]}
            selectable
            accessibilityLabel={`Invite code ${code.code.split("").join(" ")}`}
          >
            {code.code}
          </Text>
        </View>

        {isActive ? (
          <View style={styles.actions}>
            <CopyIconButton
              icon="content-copy"
              label="Copy code"
              copied={copied === "code"}
              onPress={() => onCopy("code")}
            />
            <CopyIconButton
              icon="link"
              label="Copy link"
              copied={copied === "link"}
              onPress={() => onCopy("link")}
            />
          </View>
        ) : (
          <View
            style={[styles.statusPill, isExpired && styles.statusPillExpired]}
          >
            <Text
              style={[
                styles.statusPillText,
                isExpired && styles.statusPillTextExpired,
              ]}
            >
              {isExpired ? "Expired" : "Used"}
            </Text>
          </View>
        )}
      </View>

      {serviceChips.length > 0 && (
        <View style={styles.cardServices}>
          <Text style={styles.servicesLabel}>
            Approved {serviceChips.length} services
          </Text>
          <ServiceChips services={serviceChips} size="sm" />
        </View>
      )}
    </View>
  );
}

export default function InviteCodesScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const businessId = Number(id);

  const [activeTab, setActiveTab] = useState<CodeTab>("active");
  const [activeCodes, setActiveCodes] = useState<InviteCode[]>([]);
  const [usedCodes, setUsedCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<{ id: number; kind: CopyKind } | null>(
    null,
  );
  const [modal, setModal] = useState<ModalState | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const codes = await listInviteCodes(businessId);
      setActiveCodes(codes.active);
      setUsedCodes(codes.used);
    } catch (error: any) {
      setModal({
        type: "error",
        title: "Error",
        message: error?.message || "Failed to load invite codes",
        confirmLabel: "OK",
        showCancel: false,
        onConfirm: () => router.back(),
      });
    } finally {
      setLoading(false);
    }
  }, [businessId, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  async function handleCopy(code: InviteCode, kind: CopyKind) {
    await Clipboard.setStringAsync(kind === "code" ? code.code : code.link);
    setCopied({ id: code.id, kind });
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(null), 1800);
  }

  function handleCreateCode() {
    // Return to the Add Member screen on its Invite Code tab.
    router.navigate({
      pathname: "/business-management/[id]/invite-member",
      params: { id: String(businessId), tab: "code" },
    });
  }

  const tabs: { key: CodeTab; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "used", label: "Used" },
  ];
  const codes = activeTab === "active" ? activeCodes : usedCodes;

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />

      <ScreenHeader title="Invite Codes" />

      <Text style={styles.description}>
        Create invite codes as needed, each one grants its own set of applicable
        services when activated.
      </Text>

      <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={primary[400]} />
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentWidthStyle]}
          showsVerticalScrollIndicator={false}
        >
          {codes.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons name="vpn-key" size={36} color={neutral[300]} />
              <Text style={styles.emptyText}>
                {activeTab === "active"
                  ? "No active codes. Create one to start inviting members."
                  : "No used or expired codes."}
              </Text>
            </View>
          ) : (
            codes.map((code) => (
              <InviteCodeCard
                key={code.id}
                code={code}
                copied={copied?.id === code.id ? copied.kind : null}
                onCopy={(kind) => handleCopy(code, kind)}
              />
            ))
          )}
        </ScrollView>
      )}

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Create Code"
          variant="primary"
          size="lg"
          onPress={handleCreateCode}
        />
      </View>

      <ConfirmModal
        visible={modal !== null}
        type={modal?.type ?? "warning"}
        title={modal?.title ?? ""}
        message={modal?.message ?? ""}
        confirmLabel={modal?.confirmLabel}
        cancelLabel={modal?.cancelLabel}
        onCancel={
          modal?.showCancel === false ? undefined : () => setModal(null)
        }
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
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: text.primary,
    letterSpacing: -0.408,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },

  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  cardInactive: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: neutral[500],
    letterSpacing: -0.408,
  },
  code: {
    fontSize: 26,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: 1,
  },
  codeInactive: {
    color: neutral[300],
    textDecorationLine: "line-through",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[0],
  },
  cardServices: {
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: neutral[200],
  },
  servicesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: neutral[400],
    letterSpacing: -0.408,
    textTransform: "uppercase",
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[100],
  },
  statusPillExpired: {
    borderColor: status.error,
    backgroundColor: neutral[0],
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: neutral[500],
    letterSpacing: -0.408,
  },
  statusPillTextExpired: {
    color: status.error,
  },

  empty: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: neutral[400],
    textAlign: "center",
    letterSpacing: -0.408,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
});
