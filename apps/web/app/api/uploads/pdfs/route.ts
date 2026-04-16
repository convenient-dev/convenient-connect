import prisma from "@/lib/prisma";
import supabase from "@/lib/supabase";
import { NextRequest } from "next/server";

const BUCKET = "service_certifications";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const serviceId = formData.get("serviceId");
  const name = formData.get("name");
  const file = formData.get("file");

  if (!serviceId || !name) {
    return Response.json(
      { error: "Missing required fields: serviceId, name" },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return Response.json(
      { error: "Missing required field: file" },
      { status: 400 },
    );
  }

  if (file.type !== "application/pdf") {
    return Response.json(
      { error: "Invalid file type. Only PDF is allowed" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File exceeds 10 MB limit" },
      { status: 400 },
    );
  }

  const parsedServiceId = Number(serviceId);

  const service = await prisma.service.findUnique({
    where: { id: parsedServiceId },
    select: { id: true },
  });

  if (!service) {
    return Response.json({ error: "Service not found" }, { status: 404 });
  }

  const path = `${parsedServiceId}/${Date.now()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const certification = await prisma.serviceCertification.create({
    data: {
      serviceId: parsedServiceId,
      name: name.toString(),
      url: urlData.publicUrl,
      fileName: file.name,
    },
  });

  return Response.json(certification, { status: 201 });
}
