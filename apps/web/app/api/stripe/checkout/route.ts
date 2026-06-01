// POST /api/stripe/checkout
//
// Creates a Stripe-hosted Checkout Session for a single product.
// Uses a "Destination Charge" so the customer pays the platform, the platform
// keeps an `application_fee_amount`, and the rest is routed to the seller's
// connected account.
//
// Body: { productId: "prod_..." }

import { NextRequest } from "next/server";
import { stripeClient, getAppUrl } from "@/lib/stripe";

// Platform fee charged on every sale — 10% in the demo. Adjust to your
// real business model (or compute per-product).
const APPLICATION_FEE_BPS = 1_000; // 10.00%

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const productId: string | undefined = body.productId;
  if (!productId) {
    return Response.json({ error: "productId is required" }, { status: 400 });
  }

  // Look up the product (with its default price) to figure out (a) how much
  // to charge and (b) which connected account should receive the funds. The
  // connected account is stored in metadata when the product is created.
  const product = await stripeClient.products.retrieve(productId, {
    expand: ["default_price"],
  });

  const price = product.default_price as
    | { id: string; unit_amount: number | null; currency: string }
    | null;
  const connectedAccountId = product.metadata?.connected_account_id;

  if (!price || price.unit_amount == null) {
    return Response.json(
      { error: "Product has no default_price" },
      { status: 400 },
    );
  }
  if (!connectedAccountId) {
    return Response.json(
      { error: "Product is missing connected_account_id metadata" },
      { status: 400 },
    );
  }

  // Application fee: percentage of the unit amount, rounded to the nearest
  // smallest-currency-unit (cent). Must be a non-negative integer.
  const applicationFeeAmount = Math.round(
    (price.unit_amount * APPLICATION_FEE_BPS) / 10_000,
  );

  const appUrl = getAppUrl();

  const session = await stripeClient.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    payment_intent_data: {
      // The fee the platform keeps. The remainder is transferred to
      // `transfer_data.destination` after the charge succeeds.
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: connectedAccountId,
      },
    },
    // {CHECKOUT_SESSION_ID} is replaced by Stripe at redirect time so the
    // success page can look up the session for confirmation details.
    success_url: `${appUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/stripe/storefront`,
  });

  return Response.json({ url: session.url });
}
