"use client";

// Client component used inside the storefront. Creates a Checkout Session
// for one product and redirects the browser to the hosted Stripe page.

import { useState } from "react";

const button: React.CSSProperties = {
  background: "#635bff",
  color: "#fff",
  border: 0,
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  marginTop: "auto",
};

export default function BuyButton({ productId }: { productId: string }) {
  const [busy, setBusy] = useState(false);

  async function buy() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Failed to start checkout");
      }
      window.location.href = json.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <button
      style={{ ...button, opacity: busy ? 0.6 : 1 }}
      onClick={buy}
      disabled={busy}
    >
      {busy ? "Starting…" : "Buy"}
    </button>
  );
}
