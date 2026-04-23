import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: { addresses: { include: { address: true } } },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({
    ...user,
    address: user.addresses.map((ua) => ({
      id: ua.address.id,
      userId: ua.userId,
      address: ua.address.address,
      latitude: ua.address.latitude,
      longitude: ua.address.longitude,
      isDefault: ua.isDefault,
    })),
  });
}
