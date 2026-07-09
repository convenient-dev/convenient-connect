import { laravelFetch } from "./client";
import type { components } from "./generated/api-types";

type CountryItem = components["schemas"]["ProviderCountryItem"];
type StateItem = components["schemas"]["ProviderStateItem"];
type CityItem = components["schemas"]["ProviderCityItem"];

const PREFIX = "/service-provider/location";

export interface Country {
  id: number;
  name: string;
}

export interface State {
  id: number;
  name: string;
  countryId: number;
}

export interface City {
  id: number;
  name: string;
  stateId: number;
  stateCode: string;
}

export async function getCountries(search?: string): Promise<Country[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const data = await laravelFetch<CountryItem[]>(`${PREFIX}/countries${qs}`);
  return (data ?? []).map((c) => ({ id: c.id!, name: c.name! }));
}

export async function getStates(
  countryId: number,
  search?: string,
): Promise<State[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const data = await laravelFetch<StateItem[]>(
    `${PREFIX}/states/${countryId}${qs}`,
  );
  return (data ?? []).map((s) => ({
    id: s.id!,
    name: s.name!,
    countryId: s.country_id!,
  }));
}

export async function getCities(
  stateId: number,
  search?: string,
): Promise<City[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const data = await laravelFetch<CityItem[]>(
    `${PREFIX}/cities/${stateId}${qs}`,
  );
  return (data ?? []).map((c) => ({
    id: c.id!,
    name: c.name!,
    stateId: c.state_id!,
    stateCode: c.state_code ?? "",
  }));
}
