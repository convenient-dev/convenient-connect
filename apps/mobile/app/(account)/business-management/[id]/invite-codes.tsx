import {
  deleteInviteCode,
  listInviteCodes,
  type InviteCode,
} from "@/api/invite-codes";
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

type CodeTab = "active" | "expired";
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

function formatExpiry(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function InviteCodeCard({
  code,
  expired,
  copied,
  onCopy,
  onDelete,
}: {
  code: InviteCode;
  expired: boolean;
  copied: CopyKind | null;
  onCopy: (kind: CopyKind) => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.card, expired && styles.cardExpired]}>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {code.name}
      </Text>

      {code.services.length > 0 && (
        <ServiceChips
          services={code.services.map((s) => ({
            id: s.sub_category_id,
            name: s.sub_category_name,
          }))}
          size="sm"
          centered
        />
      )}

      <Text
        style={[styles.code, expired && styles.codeExpired]}
        selectable
        accessibilityLabel={`Invite code ${code.code.split("").join(" ")}`}
      >
        {code.code}
      </Text>

      {expired ? (
        <>
          <Text style={styles.expiredLabel}>
            Expired {formatExpiry(code.expires_at)}
          </Text>
          <TouchableOpacity
            style={styles.deleteLink}
            onPress={onDelete}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <MaterialIcons name="delete-outline" size={18} color={neutral[500]} />
            <Text style={styles.deleteLinkText}>Remove</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onCopy("code")}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={copied === "code" ? "check" : "content-copy"}
                size={20}
                color={copied === "code" ? status.active : text.primary}
              />
              <Text style={styles.actionText}>
                {copied === "code" ? "Copied" : "Copy code"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onCopy("link")}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={copied === "link" ? "check" : "link"}
                size={20}
                color={copied === "link" ? status.active : text.primary}
              />
              <Text style={styles.actionText}>
                {copied === "link" ? "Copied" : "Copy link"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.url} numberOfLines={1} selectable>
            {code.url}
          </Text>
          <Text style={styles.expiresLabel}>
            Expires {formatExpiry(code.expires_at)}
          </Text>
        </>
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
  const [expiredCodes, setExpiredCodes] = useState<InviteCode[]>([]);
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
      setExpiredCodes(codes.expired);
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
    await Clipboard.setStringAsync(kind === "code" ? code.code : code.url);
    setCopied({ id: code.id, kind });
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(null), 1800);
  }

  function handleDelete(code: InviteCode) {
    setModal({
      type: "warning",
      title: "Remove Code",
      message: `Remove the expired code "${code.name}" from this list?`,
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        try {
          await deleteInviteCode(code.id);
          await load();
        } catch (error: any) {
          setModal({
            type: "error",
            title: "Error",
            message: error?.message || "Failed to remove code",
            confirmLabel: "OK",
            showCancel: false,
          });
        }
      },
    });
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
    { key: "expired", label: "Expired" },
  ];
  const codes = activeTab === "active" ? activeCodes : expiredCodes;

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />

      <ScreenHeader title="Invite Codes" />

      <Text style={styles.description}>
        Create invite codes as needed, each one grants its own set of
        applicable services when activated.
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
                  : "No expired codes."}
              </Text>
            </View>
          ) : (
            codes.map((code) => (
              <InviteCodeCard
                key={code.id}
                code={code}
                expired={activeTab === "expired"}
                copied={copied?.id === code.id ? copied.kind : null}
                onCopy={(kind) => handleCopy(code, kind)}
                onDelete={() => handleDelete(code)}
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
    alignItems: "center",
    gap: 12,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  cardExpired: {
    opacity: 0.85,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "500",
    color: neutral[500],
    letterSpacing: -0.408,
  },
  code: {
    fontSize: 40,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: 1,
    paddingVertical: 2,
  },
  codeExpired: {
    color: neutral[300],
    textDecorationLine: "line-through",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[0],
  },
  actionText: {
    fontSize: 15,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  url: {
    fontSize: 14,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  expiresLabel: {
    fontSize: 12,
    color: neutral[300],
    letterSpacing: -0.408,
  },
  expiredLabel: {
    fontSize: 14,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  deleteLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deleteLinkText: {
    fontSize: 14,
    fontWeight: "500",
    color: neutral[500],
    letterSpacing: -0.408,
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
