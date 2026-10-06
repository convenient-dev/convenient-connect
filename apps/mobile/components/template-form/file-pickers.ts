import type { MultipartFile } from "@/api/multipart";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

function fileNameFromUri(uri: string, fallback: string): string {
  const last = uri.split("/").pop();
  return last && last.includes(".") ? last : fallback;
}

function mimeFromName(name: string, fallback: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME[ext] ?? fallback;
}

/** Whether every allowed type is an image, so the image picker can be used. */
export function acceptsOnlyImages(allowedFileTypes: string[] | undefined): boolean {
  const types = allowedFileTypes ?? [];
  return types.length > 0 && types.every((type) => type.startsWith("image/"));
}

/** Opens the photo library and returns the chosen images as upload objects. */
export async function pickImages(limit: number): Promise<MultipartFile[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit > 1 ? limit : 1,
    quality: 0.8,
    orderedSelection: true,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, limit).map((asset, index) => {
    const name =
      asset.fileName ?? fileNameFromUri(asset.uri, `image-${Date.now()}-${index}.jpg`);
    return {
      uri: asset.uri,
      name,
      type: asset.mimeType ?? mimeFromName(name, "image/jpeg"),
    };
  });
}

/** Opens the document picker limited to the given MIME types. */
export async function pickDocuments(
  allowedFileTypes: string[] | undefined,
  multiple: boolean,
): Promise<MultipartFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: allowedFileTypes && allowedFileTypes.length ? allowedFileTypes : "*/*",
    multiple,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType ?? mimeFromName(asset.name, "application/octet-stream"),
  }));
}

/** Picks files for a template file field, choosing the picker from its allowed types. */
export async function pickFilesForField(
  allowedFileTypes: string[] | undefined,
  limit: number,
): Promise<MultipartFile[]> {
  if (acceptsOnlyImages(allowedFileTypes)) return pickImages(limit);
  const files = await pickDocuments(allowedFileTypes, limit > 1);
  return files.slice(0, limit);
}
