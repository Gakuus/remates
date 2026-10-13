/**
 * Reglas de validación de imágenes (PLAN §15 "Validación de archivos"):
 * extensión + MIME + firma (magic bytes) + tamaño máximo.
 *
 * Puro y sin dependencias: se usa desde el adaptador HTTP que reciba la
 * subida (panel admin, post-MVP) y desde los tests.
 */
export const IMAGE_RULES = {
  maxBytes: 8 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"] as const,
  maxCountPerProperty: 20,
} as const;

export type AllowedImageType = (typeof IMAGE_RULES.allowedTypes)[number];

export type ImageValidation =
  | { ok: true; contentType: AllowedImageType }
  | { ok: false; error: "too_large" | "unsupported_type" | "empty" | "signature_mismatch" };

/** Detecta el tipo real por firma binaria, sin confiar en el MIME del cliente. */
export function detectImageType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }

  // WEBP: "RIFF" .... "WEBP"
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    const isWebp =
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    return isWebp ? "image/webp" : null;
  }

  // AVIF/HEIF: caja "ftyp" con marca avif/avis en los 4 bytes siguientes.
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }

  return null;
}

/**
 * Valida una imagen entrante: tamaño, tipo permitido y firma coherente
 * con el MIME declarado. El nombre de archivo nunca se usa (lo genera
 * el servidor).
 */
export function validateImageFile(input: {
  bytes: Uint8Array;
  declaredType: string;
  sizeBytes: number;
}): ImageValidation {
  if (input.sizeBytes <= 0 || input.bytes.length === 0) return { ok: false, error: "empty" };
  if (input.sizeBytes > IMAGE_RULES.maxBytes) return { ok: false, error: "too_large" };

  const declared = input.declaredType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!(IMAGE_RULES.allowedTypes as readonly string[]).includes(declared)) {
    return { ok: false, error: "unsupported_type" };
  }

  const actual = detectImageType(input.bytes);
  if (actual === null || actual !== declared) {
    return { ok: false, error: "signature_mismatch" };
  }

  return { ok: true, contentType: actual };
}
