/** Resultado de una operación de storage. */
export interface UploadedObject {
  path: string;
  publicUrl: string;
}

/**
 * Puerto de almacenamiento de imágenes (PLAN §2).
 * Implementado por `LocalImageStorage`.
 */
export interface ImageStorage {
  /**
   * Sube una imagen validada (tipo/tamaño ya verificados por el caller).
   * `path` es un prefijo controlado por el servidor, p. ej.
   * `properties/{propertyId}`.
   */
  upload(path: string, file: File | Uint8Array, contentType: string): Promise<UploadedObject>;
  remove(paths: string[]): Promise<void>;
  getPublicUrl(path: string): string;
}
