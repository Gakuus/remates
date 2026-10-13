import type { Price } from "@/domain/value-objects/price";
import type { PropertyTypeCode } from "@/domain/enums/property-type";

/**
 * Reglas de publicación (PLAN §11 "Obligatoriedad").
 * Centralizadas en el dominio: la BD puede reforzarlas, pero la fuente
 * de verdad es esta función.
 */
export type PublishBlocker =
  | "missing_name"
  | "missing_slug"
  | "missing_type"
  | "missing_department"
  | "invalid_hectares"
  | "missing_price"
  | "missing_main_image";

export interface PublishInput {
  name: string;
  slug: string;
  type: PropertyTypeCode;
  department: string;
  hectares: number;
  price: Price | null;
  hasMainImage: boolean;
}

export function canPublish(input: PublishInput): PublishBlocker[] {
  const blockers: PublishBlocker[] = [];

  if (input.name.trim().length === 0) blockers.push("missing_name");
  if (input.slug.trim().length === 0) blockers.push("missing_slug");
  if (input.department.trim().length === 0) blockers.push("missing_department");
  if (!Number.isFinite(input.hectares) || input.hectares <= 0) blockers.push("invalid_hectares");
  if (input.price === null) blockers.push("missing_price");
  if (!input.hasMainImage) blockers.push("missing_main_image");

  return blockers;
}
