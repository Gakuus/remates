import { NextRequest, NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/infrastructure/admin/session";
import { noStoreHeaders, isTrustedRequest } from "@/infrastructure/admin/request-guard";
import { buildImageStoragePath, readValidatedImage } from "@/infrastructure/admin/image-upload";
import { createInMemoryRateLimiter } from "@/infrastructure/rate-limit";
import { clientIpFromRequest } from "@/infrastructure/net/client-ip";
import { isContentKind } from "@/application/dtos/admin-content";
import { container } from "@/platform/container";

/**
 * Subida de fotos del panel (PLAN Sprint 10).
 *
 * Es un route handler a propósito: las imágenes (hasta 8 MB) exceden el
 * límite de cuerpo de las server actions, y la subida no toca el estado en
 * memoria (solo escribe archivo/storage y devuelve `{storagePath, url}`);
 * adjuntarlo al aviso sí lo hace la server action, en el mismo bundle que
 * las páginas `/admin`.
 */
const uploadLimiter = createInMemoryRateLimiter({
  limit: 20,
  windowMs: 10 * 60 * 1000,
});

function bad(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: noStoreHeaders() });
}

export async function POST(request: NextRequest) {
  if (!isTrustedRequest(request)) {
    return bad("Origen no permitido.", 403);
  }

  const cookieStore = request.cookies;
  const sessionToken = cookieStore.get(adminSessionCookieName())?.value;
  if (!(await verifyAdminSessionToken(sessionToken))) {
    return bad("No autorizado.", 401);
  }

  const ip = clientIpFromRequest(request) ?? crypto.randomUUID();
  const limited = uploadLimiter.check(`admin-upload:${ip}`);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Demasiadas subidas. Probá más tarde." },
      {
        status: 429,
        headers: { ...noStoreHeaders(), "Retry-After": String(limited.retryAfterSeconds) },
      },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("Cuerpo inválido.", 400);
  }

  const kind = form.get("kind");
  const id = form.get("id");
  const file = form.get("image");
  if (!isContentKind(kind) || typeof id !== "string" || id.length === 0) {
    return bad("Parámetros inválidos.", 400);
  }
  if (!(file instanceof File) || file.size <= 0) {
    return bad("Elegí una imagen.", 400);
  }

  const image = await readValidatedImage(file);
  if (!image.ok) return bad(image.error, 422);

  const imageId = container.system.ids.newId();
  const storagePath = buildImageStoragePath(kind, id, imageId, image.contentType);

  try {
    const uploaded = await container.storage.images.upload(
      storagePath,
      image.bytes,
      image.contentType,
    );
    return NextResponse.json({ ok: true, uploaded }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("[admin] no se pudo guardar la imagen en el storage", error);
    return bad("No se pudo guardar la imagen.", 500);
  }
}
