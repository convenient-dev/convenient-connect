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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  const data: { aboutMe?: string | null } = {};
  if ("aboutMe" in body) {
    data.aboutMe = typeof body.aboutMe === "string" ? body.aboutMe : null;
  }

  if (Object.keys(data).length === 0) {
    return Response.json(
      { error: "No supported fields to update" },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data,
    select: { id: true, aboutMe: true },
  });

  return Response.json(user);
}
