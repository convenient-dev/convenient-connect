import prisma from "@/lib/prisma";

const STATUS_OUT: Record<string, "open" | "in_progress" | "resolved" | "closed"> = {
  open: "open",
  inProgress: "in_progress",
  resolved: "resolved",
  closed: "closed",
};

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
