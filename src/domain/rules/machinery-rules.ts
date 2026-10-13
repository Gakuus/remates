import type { Price } from "@/domain/value-objects/price";
import type { MachineryCategoryCode } from "@/domain/enums/machinery-category";
import { isMachineryCategoryCode } from "@/domain/enums/machinery-category";

/**
 * Reglas de publicación de maquinaria (PLAN §11).
 * Fuente de verdad en el dominio; la BD puede reforzarlas con CHECK.
 */
export type MachineryPublishBlocker =
  | "missing_title"
  | "missing_slug"
  | "missing_category"
  | "missing_department"
  | "missing_price"
  | "missing_main_image";

export interface MachineryPublishInput {
  title: string;
  slug: string;
  category: MachineryCategoryCode;
  department: string;
  price: Price | null;
  hasMainImage: boolean;
}

export function canPublishMachinery(input: MachineryPublishInput): MachineryPublishBlocker[] {
  const blockers: MachineryPublishBlocker[] = [];

  if (input.title.trim().length === 0) blockers.push("missing_title");
  if (input.slug.trim().length === 0) blockers.push("missing_slug");
  if (!isMachineryCategoryCode(input.category)) blockers.push("missing_category");
  if (input.department.trim().length === 0) blockers.push("missing_department");
  if (input.price === null) blockers.push("missing_price");
  if (!input.hasMainImage) blockers.push("missing_main_image");

  return blockers;
}
