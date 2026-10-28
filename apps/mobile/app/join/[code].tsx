import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

/**
 * Deep-link target for shared invite links (`.../join/{code}`). Forwards to
 * the Join Business screen with the code prefilled. Signed-out users are
 * sent to the welcome screen by AuthContext and must enter the code again.
 */
export default function JoinLinkRedirect() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return (
    <Redirect
      href={{
        pathname: "/business-management/join",
        params: { code: code ?? "" },
      }}
    />
  );
}
