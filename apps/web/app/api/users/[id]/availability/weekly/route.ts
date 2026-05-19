import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

interface SlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

function validateSlot(slot: unknown): SlotInput | string {
  if (!slot || typeof slot !== "object") return "Slot must be an object";
  const { dayOfWeek, startTime, endTime } = slot as Record<string, unknown>;
  if (
    typeof dayOfWeek !== "number" ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6
  ) {
    return "dayOfWeek must be an integer from 0 (Sunday) to 6 (Saturday)";
  }
  if (typeof startTime !== "string" || !TIME_REGEX.test(startTime)) {
    return "startTime must be in HH:mm format";
  }
  if (typeof endTime !== "string" || !TIME_REGEX.test(endTime)) {
    return "endTime must be in HH:mm format";
  }
  if (startTime >= endTime) {
    return "startTime must be before endTime";
  }
  return { dayOfWeek, startTime, endTime };
}

// Add a single weekly availability slot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Validate user id
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return Response.json({ error: "Invalid user id" }, { status: 400 });
  }

  // Validate body and slot data
  const body = await req.json();
  const result = validateSlot(body);
  if (typeof result === "string") {
    return Response.json({ error: result }, { status: 400 });
  }

  // Check user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Create the slot
  const slot = await prisma.weeklyAvailabilitySlot.create({
    data: { userId, ...result },
    select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
  });

  return Response.json(slot, { status: 201 });
}

// Replace the full set of weekly availability slots for this user.
// Use this to add and remove multiple slots in a single request — slots
// present in the body are kept/created, anything else is deleted.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return Response.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await req.json();
  const slotsInput = body?.slots;
  if (!Array.isArray(slotsInput)) {
    return Response.json({ error: "slots must be an array" }, { status: 400 });
  }

  const validated: SlotInput[] = [];
  for (let i = 0; i < slotsInput.length; i++) {
    const result = validateSlot(slotsInput[i]);
    if (typeof result === "string") {
      return Response.json(
        { error: `slots[${i}]: ${result}` },
        { status: 400 },
      );
    }
    validated.push(result);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const slots = await prisma.$transaction(async (tx) => {
    await tx.weeklyAvailabilitySlot.deleteMany({ where: { userId } });
    if (validated.length > 0) {
      await tx.weeklyAvailabilitySlot.createMany({
        data: validated.map((s) => ({ userId, ...s })),
      });
    }
    return tx.weeklyAvailabilitySlot.findMany({
      where: { userId },
      select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  });

  return Response.json(slots);
}
