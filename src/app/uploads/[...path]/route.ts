import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

/**
 * Sirve las imágenes locales subidas desde el panel.
 *
 * `next start` no sirve archivos agregados a `public/` después del build,
 * así que las fotos viven en `.uploads` y se exponen por esta ruta pública
 * (`/uploads/{kind}/{id}/{uuid}.{ext}`), con content-type según extensión
 * y caché larga (el nombre es un UUID inmutable).
 */
const UPLOADS_DIR = path.resolve(process.cwd(), ".uploads");

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const segments = (await context.params).path;
  if (segments.length === 0) return new NextResponse("Not found", { status: 404 });

  const extension = segments.at(-1)?.split(".").at(-1)?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  const absolute = path.join(UPLOADS_DIR, ...segments);
  if (!absolute.startsWith(UPLOADS_DIR + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let raw: Buffer;
  try {
    raw = await readFile(absolute);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const bytes = new Uint8Array(raw);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(bytes.byteLength),
    },
  });
}
