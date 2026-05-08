import supabase from "@/lib/supabase";
import { NextRequest } from "next/server";

const BUCKET = "business_doc";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

const ALLOWED_DOC_TYPES = new Set(["registration", "governmentId"]);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const userId = formData.get("userId");
  const docType = formData.get("docType");
  const file = formData.get("file");

  if (!userId || !docType) {
    return Response.json(
      { error: "Missing required fields: userId, docType" },
      { status: 400 },
    );
  }

  if (!ALLOWED_DOC_TYPES.has(docType.toString())) {
    return Response.json(
      { error: "Invalid docType. Must be 'registration' or 'governmentId'" },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return Response.json(
      { error: "Missing required field: file" },
      { status: 400 },
    );
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return Response.json(
      { error: "Invalid file type. Only PDF, JPG, PNG are allowed" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File exceeds 5 MB limit" },
      { status: 400 },
    );
  }

  const path = `${userId}/${docType}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return Response.json(
    { url: urlData.publicUrl, fileName: file.name },
    { status: 201 },
  );
}
