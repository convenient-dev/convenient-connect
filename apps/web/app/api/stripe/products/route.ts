// /api/stripe/products
//
// GET  — list all products on the platform (across all connected accounts).
//        The connected account each product belongs to is stored in
//        `metadata.connected_account_id` so the storefront can group / route
//        purchases without needing a separate DB table.
// POST — create a product at the PLATFORM level (not on the connected
//        account). We tag it with the connected account in metadata.

import { NextRequest } from "next/server";
import { stripeClient } from "@/lib/stripe";

const PRODUCT_LIST_LIMIT = 100;

export async function GET() {
  // Products are created on the platform, so we list with the platform key.
  // For a real storefront you'd paginate; the demo grabs the first 100.
  const products = await stripeClient.products.list({
    active: true,
    limit: PRODUCT_LIST_LIMIT,
    expand: ["data.default_price"],
  });

  // Shape only what the UI needs so we don't leak internal Stripe metadata.
  const data = products.data
    .filter((p) => p.metadata.connected_account_id) // demo products only
    .map((p) => {
      const price = p.default_price as
        | { id: string; unit_amount: number | null; currency: string }
        | null;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        connectedAccountId: p.metadata.connected_account_id,
        priceId: price?.id ?? null,
        unitAmount: price?.unit_amount ?? null,
        currency: price?.currency ?? "usd",
      };
    });

  return Response.json({ products: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // The seller's Stripe connected account ID — every product on the
  // storefront belongs to exactly one seller and proceeds (minus fee) are
  // routed there at checkout time.
  const connectedAccountId: string | undefined = body.connectedAccountId;
  const name: string | undefined = body.name?.trim();
  const description: string | undefined = body.description?.trim() || undefined;
  // Price in the smallest currency unit (e.g. cents for USD).
  const priceInCents = Number(body.priceInCents);
  const currency: string = (body.currency ?? "usd").toLowerCase();

  if (!connectedAccountId) {
    return Response.json(
      { error: "connectedAccountId is required" },
      { status: 400 },
    );
  }
  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  if (!Number.isFinite(priceInCents) || priceInCents <= 0) {
    return Response.json(
      { error: "priceInCents must be a positive integer" },
      { status: 400 },
    );
  }

  // Created on the platform account (no `stripeAccount` header) so the
  // platform owns pricing and inventory. The connected-account mapping
  // lives in metadata — that's how the storefront knows where to send
  // funds at checkout.
  const product = await stripeClient.products.create({
    name,
    description,
    default_price_data: {
      unit_amount: Math.round(priceInCents),
      currency,
    },
    metadata: {
      connected_account_id: connectedAccountId,
    },
  });

  return Response.json({ productId: product.id });
}
