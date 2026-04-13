import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const categoryId = Number(id);

  if (isNaN(categoryId)) {
    return Response.json({ error: "Invalid category id" }, { status: 400 });
  }

  const subcategories = await prisma.subcategory.findMany({
    where: { categoryId },
    orderBy: { id: "asc" },
  });

  return Response.json(subcategories);
}
