/**
 * Laravel provider home bootstrap (`GET /service-provider/home`): My Services
 * preview strip, location-scoped promotions and new pending requests.
 *
 * Portfolio storage paths are resolved to absolute URLs so cards can render
 * them directly.
 */
import { laravelFetch, toAbsoluteUrl } from "./client";
import type { components } from "./generated/api-types";

type Schemas = components["schemas"];

export type ProviderHomeData = Schemas["ProviderHomeData"];
export type ProviderHomeServiceCard = Schemas["ProviderHomeServiceCard"];
export type ProviderHomeMyServicesSection =
  Schemas["ProviderHomeMyServicesSection"];

export async function getProviderHome(): Promise<ProviderHomeData> {
  const data = await laravelFetch<ProviderHomeData>("/service-provider/home");
  return {
    ...data,
    my_services: {
      ...data.my_services,
      items: (data.my_services?.items ?? []).map((item) => ({
        ...item,
        portfolio: item.portfolio
          ? { url: toAbsoluteUrl(item.portfolio.url) ?? item.portfolio.url }
          : null,
      })),
    },
  };
}
