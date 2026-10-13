import type { ImageStorage, UploadedObject } from "@/application/ports/image-storage";
import { getSupabasePublicClient } from "@/infrastructure/supabase/client";

export const PROPERTY_IMAGES_BUCKET = "property-images";

/**
 * Adaptador de storage de imágenes (PLAN §2, §12).
 * Validación de tipo/tamaño en el caller (adaptador HTTP); acá solo se
 * sube lo que llega ya saneado, con nombre de archivo generado por servidor.
 */
export class SupabaseImageStorage implements ImageStorage {
  async upload(
    path: string,
    file: File | Uint8Array,
    contentType: string,
  ): Promise<UploadedObject> {
    const supabase = getSupabasePublicClient();
    const { error } = await supabase.storage
      .from(PROPERTY_IMAGES_BUCKET)
      .upload(path, file, { contentType, upsert: false, cacheControl: "31536000" });

    if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
    return { path, publicUrl: this.getPublicUrl(path) };
  }

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const supabase = getSupabasePublicClient();
    const { error } = await supabase.storage.from(PROPERTY_IMAGES_BUCKET).remove(paths);
    if (error) throw new Error(`No se pudieron eliminar imágenes: ${error.message}`);
  }

  getPublicUrl(path: string): string {
    const supabase = getSupabasePublicClient();
    const { data } = supabase.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
}
