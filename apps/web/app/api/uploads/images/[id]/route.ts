import prisma from "@/lib/prisma";
import supabase from "@/lib/supabase";
import { NextRequest } from "next/server";

const BUCKET = "service_images";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const imageId = Number(id);

  const image = await prisma.serviceImage.findUnique({
    where: { id: imageId },
    select: { id: true, url: true },
  });

  if (!image) {
    return Response.json({ error: "Image not found" }, { status: 404 });
  }

  // Extract storage path from public URL
  const url = new URL(image.url);
  const pathMatch = url.pathname.match(
    new RegExp(`/storage/v1/object/public/${BUCKET}/(.+)`),
  );
  if (pathMatch) {
    await supabase.storage.from(BUCKET).remove([pathMatch[1]]);
  }

  await prisma.serviceImage.delete({ where: { id: imageId } });

  return new Response(null, { status: 204 });
}
