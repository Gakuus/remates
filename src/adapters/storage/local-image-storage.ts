import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ImageStorage, UploadedObject } from "@/application/ports/image-storage";

const UPLOADS_DIR = path.resolve(process.cwd(), ".uploads");

/**
 * Adaptador de storage local (modo sin Supabase / demo).
 *
 * Escribe las imágenes en `.uploads` (fuera de `public/`: `next start` no
 * sirve archivos agregados a `public` en runtime). La URL pública
 * `/uploads/...` la sirve la route handler `app/uploads/[...path]`, que
 * lee del disco con la extensión mapeada a su content-type.
 *
 * El path viene generado por el servidor y ya saneado
 * (`{kind}/{id}/{imageId}.{ext}`); acá solo se garantiza que no pueda
 * salir del directorio base.
 */
export class LocalImageStorage implements ImageStorage {
  constructor(private readonly baseDir: string = UPLOADS_DIR) {}

  private resolve(relativePath: string): string {
    const absolute = path.resolve(this.baseDir, relativePath);
    if (!absolute.startsWith(this.baseDir + path.sep)) {
      throw new Error("Path de imagen inválido.");
    }
    return absolute;
  }

  async upload(pathToUpload: string, file: File | Uint8Array): Promise<UploadedObject> {
    // El `contentType` del contrato `ImageStorage` no aplica al disco local:
    // el tipo ya se validó y el path se resuelve por extensión.
    const absolute = this.resolve(pathToUpload);
    const bytes = file instanceof Uint8Array ? file : new Uint8Array(await file.arrayBuffer());

    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes);

    return { path: pathToUpload, publicUrl: this.getPublicUrl(pathToUpload) };
  }

  async remove(paths: string[]): Promise<void> {
    // Solo borra archivos, nunca directorios; cada path es el de un objeto subido.
    for (const relativePath of paths) {
      const absolute = this.resolve(relativePath);
      try {
        await rm(absolute, { force: true });
      } catch {
        // Si un archivo no existe ya, seguimos con el resto.
      }
    }
  }

  getPublicUrl(pathToUpload: string): string {
    this.resolve(pathToUpload);
    return `/uploads/${pathToUpload}`;
  }
}
