"use client";

// /stripe/onboard
//
// Demo UI for the seller-side onboarding flow:
//   1. Enter a local user id (in production this would come from auth).
//   2. Click "Create connected account" — calls POST /api/stripe/accounts,
//      which creates the V2 account and stores the acct_... id on the user.
//   3. Click "Onboard to collect payments" — calls POST /api/stripe/accounts/[id]/link
//      and redirects the browser to the Stripe-hosted onboarding flow.
//   4. After completing onboarding (or hitting refresh_url), Stripe sends
//      the user back here. We re-fetch live status from the API.

import { useCallback, useEffect, useState } from "react";

type AccountStatus = {
  accountId: string;
  displayName: string | null;
  readyToReceivePayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string | null;
};

const wrap: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "32px 24px 64px",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  color: "#111",
  lineHeight: 1.5,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 8,
  padding: 20,
  marginTop: 16,
  background: "#fafafa",
};

const button: React.CSSProperties = {
  background: "#635bff", // Stripe purple
  color: "#fff",
  border: 0,
  borderRadius: 6,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 14,
  border: "1px solid #ccc",
  borderRadius: 6,
  marginTop: 4,
};

export default function OnboardPage() {
  const [userId, setUserId] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On first render, pick up an accountId from the URL — that's how Stripe
  // sends the seller back after the hosted onboarding flow finishes.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("accountId");
    if (fromUrl) setAccountId(fromUrl);
  }, []);

  const refreshStatus = useCallback(async (acct: string) => {
    setError(null);
    const res = await fetch(`/api/stripe/accounts/${acct}/status`);
    if (!res.ok) {
      setError("Failed to load account status");
      return;
    }
    setStatus(await res.json());
  }, []);

  // Whenever we know an accountId, fetch its live status from Stripe.
  useEffect(() => {
    if (accountId) refreshStatus(accountId);
  }, [accountId, refreshStatus]);

  async function createAccount() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: Number(userId) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create account");
      setAccountId(json.accountId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function startOnboarding() {
    if (!accountId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/stripe/accounts/${accountId}/link`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create link");
      // Redirect the browser to the Stripe-hosted onboarding URL.
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 8px" }}>
        Stripe Connect onboarding
      </h1>
      <p style={{ color: "#666", fontSize: 13, margin: "0 0 24px" }}>
        Create a connected account for a user and walk them through the
        Stripe-hosted onboarding flow.
      </p>

      {!accountId && (
        <section style={card}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>
            Local user id
            <input
              style={input}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. 1"
              inputMode="numeric"
            />
          </label>
          <div style={{ marginTop: 16 }}>
            <button
              style={{ ...button, opacity: busy || !userId ? 0.6 : 1 }}
              onClick={createAccount}
              disabled={busy || !userId}
            >
              {busy ? "Creating…" : "Create connected account"}
            </button>
          </div>
        </section>
      )}

      {accountId && (
        <section style={card}>
          <div style={{ fontSize: 13, color: "#666" }}>Connected account</div>
          <div style={{ fontFamily: "monospace", fontSize: 14, marginTop: 2 }}>
            {accountId}
          </div>

          {status ? (
            <div style={{ marginTop: 16, fontSize: 14 }}>
              <Row label="Display name" value={status.displayName ?? "—"} />
              <Row
                label="Onboarding complete"
                value={status.onboardingComplete ? "Yes" : "No"}
                ok={status.onboardingComplete}
              />
              <Row
                label="Ready to receive payments"
                value={status.readyToReceivePayments ? "Yes" : "No"}
                ok={status.readyToReceivePayments}
              />
              <Row
                label="Requirements status"
                value={status.requirementsStatus ?? "—"}
              />
            </div>
          ) : (
            <p style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
              Loading status…
            </p>
          )}

          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            <button
              style={{ ...button, opacity: busy ? 0.6 : 1 }}
              onClick={startOnboarding}
              disabled={busy}
            >
              {status?.onboardingComplete
                ? "Update onboarding info"
                : "Onboard to collect payments"}
            </button>
            <button
              style={{
                ...button,
                background: "#fff",
                color: "#111",
                border: "1px solid #ccc",
              }}
              onClick={() => refreshStatus(accountId)}
            >
              Refresh status
            </button>
          </div>
        </section>
      )}

      {error && (
        <p style={{ marginTop: 16, color: "#c00", fontSize: 14 }}>{error}</p>
      )}

      <p style={{ marginTop: 32, fontSize: 13, color: "#666" }}>
        Next: <a href="/stripe/products" style={{ color: "#635bff" }}>
          create a product
        </a>{" "}
        or{" "}
        <a href="/stripe/storefront" style={{ color: "#635bff" }}>
          visit the storefront
        </a>
        .
      </p>
    </main>
  );
}

function Row({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid #eee",
      }}
    >
      <span style={{ color: "#666" }}>{label}</span>
      <span
        style={{
          fontWeight: 500,
          color: ok === undefined ? "#111" : ok ? "#0a7d28" : "#c00",
        }}
      >
        {value}
      </span>
    </div>
  );
}
