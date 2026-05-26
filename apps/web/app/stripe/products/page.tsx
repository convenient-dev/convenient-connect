"use client";

// /stripe/products
//
// Demo UI for creating a product on the platform that's owned by (i.e.
// proceeds routed to) a specific connected account.

import { useState } from "react";

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

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 14,
  border: "1px solid #ccc",
  borderRadius: 6,
  marginTop: 4,
};

const button: React.CSSProperties = {
  background: "#635bff",
  color: "#fff",
  border: 0,
  borderRadius: 6,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

export default function ProductsPage() {
  const [connectedAccountId, setConnectedAccountId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // Price in dollars; we convert to cents before sending to the API.
  const [priceUsd, setPriceUsd] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectedAccountId,
          name,
          description,
          priceInCents: Math.round(Number(priceUsd) * 100),
          currency: "usd",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create product");
      setMessage(`Created product ${json.productId}`);
      setName("");
      setDescription("");
      setPriceUsd("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 8px" }}>
        Create a product
      </h1>
      <p style={{ color: "#666", fontSize: 13, margin: "0 0 24px" }}>
        Products live on the platform; the connected account id is stored in
        the product&apos;s metadata and used at checkout to route funds.
      </p>

      <form onSubmit={submit} style={card}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600 }}>
          Connected account id
          <input
            style={input}
            value={connectedAccountId}
            onChange={(e) => setConnectedAccountId(e.target.value)}
            placeholder="acct_..."
            required
          />
        </label>

        <label
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            marginTop: 16,
          }}
        >
          Name
          <input
            style={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            marginTop: 16,
          }}
        >
          Description
          <input
            style={input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            marginTop: 16,
          }}
        >
          Price (USD)
          <input
            style={input}
            value={priceUsd}
            onChange={(e) => setPriceUsd(e.target.value)}
            inputMode="decimal"
            placeholder="19.99"
            required
          />
        </label>

        <div style={{ marginTop: 20 }}>
          <button
            type="submit"
            style={{ ...button, opacity: busy ? 0.6 : 1 }}
            disabled={busy}
          >
            {busy ? "Creating…" : "Create product"}
          </button>
        </div>
      </form>

      {message && (
        <p style={{ marginTop: 16, color: "#0a7d28", fontSize: 14 }}>
          {message}
        </p>
      )}
      {error && (
        <p style={{ marginTop: 16, color: "#c00", fontSize: 14 }}>{error}</p>
      )}

      <p style={{ marginTop: 32, fontSize: 13, color: "#666" }}>
        See all listings on the{" "}
        <a href="/stripe/storefront" style={{ color: "#635bff" }}>
          storefront
        </a>
        .
      </p>
    </main>
  );
}
