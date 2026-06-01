// Stripe client singleton.
//
// All Stripe API calls in the app go through the `stripeClient` exported from
// this file. Re-using a single client lets the underlying SDK pool HTTP
// connections and ensures every request uses the same API version (pinned by
// the SDK — currently 2026-04-22.dahlia).
//
// REQUIRED ENV VARS (set in apps/web/.env or your shell):
//   STRIPE_SECRET_KEY        — your platform's secret key, e.g. "sk_test_..."
//                              Get it from https://dashboard.stripe.com/apikeys
//   STRIPE_WEBHOOK_SECRET    — the signing secret for the webhook endpoint
//                              (used in app/api/stripe/webhook/route.ts).
//                              From `stripe listen` output, or the dashboard
//                              webhook destination's "Signing secret".

import Stripe from "stripe";

// Read the secret key once at module load. If it's missing we throw a clear
// error so the developer immediately sees what to fix instead of getting a
// confusing 401 from Stripe later.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  throw new Error(
    "[stripe] STRIPE_SECRET_KEY is not set. " +
      "Add it to apps/web/.env (e.g. STRIPE_SECRET_KEY=sk_test_...). " +
      "Find your key at https://dashboard.stripe.com/apikeys.",
  );
}

// Avoid re-instantiating the client across hot reloads in dev.
const globalForStripe = global as unknown as { stripeClient?: Stripe };

// IMPORTANT: do NOT pass `apiVersion` here — the SDK pins its own API version
// (2026-04-22.dahlia in 22.x). Overriding it can break typed responses.
export const stripeClient: Stripe =
  globalForStripe.stripeClient ?? new Stripe(STRIPE_SECRET_KEY);

if (process.env.NODE_ENV !== "production") {
  globalForStripe.stripeClient = stripeClient;
}

// Helper used by the webhook route. Throws a clear error if the signing
// secret is missing.
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "[stripe] STRIPE_WEBHOOK_SECRET is not set. " +
        "Run `stripe listen --thin-events ... --forward-thin-to <url>` and " +
        "copy the printed `whsec_...` value into apps/web/.env.",
    );
  }
  return secret;
}

// Public base URL used to build refresh/return URLs for Account Links and the
// Checkout success URL. Defaults to localhost for local dev. Override with
// NEXT_PUBLIC_APP_URL in your env when deploying.
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
