import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const affiliations = await prisma.businessAffiliation.findMany({
    where: { userId: Number(id) },
    include: { business: true },
  });

  const businesses = affiliations.map((a) => a.business);

  return Response.json(businesses);
}
