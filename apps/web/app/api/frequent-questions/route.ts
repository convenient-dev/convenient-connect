import prisma from "@/lib/prisma";

export async function GET() {
  const topics = await prisma.supportTopic.findMany({
    where: { faqs: { some: {} } },
    orderBy: { displayOrder: "asc" },
    include: {
      faqs: {
        orderBy: { displayOrder: "asc" },
        select: { question: true, answer: true },
      },
    },
  });

  const payload = topics.map((t) => ({
    key: t.key,
    label: t.label,
    questions: t.faqs,
  }));

  return Response.json({ topics: payload });
}
