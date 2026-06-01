import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

const STATUS_OUT: Record<string, "open" | "in_progress" | "resolved" | "closed"> = {
  open: "open",
  inProgress: "in_progress",
  resolved: "resolved",
  closed: "closed",
};

const SUBJECT_MAX = 80;
const DESCRIPTION_MAX = 1000;

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = Number(id);

  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      publicId: true,
      subject: true,
      status: true,
      updatedAt: true,
      topic: { select: { label: true } },
      events: {
        orderBy: { createdAt: "desc" },
        select: { actor: true, body: true, readAt: true },
      },
    },
  });

  const payload = tickets.map((t) => {
    const lastWithBody = t.events.find((e) => e.body !== null);
    const unread = t.events.some(
      (e) => e.actor === "agent" && e.readAt === null,
    );

    return {
      id: t.publicId,
      subject: t.subject,
      topicLabel: t.topic.label,
      status: STATUS_OUT[t.status],
      updatedAt: formatDate(t.updatedAt),
      lastMessage: lastWithBody?.body ?? "",
      unread,
    };
  });

  return Response.json(payload);
}

// POST /api/users/:id/tickets
// Create a new support ticket plus an initial "open" event with the user's description.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return Response.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { topicKey, subject, description } = body as Record<string, unknown>;

  if (typeof topicKey !== "string" || topicKey.length === 0) {
    return Response.json({ error: "topicKey is required" }, { status: 400 });
  }
  if (typeof subject !== "string") {
    return Response.json({ error: "subject must be a string" }, { status: 400 });
  }
  if (typeof description !== "string") {
    return Response.json(
      { error: "description must be a string" },
      { status: 400 },
    );
  }

  const trimmedSubject = subject.trim();
  const trimmedDescription = description.trim();

  if (
    trimmedSubject.length === 0 ||
    trimmedSubject.length > SUBJECT_MAX
  ) {
    return Response.json(
      { error: `subject must be 1–${SUBJECT_MAX} characters` },
      { status: 400 },
    );
  }
  if (
    trimmedDescription.length === 0 ||
    trimmedDescription.length > DESCRIPTION_MAX
  ) {
    return Response.json(
      { error: `description must be 1–${DESCRIPTION_MAX} characters` },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const topic = await prisma.supportTopic.findUnique({
    where: { key: topicKey },
    select: { id: true, label: true },
  });
  if (!topic) {
    return Response.json({ error: "Unknown topic" }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const last = await tx.supportTicket.findFirst({
      orderBy: { id: "desc" },
      select: { publicId: true },
    });
    const lastNum = last
      ? Number.parseInt(last.publicId.replace(/^T-/, ""), 10)
      : 10000;
    const nextNum = Number.isFinite(lastNum) ? lastNum + 1 : 10001;
    const publicId = `T-${nextNum}`;

    return tx.supportTicket.create({
      data: {
        publicId,
        userId,
        topicId: topic.id,
        subject: trimmedSubject,
        events: {
          create: {
            actor: "user",
            body: trimmedDescription,
            statusChange: "open",
          },
        },
      },
      select: {
        publicId: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  return Response.json(
    {
      id: created.publicId,
      subject: created.subject,
      topicLabel: topic.label,
      status: STATUS_OUT[created.status],
      createdAt: formatDate(created.createdAt),
      updatedAt: formatDate(created.updatedAt),
    },
    { status: 201 },
  );
}
