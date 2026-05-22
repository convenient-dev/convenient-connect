import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface OverrideSlotInput {
  startTime: string; // "HH:mm" 24-hour
  endTime: string; // "HH:mm" 24-hour
}

interface OverrideDayInput {
  date: string; // "YYYY-MM-DD"
  isAvailable: boolean;
  slots: OverrideSlotInput[];
}

function validateOverride(o: unknown): OverrideDayInput | string {
  if (!o || typeof o !== "object") return "must be an object";
  const { date, isAvailable, slots } = o as Record<string, unknown>;
  if (typeof date !== "string" || !DATE_REGEX.test(date)) {
    return "date must be YYYY-MM-DD";
  }
  if (typeof isAvailable !== "boolean") {
    return "isAvailable must be a boolean";
  }
  if (!Array.isArray(slots)) {
    return "slots must be an array";
  }
  const validatedSlots: OverrideSlotInput[] = [];
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (!s || typeof s !== "object") return `slots[${i}]: must be an object`;
    const { startTime, endTime } = s as Record<string, unknown>;
    if (typeof startTime !== "string" || !TIME_REGEX.test(startTime)) {
      return `slots[${i}].startTime must be in HH:mm format`;
    }
    if (typeof endTime !== "string" || !TIME_REGEX.test(endTime)) {
      return `slots[${i}].endTime must be in HH:mm format`;
    }
    if (startTime >= endTime) {
      return `slots[${i}]: startTime must be before endTime`;
    }
    validatedSlots.push({ startTime, endTime });
  }
  return { date, isAvailable, slots: validatedSlots };
}

// PUT /api/users/:id/availability/overrides
// Replace the full set of availability override days for this user.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return Response.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const overridesInput = body?.overrides;
  if (!Array.isArray(overridesInput)) {
    return Response.json(
      { error: "overrides must be an array" },
      { status: 400 },
    );
  }

  const validated: OverrideDayInput[] = [];
  const seenDates = new Set<string>();
  for (let i = 0; i < overridesInput.length; i++) {
    const r = validateOverride(overridesInput[i]);
    if (typeof r === "string") {
      return Response.json(
        { error: `overrides[${i}]: ${r}` },
        { status: 400 },
      );
    }
    if (seenDates.has(r.date)) {
      return Response.json(
        { error: `overrides[${i}]: duplicate date ${r.date}` },
        { status: 400 },
      );
    }
    seenDates.add(r.date);
    validated.push(r);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.availabilityOverrideDay.deleteMany({ where: { userId } });
    for (const o of validated) {
      await tx.availabilityOverrideDay.create({
        data: {
          userId,
          date: new Date(`${o.date}T00:00:00.000Z`),
          isAvailable: o.isAvailable,
          slots: {
            create: o.slots.map((s) => ({
              startTime: new Date(`${o.date}T${s.startTime}:00.000Z`),
              endTime: new Date(`${o.date}T${s.endTime}:00.000Z`),
            })),
          },
        },
      });
    }
  });

  const overrideDays = await prisma.availabilityOverrideDay.findMany({
    where: { userId },
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
  });

  return Response.json(overrideDays);
}
