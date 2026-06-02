// Shared Stripe Connect verification logic.
//
// A connected account is "verified" (ready to transact) when BOTH:
//   1. its stripe_transfers capability is "active", AND
//   2. it has no outstanding requirements (nothing currently_due/past_due).
//
// Either condition alone is insufficient — Stripe can mark the capability
// "active" while future requirements are still pending. This single source of
// truth is used by:
//   - the webhook (POST /api/stripe/webhook), reacting to async status changes
//   - the status endpoint (GET /api/stripe/accounts/[id]/status), which runs
//     on the synchronous return_url redirect after the user finishes the
//     Stripe-hosted flow. Persisting here means the User row is reconciled even
//     when the webhook is delayed, undelivered, or not configured (e.g. local).

import { stripeClient } from "@/lib/stripe";
import prisma from "@/lib/prisma";

// The shape returned by accounts.retrieve with the includes we use below.
type ConnectedAccount = Awaited<
  ReturnType<typeof stripeClient.v2.core.accounts.retrieve>
>;

// Pure check: is this account fully onboarded (capability active AND no
// outstanding requirements)?
export function isAccountVerified(account: ConnectedAccount): boolean {
  const capabilityActive =
    account.configuration?.recipient?.capabilities?.stripe_balance
      ?.stripe_transfers?.status === "active";
  const requirementsStatus =
    account.requirements?.summary?.minimum_deadline?.status;
  return (
    capabilityActive &&
    requirementsStatus !== "currently_due" &&
    requirementsStatus !== "past_due"
  );
}

// Pulls live status for a connected account and reconciles the matching User
// row's verification flags. Idempotent — safe to call multiple times for the
// same account; we only write if the flag actually changes.
//
// Pass `prefetchedAccount` to reuse an account object the caller already
// retrieved (the status endpoint does), avoiding a redundant Stripe API call.
export async function syncUserVerification(
  accountId: string | undefined,
  prefetchedAccount?: ConnectedAccount,
): Promise<void> {
  if (!accountId) return;

  const user = await prisma.user.findUnique({
    where: { stripeAccountId: accountId },
    select: {
      id: true,
      accountType: true,
      isPersonVerified: true,
      isBusinessVerified: true,
    },
  });
  if (!user) {
    console.warn("[stripe] no user mapped to account:", accountId);
    return;
  }

  const account =
    prefetchedAccount ??
    (await stripeClient.v2.core.accounts.retrieve(accountId, {
      include: ["configuration.recipient", "requirements"],
    }));
  const verified = isAccountVerified(account);

  // Which flag flips depends on the user's account type. A business user
  // verifies via the business path; individuals via the person path.
  const isBusiness = user.accountType === "business";
  const current = isBusiness ? user.isBusinessVerified : user.isPersonVerified;
  if (current === verified) return; // no-op, avoid pointless writes

  await prisma.user.update({
    where: { id: user.id },
    data: isBusiness
      ? { isBusinessVerified: verified }
      : { isPersonVerified: verified },
  });
  console.log(
    `[stripe] user ${user.id} ${
      isBusiness ? "isBusinessVerified" : "isPersonVerified"
    } -> ${verified}`,
  );
}
