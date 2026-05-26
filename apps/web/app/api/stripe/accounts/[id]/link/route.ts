// POST /api/stripe/accounts/[id]/link
//
// Creates a Stripe-hosted Account Link the connected account can visit to
// complete onboarding (identity verification, bank account, etc.).
//
// Account Links are short-lived URLs (a few minutes). The user clicks the
// link, finishes onboarding, then Stripe redirects them to `return_url`.

import { NextRequest } from "next/server";
import { stripeClient, getAppUrl } from "@/lib/stripe";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // `id` here is the Stripe account ID (e.g. "acct_..."), NOT the local
  // user id. The onboarding flow keys off the Stripe account directly.
  const { id: accountId } = await params;

  const appUrl = getAppUrl();

  // V2 account_links.create. `use_case.type` must be 'account_onboarding'
  // for the initial KYC flow. `configurations: ['recipient']` matches the
  // capability we requested when creating the account.
  const accountLink = await stripeClient.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        // refresh_url: where Stripe sends the user if the link expires
        // before they finish. We just bounce them back to the onboarding
        // page, which will fetch fresh status and regenerate the link.
        refresh_url: `${appUrl}/stripe/onboard?accountId=${accountId}`,
        // return_url: where Stripe sends the user when onboarding completes
        // (or they exit early). The page re-fetches account status from
        // Stripe to decide what to show next.
        return_url: `${appUrl}/stripe/onboard?accountId=${accountId}`,
      },
    },
  });

  return Response.json({ url: accountLink.url });
}
