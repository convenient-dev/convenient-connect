// /stripe/storefront
//
// Public-facing storefront. Server-rendered: we fetch products from Stripe
// at render time (grouped by connected account), and each item has a "Buy"
// form that POSTs to /api/stripe/checkout to start a hosted Checkout session.
//
// Server Component (no "use client") so we can call Stripe directly without
// exposing the secret key to the browser.

import { stripeClient } from "@/lib/stripe";
import BuyButton from "./BuyButton";

const wrap: React.CSSProperties = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "32px 24px 64px",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  color: "#111",
  lineHeight: 1.5,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: 16,
  marginTop: 16,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 8,
  padding: 16,
  background: "#fafafa",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

// Don't pre-render — the catalog is dynamic and changes whenever a seller
// adds a product. force-dynamic keeps Next from caching the page output.
export const dynamic = "force-dynamic";

export default async function StorefrontPage() {
  // List active platform products with their default prices in one round
  // trip. For demos we cap at 100; a real storefront should paginate.
  const products = await stripeClient.products.list({
    active: true,
    limit: 100,
    expand: ["data.default_price"],
  });

  // Only show products that have a connected_account_id (i.e. were created
  // through this demo) — and group them by seller for display.
  type Item = {
    id: string;
    name: string;
    description: string | null;
    unitAmount: number;
    currency: string;
    priceId: string;
  };

  const grouped = new Map<string, Item[]>();
  for (const p of products.data) {
    const acct = p.metadata.connected_account_id;
    if (!acct) continue;
    const price = p.default_price as
      | { id: string; unit_amount: number | null; currency: string }
      | null;
    if (!price || price.unit_amount == null) continue;

    const item: Item = {
      id: p.id,
      name: p.name,
      description: p.description,
      unitAmount: price.unit_amount,
      currency: price.currency,
      priceId: price.id,
    };
    if (!grouped.has(acct)) grouped.set(acct, []);
    grouped.get(acct)!.push(item);
  }

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 8px" }}>
        Storefront
      </h1>
      <p style={{ color: "#666", fontSize: 13, margin: "0 0 24px" }}>
        Products from every onboarded seller. Clicking Buy starts a
        Stripe-hosted checkout that pays the seller (minus the platform fee).
      </p>

      {grouped.size === 0 && (
        <p style={{ fontSize: 14, color: "#666" }}>
          No products yet — create one on{" "}
          <a href="/stripe/products" style={{ color: "#635bff" }}>
            the products page
          </a>
          .
        </p>
      )}

      {[...grouped.entries()].map(([accountId, items]) => (
        <section key={accountId} style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#666" }}>
            Seller:{" "}
            <span style={{ fontFamily: "monospace", color: "#111" }}>
              {accountId}
            </span>
          </h2>
          <div style={grid}>
            {items.map((item) => (
              <div key={item.id} style={card}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{item.name}</div>
                {item.description && (
                  <div style={{ fontSize: 13, color: "#666" }}>
                    {item.description}
                  </div>
                )}
                <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>
                  {(item.unitAmount / 100).toLocaleString(undefined, {
                    style: "currency",
                    currency: item.currency.toUpperCase(),
                  })}
                </div>
                <BuyButton productId={item.id} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
