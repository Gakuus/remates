/**
 * Ciclo de vida de una publicación (PLAN §11).
 * `destacado` NO es un estado: es un eje independiente (`Property.isFeatured`).
 */
export const PROPERTY_STATUS_CODES = ["borrador", "publicado", "retirado", "vendido"] as const;

export type PropertyStatusCode = (typeof PROPERTY_STATUS_CODES)[number];

export function isPropertyStatusCode(value: string): value is PropertyStatusCode {
  return (PROPERTY_STATUS_CODES as readonly string[]).includes(value);
}

export const PROPERTY_STATUS_LABELS: Record<PropertyStatusCode, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  retirado: "Retirado",
  vendido: "Vendido",
};

/** Estados visibles públicamente en el catálogo. */
export const PUBLICLY_VISIBLE_STATUSES: readonly PropertyStatusCode[] = ["publicado"];
