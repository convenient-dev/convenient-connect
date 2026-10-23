import type { ServiceFormTemplate } from "../../api/service-management";

export type CurrencyContext = NonNullable<
  ServiceFormTemplate["currency_context"]
>;

export const ONLINE_REMOTE_CODE = "online_remote";
export const USD = "USD";

export interface ResolvedCurrency {
  /** The final three-letter code to submit as `currency`. */
  currency: string;
  /** Whether to show the Charge in USD toggle. */
  showChargeInUsd: boolean;
}

/**
 * Applies the USD override rules:
 * - Default currency USD: submit USD, hide the toggle.
 * - Otherwise, without `online_remote` (or when USD is not allowed): local code.
 * - Otherwise the toggle is offered; on submits USD, off submits the local code.
 *
 * `charge_in_usd` itself is frontend-only and must never be submitted.
 */
export function resolveCurrency(
  context: CurrencyContext | null | undefined,
  selection: { fulfillmentCodes?: string[]; chargeInUsd?: boolean },
): ResolvedCurrency {
  const local = context?.default_currency?.code ?? USD;
  const isUsd = context?.is_usd_currency ?? local === USD;
  if (isUsd) return { currency: USD, showChargeInUsd: false };

  const remote = (selection.fulfillmentCodes ?? []).includes(ONLINE_REMOTE_CODE);
  if (!remote || !context?.can_charge_in_usd) {
    return { currency: local, showChargeInUsd: false };
  }

  return {
    currency: selection.chargeInUsd ? USD : local,
    showChargeInUsd: true,
  };
}
