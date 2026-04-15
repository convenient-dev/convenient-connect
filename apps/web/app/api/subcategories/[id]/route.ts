import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

// Get the custom fields and addon templates for a specific subcategory when creating a service or editing a service. This is needed to display the correct custom fields and addon templates based on the selected subcategory in the service form.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const subcategoryId = Number(id);

  if (!Number.isInteger(subcategoryId) || subcategoryId <= 0) {
    return Response.json({ error: "Invalid subcategory id" }, { status: 400 });
  }

  const subcategory = await prisma.subcategory.findUnique({
    where: { id: subcategoryId },
    include: {
      category: {
        include: {
          customFields: { orderBy: { displayOrder: "asc" } },
        },
      },
      customFields: { orderBy: { displayOrder: "asc" } },
      addonTemplates: { orderBy: { displayOrder: "asc" } },
    },
  });

  if (!subcategory) {
    return Response.json({ error: "Subcategory not found" }, { status: 404 });
  }

  return Response.json(subcategory);
}
