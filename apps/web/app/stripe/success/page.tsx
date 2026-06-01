// /stripe/success
//
// Landing page after a successful Stripe Checkout. We resolve the session
// id from the query string, fetch the session, and show a confirmation.

import { stripeClient } from "@/lib/stripe";

const wrap: React.CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  padding: "48px 24px 64px",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  color: "#111",
  lineHeight: 1.5,
  textAlign: "center",
};

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  // Next 16 file-convention: searchParams is a Promise.
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return (
      <main style={wrap}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Missing session id</h1>
        <p style={{ color: "#666", fontSize: 14 }}>
          This page should be opened from a completed Checkout redirect.
        </p>
      </main>
    );
  }

  // Retrieve the session so we can show the customer what they paid for.
  // payment_status is the authoritative flag — "paid" means the charge
  // succeeded and the funds will land in your platform balance shortly
  // (Stripe transfers the seller's share via the destination charge).
  const session = await stripeClient.checkout.sessions.retrieve(session_id);

  const paid = session.payment_status === "paid";

  return (
    <main style={wrap}>
      <div style={{ fontSize: 48 }}>{paid ? "✓" : "…"}</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginTop: 8 }}>
        {paid ? "Thanks for your purchase!" : "Payment pending"}
      </h1>
      <p style={{ color: "#666", fontSize: 14, marginTop: 8 }}>
        Status: <strong>{session.payment_status}</strong>
      </p>
      <p style={{ marginTop: 24 }}>
        <a href="/stripe/storefront" style={{ color: "#635bff" }}>
          Back to storefront
        </a>
      </p>
    </main>
  );
}
