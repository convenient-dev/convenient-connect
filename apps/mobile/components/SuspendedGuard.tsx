import { useAuth } from "@/auth/AuthContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Colors } from "@/constants/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

const { background } = Colors;

const SUSPENDED_TITLE = "Account suspended";

function suspendedMessage(reason: string | undefined): string {
  return [
    reason,
    "You can't create, edit or delete services, businesses or members until your account is reactivated.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Action-level guard for screens that mix reads with marketplace writes.
 * `guard(action)` runs the action when the account is active and otherwise
 * shows the suspended modal; render `suspendedModal` alongside the screen.
 * The account status is re-read when the screen mounts.
 */
export function useSuspendedGuard() {
  const { isSuspended, user, refreshAccountStatus } = useAuth();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    refreshAccountStatus();
  }, [refreshAccountStatus]);

  const guard = useCallback(
    (action: () => void) => {
      if (isSuspended) setBlocked(true);
      else action();
    },
    [isSuspended],
  );

  const suspendedModal = (
    <ConfirmModal
      visible={blocked}
      type="error"
      title={SUSPENDED_TITLE}
      message={suspendedMessage(user?.accountStatus.suspension?.reason)}
      confirmLabel="OK"
      onConfirm={() => setBlocked(false)}
    />
  );

  return { isSuspended, guard, suspendedModal };
}

/**
 * Wraps screens whose only purpose is a marketplace write (create, edit or
 * delete a service, business or member). The account status is re-read when
 * the screen opens. While the provider is suspended the screen content is
 * withheld and an error modal sends the user back, because the API would
 * reject every save with 403.
 */
export function SuspendedGuard({ children }: { children: React.ReactNode }) {
  const { isSuspended, user, refreshAccountStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    refreshAccountStatus();
  }, [refreshAccountStatus]);

  if (!isSuspended) return <>{children}</>;

  return (
    <View style={styles.screen}>
      <ConfirmModal
        visible
        type="error"
        title={SUSPENDED_TITLE}
        message={suspendedMessage(user?.accountStatus.suspension?.reason)}
        confirmLabel="Go back"
        onConfirm={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/home");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: background.screen,
  },
});
