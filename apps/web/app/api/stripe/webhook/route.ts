// POST /api/stripe/webhook
//
// Stripe webhook endpoint. Configured to receive V2 "thin" events for
// connected account changes:
//
//   v2.core.account[requirements].updated
//   v2.core.account[configuration.recipient].capability_status_updated
//
// "Thin" events deliver only the event ID + type — the actual data is pulled
// in a follow-up API call (`events.retrieve`). This avoids stale payloads
// when the webhook is delayed or replayed.
//
// Local development:
//   stripe listen \
//     --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated' \
//     --forward-thin-to http://localhost:3000/api/stripe/webhook

import { NextRequest } from "next/server";
import { stripeClient, getWebhookSecret } from "@/lib/stripe";
import { syncUserVerification } from "@/lib/stripe-verification";

export async function POST(req: NextRequest) {
  // Stripe signs the raw request body — we MUST read it as text, not parse
  // it as JSON first, or the signature won't verify.
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return Response.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let notification;
  try {
    // parseEventNotification verifies the signature and returns the thin
    // event notification (id, type, related_object, etc.) — NOT the full
    // event data. Use fetchEvent() / events.retrieve() to load that.
    notification = await stripeClient.parseEventNotificationAsync(
      payload,
      signature,
      getWebhookSecret(),
    );
  } catch (err) {
    // Signature mismatch, expired timestamp, or malformed body. Return 400
    // so Stripe retries (and so you notice during local dev).
    console.error("[stripe webhook] signature verification failed:", err);
    return Response.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  // Route on event type. We acknowledge unknown types with 200 so Stripe
  // doesn't retry forever — add new handlers above as you subscribe to
  // more event types in the dashboard.
  switch (notification.type) {
    case "v2.core.account[requirements].updated": {
      // Requirements changed (e.g. new doc needed for ongoing compliance).
      // Pull the full event to see what's now due.
      const event = await stripeClient.v2.core.events.retrieve(notification.id);
      console.log(
        "[stripe webhook] requirements updated for account:",
        // `related_object.id` on V2 account events is the acct_... id.
        notification.related_object?.id,
        "event:",
        event.type,
      );
      // Reconcile the user's verification flag — a requirement clearing
      // can complete onboarding, and a new "currently_due" item can revoke
      // a previously verified user.
      await syncUserVerification(notification.related_object?.id);
      // TODO: notify the seller in your app (email, in-app banner, etc.)
      // so they know to revisit /stripe/onboard and submit the new info.
      break;
    }

    case "v2.core.account[configuration.recipient].capability_status_updated": {
      // The recipient capability (stripe_transfers) flipped status —
      // e.g. pending -> active (onboarding finished) or active -> inactive
      // (something went wrong; payouts paused).
      const event = await stripeClient.v2.core.events.retrieve(notification.id);
      console.log(
        "[stripe webhook] recipient capability updated for account:",
        notification.related_object?.id,
        "event:",
        event.type,
      );
      // Flip the user's isPersonVerified / isBusinessVerified flag to match.
      await syncUserVerification(notification.related_object?.id);
      // TODO: if newly active, unlock the seller's products in your
      // storefront; if inactive, hide them until status returns to active.
      break;
    }

    default:
      console.log(
        "[stripe webhook] unhandled event type:",
        notification.type,
      );
  }

  // Always 200 on accepted events — non-2xx triggers Stripe retries.
  return Response.json({ received: true });
}
