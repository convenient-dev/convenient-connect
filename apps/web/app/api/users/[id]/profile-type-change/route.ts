import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

// Submit a profile type change request — marks the user's profile type as pending review.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = Number(id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, profileTypeStatus: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (user.profileTypeStatus === "pending") {
    return Response.json(
      { error: "A profile type change is already under review" },
      { status: 409 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { profileTypeStatus: "pending" },
    select: { id: true, accountType: true, profileTypeStatus: true },
  });

  return Response.json(updated, { status: 201 });
}
