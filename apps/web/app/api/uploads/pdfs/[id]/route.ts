import prisma from "@/lib/prisma";
import supabase from "@/lib/supabase";
import { NextRequest } from "next/server";

const BUCKET = "service_certifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const certId = Number(id);

  const cert = await prisma.serviceCertification.findUnique({
    where: { id: certId },
    select: { id: true },
  });

  if (!cert) {
    return Response.json({ error: "Certification not found" }, { status: 404 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const updated = await prisma.serviceCertification.update({
    where: { id: certId },
    data: { name: name.trim() },
  });

  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const certId = Number(id);

  const cert = await prisma.serviceCertification.findUnique({
    where: { id: certId },
    select: { id: true, url: true },
  });

  if (!cert) {
    return Response.json({ error: "Certification not found" }, { status: 404 });
  }

  const url = new URL(cert.url);
  const pathMatch = url.pathname.match(
    new RegExp(`/storage/v1/object/public/${BUCKET}/(.+)`),
  );
  if (pathMatch) {
    await supabase.storage.from(BUCKET).remove([pathMatch[1]]);
  }

  await prisma.serviceCertification.delete({ where: { id: certId } });

  return new Response(null, { status: 204 });
}
