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
  { params }: { params: Promise<{ id: string; ticketId: string }> },
) {
  const { id, ticketId } = await params;
  const userId = Number(id);

  const ticket = await prisma.supportTicket.findFirst({
    where: { publicId: ticketId, userId },
    select: {
      publicId: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      topic: { select: { label: true } },
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          actor: true,
          body: true,
          statusChange: true,
          createdAt: true,
        },
      },
    },
  });

  if (!ticket) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }

  const description =
    ticket.events.find((e) => e.actor === "user" && e.body !== null)?.body ?? "";

  const history = ticket.events
    .filter((e) => e.statusChange !== null)
    .map((e) => ({
      status: STATUS_OUT[e.statusChange as string],
      at: formatDate(e.createdAt),
      ...(e.body ? { note: e.body } : {}),
    }));

  return Response.json({
    id: ticket.publicId,
    subject: ticket.subject,
    topicLabel: ticket.topic.label,
    status: STATUS_OUT[ticket.status],
    createdAt: formatDate(ticket.createdAt),
    updatedAt: formatDate(ticket.updatedAt),
    description,
    history,
  });
}
