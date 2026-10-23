/**
 * Provider account status and suspension (`GET /service-provider/account-status`).
 *
 * The same three fields (provider_status, provider_status_label, suspension)
 * are also returned additively by the login endpoints and `/auth-user`, and in
 * the `data` of the 403 that marketplace write endpoints return while the
 * provider is suspended. This module maps all of those into one shape.
 */
import { ApiError, laravelFetch, SUSPENDED_ERROR_CODE } from "./client";
import type { components } from "./generated/api-types";

type ProviderAccountStatusData =
  components["schemas"]["ProviderAccountStatusData"];

export type ProviderSuspension = NonNullable<
  components["schemas"]["ProviderSuspensionSummary"]
>;
export type ProviderStatusCode = ProviderAccountStatusData["provider_status"];
export type ProviderStatusLabel =
  ProviderAccountStatusData["provider_status_label"];

export interface ProviderAccountStatus {
  /** 0=suspended, 1=active, 2=deleted. Null when the payload omitted it. */
  status: ProviderStatusCode | null;
  label: ProviderStatusLabel | null;
  /** Current open suspension; null when the account is active. */
  suspension: ProviderSuspension | null;
}

/** The additive status fields as they appear on login/auth-user payloads. */
export interface ProviderStatusFields {
  provider_status?: ProviderStatusCode | null;
  provider_status_label?: ProviderStatusLabel | null;
  suspension?: ProviderSuspension | null;
}

export const ACTIVE_ACCOUNT_STATUS: ProviderAccountStatus = {
  status: 1,
  label: "active",
  suspension: null,
};

export function mapProviderAccountStatus(
  data: ProviderStatusFields | null | undefined,
): ProviderAccountStatus {
  return {
    status: data?.provider_status ?? null,
    label: data?.provider_status_label ?? null,
    suspension: data?.suspension ?? null,
  };
}

export function isSuspendedStatus(
  status: ProviderAccountStatus | null | undefined,
): boolean {
  return status?.status === 0 || status?.label === "suspended";
}

/**
 * Current account status. Suspended providers stay authenticated and keep
 * read access; marketplace writes return 403 until reactivated.
 */
export async function getAccountStatus(): Promise<ProviderAccountStatus> {
  const data = await laravelFetch<ProviderAccountStatusData>(
    "/service-provider/account-status",
  );
  return mapProviderAccountStatus(data);
}

/**
 * Status carried by a suspended-provider 403, or null for any other error.
 * Lets a screen refresh its view of the account without a second request.
 */
export function getSuspendedErrorStatus(
  error: unknown,
): ProviderAccountStatus | null {
  if (!(error instanceof ApiError) || error.statusCode !== 403) return null;
  const data = error.data as (ProviderStatusFields & { code?: string }) | null;
  if (data?.code !== SUSPENDED_ERROR_CODE) return null;
  return mapProviderAccountStatus(data);
}
