import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

// Get the categories for a specific user
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const rows = await prisma.service.findMany({
    where: { userId: Number(id), deletedAt: null },
    select: {
      subcategory: {
        select: {
          category: { select: { id: true, name: true } },
        },
      },
    },
  });

  const seen = new Set<number>();
  const categories: { id: number; name: string }[] = [];
  for (const r of rows) {
    const c = r.subcategory?.category;
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      categories.push(c);
    }
  }

  return Response.json(categories);
}
