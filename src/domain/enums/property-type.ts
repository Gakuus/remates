/**
 * Tipos de campo. Catálogo acotado y extensible (PLAN §11).
 * El dominio conoce los códigos; la BD los persiste en `property_types`.
 */
export const PROPERTY_TYPE_CODES = ["agricola", "ganadero", "mixto"] as const;

export type PropertyTypeCode = (typeof PROPERTY_TYPE_CODES)[number];

export function isPropertyTypeCode(value: string): value is PropertyTypeCode {
  return (PROPERTY_TYPE_CODES as readonly string[]).includes(value);
}

export const PROPERTY_TYPE_LABELS: Record<PropertyTypeCode, string> = {
  agricola: "Agrícola",
  ganadero: "Ganadero",
  mixto: "Mixto",
};
