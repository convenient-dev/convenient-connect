import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

// GET /api/users/:id/availability
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = Number(id);

  // Validate userId
  if (!Number.isInteger(userId) || userId <= 0) {
    return Response.json({ error: "Invalid user id" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      availabilityEnabled: true,
      weeklyAvailabilitySlots: {
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      availabilityOverrideDays: {
        select: {
          id: true,
          date: true,
          isAvailable: true,
          slots: {
            select: { id: true, startTime: true, endTime: true },
            orderBy: { startTime: "asc" },
          },
        },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json(user);
}
