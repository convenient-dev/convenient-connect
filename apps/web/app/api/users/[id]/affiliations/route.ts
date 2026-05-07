import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const affiliations = await prisma.businessAffiliation.findMany({
    where: { userId: Number(id) },
    include: {
      business: {
        include: { addresses: { include: { address: true } } },
      },
      services: {
        where: { deletedAt: null },
        select: {
          subcategory: {
            select: { category: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const businesses = affiliations.map((a) => {
    const seen = new Set<number>();
    const categories: { id: number; name: string }[] = [];
    for (const s of a.services) {
      const c = s.subcategory?.category;
      if (c && !seen.has(c.id)) {
        seen.add(c.id);
        categories.push(c);
      }
    }
    return {
      id: a.business.id,
      name: a.business.name,
      address: a.business.addresses[0]?.address.address ?? null,
      addressId: a.business.addresses[0]?.address.id ?? null,
      joinedAt: a.createdAt,
      categories,
    };
  });

  return Response.json(businesses);
}
