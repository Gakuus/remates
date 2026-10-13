/**
 * Fotografía genérica de contenido (PLAN §11): campos, remates y maquinaria
 * comparten la misma forma (`property_images`, `auction_images`,
 * `machinery_images`). `PropertyImage` es un alias de esta interfaz.
 */
export interface ContentImage {
  id: string;
  storagePath: string;
  url: string;
  altText: string;
  sortOrder: number;
  isMain: boolean;
}

export function imageIsMain(image: ContentImage): boolean {
  return image.isMain;
}

/**
 * Devuelve las imágenes que quedan al quitar `imageId`, respetando que
 * siempre haya exactamente una principal: si la principal era la eliminada,
 * la primera restante (por orden) pasa a serlo.
 */
export function removeContentImage(
  images: readonly ContentImage[],
  imageId: string,
): ContentImage[] {
  const remaining = images.filter((image) => image.id !== imageId);
  if (remaining.length === 0) return [];
  const hasMain = remaining.some((image) => image.isMain);
  if (!hasMain) {
    return remaining.map((image, index) => (index === 0 ? { ...image, isMain: true } : image));
  }
  return remaining;
}
