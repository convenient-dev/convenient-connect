import { laravelFetch } from "./client";
import type { components } from "./generated/api-types";

type AddressModel = components["schemas"]["ProviderAddressModel"];
type AddressUpsert = components["schemas"]["ProviderAddressUpsertRequest"];

const PREFIX = "/service-provider/address";

export interface Address {
  id: number;
  userId: number;
  address: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

function mapAddress(m: AddressModel): Address {
  return {
    id: m.id!,
    userId: m.user_id!,
    address: m.address!,
    latitude: m.latitude!,
    longitude: m.longitude!,
    isDefault: m.is_default ?? false,
  };
}

export async function listAddresses(): Promise<Address[]> {
  const data = await laravelFetch<AddressModel[]>(PREFIX);
  return (data ?? []).map(mapAddress);
}

export async function createAddress(params: AddressUpsert): Promise<Address> {
  const data = await laravelFetch<AddressModel>(PREFIX, {
    method: "POST",
    body: params,
  });
  return mapAddress(data);
}

export async function getDefaultAddress(): Promise<Address | null> {
  try {
    const data = await laravelFetch<AddressModel>(`${PREFIX}/default`);
    return mapAddress(data);
  } catch (e: unknown) {
    if (e instanceof Error && "statusCode" in e && (e as any).statusCode === 404) {
      return null;
    }
    throw e;
  }
}

export async function getAddress(id: number): Promise<Address> {
  const data = await laravelFetch<AddressModel>(`${PREFIX}/${id}`);
  return mapAddress(data);
}

export async function updateAddress(
  id: number,
  params: AddressUpsert,
): Promise<Address> {
  const data = await laravelFetch<AddressModel>(`${PREFIX}/${id}`, {
    method: "PUT",
    body: params,
  });
  return mapAddress(data);
}

export async function deleteAddress(id: number): Promise<void> {
  await laravelFetch<unknown>(`${PREFIX}/${id}`, { method: "DELETE" });
}
