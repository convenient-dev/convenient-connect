import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const services = await prisma.service.findMany({
    where: { userId: Number(id) },
    select: {
      id: true,
      title: true,
      status: true,
      serviceType: true,
      serviceMode: true,
      baseRate: true,
      baseRateUnit: true,
      description: true,
      areaRadius: true,
      createdAt: true,
      images: {
        take: 1,
        orderBy: { id: "asc" },
        select: { url: true },
      },
      subcategory: {
        select: {
          name: true,
          category: { select: { name: true } },
        },
      },
      business: {
        select: {
          business: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(services);
}
