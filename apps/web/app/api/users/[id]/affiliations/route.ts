import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const affiliations = await prisma.businessAffiliation.findMany({
    where: { userId: Number(id) },
    include: { business: { include: { addresses: { include: { address: true } } } } },
  });

  const businesses = affiliations.map((a) => ({
    id: a.business.id,
    name: a.business.name,
    address: a.business.addresses[0]?.address.address ?? null,
    addressId: a.business.addresses[0]?.address.id ?? null,
  }));

  return Response.json(businesses);
}
