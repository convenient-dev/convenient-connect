// POST /api/stripe/accounts
//
// Creates a Stripe Connect account for a user, using the V2 Accounts API.
// The platform (your application) is responsible for pricing and fee
// collection — accounts are created as "recipients" with the platform
// designated as both `fees_collector` and `losses_collector`.
//
// After this endpoint succeeds, the client should call
//   POST /api/stripe/accounts/[id]/link
// to generate an onboarding URL the user can visit to finish KYC.

import { NextRequest } from "next/server";
import { stripeClient } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // The userId identifies which local User row to attach the new
  // Stripe account ID to. In a real app this would come from the
  // authenticated session, not the request body.
  const userId = Number(body.userId);
  if (!userId || Number.isNaN(userId)) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // If the user already has a connected account, return it instead of
  // creating a duplicate. (Stripe Connect accounts cannot be deleted via
  // the API — only "closed" — so re-using existing accounts is important.)
  if (user.stripeAccountId) {
    return Response.json({ accountId: user.stripeAccountId, reused: true });
  }

  // Build a display name from what we have on the user row. Stripe will
  // show this name in dashboards and (where applicable) on receipts.
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    `User ${user.id}`;

  const contactEmail = user.email ?? body.contactEmail;
  if (!contactEmail) {
    return Response.json(
      { error: "User has no email; pass contactEmail in the request body" },
      { status: 400 },
    );
  }

  // V2 Accounts.create — do NOT pass `type: 'express' | 'standard' | 'custom'`
  // at the top level. The shape below is the canonical V2 form: a `recipient`
  // configuration with the `stripe_transfers` capability requested, and the
  // platform marked as the fees/losses collector via `defaults`.
  const account = await stripeClient.v2.core.accounts.create({
    display_name: displayName,
    contact_email: contactEmail,
    identity: {
      // ISO 3166-1 alpha-2 country code of the connected account holder.
      // Hardcoded to "us" for the demo — replace with the user's actual
      // country (e.g. read from the address record) in production.
      country: "us",
    },
    // Express dashboard gives the connected user a Stripe-hosted dashboard
    // to view balances, payouts, etc. without you building one.
    dashboard: "express",
    defaults: {
      responsibilities: {
        // Platform (you) collects Stripe's processing fees from the customer
        // charge and is on the hook for any losses (chargebacks, refunds).
        fees_collector: "application",
        losses_collector: "application",
      },
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            // Allows the connected account to receive transfers from your
            // platform balance (which is what Destination Charges produce).
            stripe_transfers: {
              requested: true,
            },
          },
        },
      },
    },
  });

  // Persist the mapping: local user row -> Stripe connected account id.
  // This is the only piece of Connect state we keep locally — everything
  // else (capabilities, requirements, payouts) is fetched live from Stripe.
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeAccountId: account.id },
  });

  return Response.json({ accountId: account.id, reused: false });
}
