/**
 * Laravel provider home bootstrap (`GET /service-provider/home`): My Services
 * preview strip, location-scoped promotions and new pending requests.
 *
 * Portfolio, profile-image and promotion-banner storage paths are resolved to
 * absolute URLs so cards can render them directly.
 */
import { laravelFetch, toAbsoluteUrl } from "./client";
import type { components } from "./generated/api-types";

type Schemas = components["schemas"];

export type ProviderHomeData = Schemas["ProviderHomeData"];
export type ProviderHomeServiceCard = Schemas["ProviderHomeServiceCard"];
export type ProviderHomeMyServicesSection =
  Schemas["ProviderHomeMyServicesSection"];
export type ProviderHomeNewRequestItem = Schemas["ProviderHomeNewRequestItem"];
export type ProviderHomePortfolioImage = Schemas["ProviderHomePortfolioImage"];
export type ProviderHomePromotionItem = Schemas["ProviderHomePromotionItem"];

function resolvePortfolio(
  portfolio: ProviderHomePortfolioImage,
): ProviderHomePortfolioImage {
  return portfolio
    ? { url: toAbsoluteUrl(portfolio.url) ?? portfolio.url }
    : null;
}

export async function getProviderHome(): Promise<ProviderHomeData> {
  const data = await laravelFetch<ProviderHomeData>("/service-provider/home");
  return {
    ...data,
    my_services: {
      ...data.my_services,
      items: (data.my_services?.items ?? []).map((item) => ({
        ...item,
        portfolio: resolvePortfolio(item.portfolio),
      })),
    },
    provider_promotions: {
      ...data.provider_promotions,
      items: (data.provider_promotions?.items ?? []).map((item) => ({
        ...item,
        banner_url: toAbsoluteUrl(item.banner_url),
      })),
    },
    new_requests: {
      ...data.new_requests,
      items: (data.new_requests?.items ?? []).map((item) => ({
        ...item,
        customer: {
          ...item.customer,
          profile_image_url: toAbsoluteUrl(item.customer.profile_image_url),
        },
        service: {
          ...item.service,
          portfolio: resolvePortfolio(item.service.portfolio),
        },
      })),
    },
  };
}
