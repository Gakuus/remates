import type { ImageValidation } from "@/domain/rules/image-rules";
import { IMAGE_RULES, validateImageFile, type AllowedImageType } from "@/domain/rules/image-rules";
import type { ContentImage } from "@/domain/entities/content-image";
import type { UploadedObject } from "@/application/ports/image-storage";

const EXTENSIONS: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Mensaje en español para cada error de validación de imagen. */
export function describeImageValidationError(validation: ImageValidation): string {
  if (validation.ok) return "";
  switch (validation.error) {
    case "empty":
      return "El archivo elegido está vacío.";
    case "too_large":
      return `La imagen supera el máximo de ${IMAGE_RULES.maxBytes / 1024 / 1024} MB.`;
    case "unsupported_type":
      return "Solo se aceptan imágenes JPG, PNG, WEBP o AVIF.";
    case "signature_mismatch":
      return "El archivo no coincide con su formato (parece dañado o renombrado).";
  }
}

export function extensionFor(type: AllowedImageType): string {
  return EXTENSIONS[type];
}

/** Valida el archivo y devuelve tipo + bytes listos para subir. */
export async function readValidatedImage(
  file: File,
): Promise<
  { ok: true; bytes: Uint8Array; contentType: AllowedImageType } | { ok: false; error: string }
> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateImageFile({
    bytes,
    declaredType: file.type,
    sizeBytes: file.size,
  });
  if (!validation.ok) return { ok: false, error: describeImageValidationError(validation) };
  return { ok: true, bytes, contentType: validation.contentType };
}

/**
 * Path de storage para una imagen nueva: `{kind}/{id}/{imageId}.{ext}`.
 * El id es un UUID generado por el servidor (nunca un nombre de usuario).
 */
export function buildImageStoragePath(
  kind: string,
  id: string,
  imageId: string,
  type: AllowedImageType,
): string {
  return `${kind}/${id}/${imageId}.${extensionFor(type)}`;
}

/**
 * ¿Podemos confiar en un path que vuelve del cliente? El path lo genera el
 * servidor en la subida; al adjuntarlo se verifica que use exactamente el
 * kind e id de la operación y que termine en una extensión permitida.
 */
export function isTrustedStoragePath(kind: string, id: string, storagePath: string): boolean {
  const allowedExtensions = "jpg|jpeg|png|webp|avif";
  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const pattern = new RegExp(
    `^${sanitizeRegex(kind)}/${sanitizeRegex(id)}/${uuid}\\.(${allowedExtensions})$`,
  );
  return pattern.test(storagePath);
}

function sanitizeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Construye la `ContentImage` del dominio a partir del objeto subido. */
export function contentImageFromUpload(input: {
  id: string;
  uploaded: UploadedObject;
  altText: string;
  sortOrder: number;
  isMain: boolean;
}): ContentImage {
  return {
    id: input.id,
    storagePath: input.uploaded.path,
    url: input.uploaded.publicUrl,
    altText: input.altText,
    sortOrder: input.sortOrder,
    isMain: input.isMain,
  };
}
