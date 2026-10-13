import type { MachineryItem } from "@/domain/entities/machinery-item";
import type { PropertyStatusCode } from "@/domain/enums/property-status";
import type { MachineryCategoryCode } from "@/domain/enums/machinery-category";

/** Criterio de búsqueda del catálogo de maquinaria (PLAN §11 `machinery`). */
export interface MachinerySearchCriteria {
  query?: string;
  category?: MachineryCategoryCode | null;
  brand?: string | null;
  department?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  statuses?: PropertyStatusCode[];
  featured?: boolean;
  sort?: "recientes" | "precio_asc" | "precio_desc";
  page?: number;
  pageSize?: number;
}

export interface MachinerySearchResult {
  items: MachineryItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Puerto de persistencia de maquinaria (PLAN §2, Sprint 8).
 * Implementado por `SupabaseMachineryRepository` y `InMemoryMachineryRepository`.
 */
export interface MachineryRepository {
  create(item: MachineryItem): Promise<MachineryItem>;
  update(item: MachineryItem): Promise<MachineryItem>;
  findById(id: string): Promise<MachineryItem | null>;
  findBySlug(slug: string): Promise<MachineryItem | null>;
  search(criteria: MachinerySearchCriteria): Promise<MachinerySearchResult>;
  listFeatured(limit?: number): Promise<MachineryItem[]>;
  listRecent(limit?: number): Promise<MachineryItem[]>;
  /** Elimina el aviso. Devuelve `true` si existía. */
  deleteById(id: string): Promise<boolean>;
}
