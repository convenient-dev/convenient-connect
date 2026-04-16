import prisma from "@/lib/prisma";
import supabase from "@/lib/supabase";
import { NextRequest } from "next/server";

const BUCKET = "service_images";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const serviceId = formData.get("serviceId");
  const file = formData.get("file");

  if (!serviceId || !file || !(file instanceof File)) {
    return Response.json(
      { error: "Missing required fields: serviceId, file" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json(
      { error: "Invalid file type. Allowed: jpeg, png, webp" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File exceeds 5 MB limit" },
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

  const ext = file.name.split(".").pop();
  const path = `${parsedServiceId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const image = await prisma.serviceImage.create({
    data: {
      serviceId: parsedServiceId,
      url: urlData.publicUrl,
      altText: formData.get("altText")?.toString() ?? null,
    },
  });

  return Response.json(image, { status: 201 });
}
