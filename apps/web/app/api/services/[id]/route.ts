import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: { id: Number(id) },
    include: {
      images: true,
      certifications: true,
      addons: true,
      customValues: { include: { field: true } },
      subcategory: { include: { category: true } },
      address: true,
      business: { include: { business: true } },
    },
  });

  if (!service) {
    return Response.json({ error: "Service not found" }, { status: 404 });
  }

  return Response.json(service);
}
