// GET /api/stripe/accounts/[id]/status
//
// Returns the live onboarding status of a connected account. We deliberately
// fetch this from Stripe on every call rather than mirroring it into the DB —
// requirements can change at any time (regulator/network updates, expiring
// docs) and the API is always the source of truth.
//
// This endpoint is also hit on the Stripe return_url redirect (the user lands
// back on /stripe/onboard after finishing the hosted flow), so we reconcile
// the User row's verification flags here too. That guarantees the flag is set
// even if the corresponding webhook is delayed, dropped, or not configured
// (e.g. local dev without `stripe listen`).

import { NextRequest } from "next/server";
import { stripeClient } from "@/lib/stripe";
import { syncUserVerification } from "@/lib/stripe-verification";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: accountId } = await params;

  // `include` fetches optional fields. Without these, the response won't
  // contain the recipient configuration or requirements summary.
  const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
    include: ["configuration.recipient", "requirements"],
  });

  // Is the stripe_transfers capability "active"? That's the bit that
  // controls whether we can route money to this account via a Destination
  // Charge. Until it flips to "active", checkout will fail for this seller.
  const readyToReceivePayments =
    account?.configuration?.recipient?.capabilities?.stripe_balance
      ?.stripe_transfers?.status === "active";

  // The requirements summary tells us if Stripe is waiting on more info.
  // "currently_due" or "past_due" mean we need to send the user back
  // through the onboarding link to provide additional details.
  const requirementsStatus =
    account.requirements?.summary?.minimum_deadline?.status;
  const onboardingComplete =
    requirementsStatus !== "currently_due" &&
    requirementsStatus !== "past_due";

  // Persist the verification flag on the mapped User row, reusing the account
  // we just fetched so we don't hit Stripe twice. Idempotent — only writes
  // when the flag actually changes.
  await syncUserVerification(account.id, account);

  return Response.json({
    accountId: account.id,
    displayName: account.display_name,
    readyToReceivePayments,
    onboardingComplete,
    requirementsStatus: requirementsStatus ?? null,
    // Include the raw requirements summary so the UI can show what's
    // missing if onboarding is incomplete.
    requirements: account.requirements ?? null,
  });
}
