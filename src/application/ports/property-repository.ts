import type { Property } from "@/domain/entities/property";
import type { PropertyStatusCode } from "@/domain/enums/property-status";

/** Criterio de búsqueda/orden del catálogo (PLAN §5, §7). */
export type PropertySort =
  "relevancia" | "recientes" | "precio_asc" | "precio_desc" | "hectareas_asc" | "hectareas_desc";

export interface PriceRange {
  min?: number;
  max?: number;
}

export interface HectaresRange {
  min?: number;
  max?: number;
}

export interface SearchCriteria {
  /** Texto libre sobre nombre/descripción. */
  query?: string;
  department?: string;
  locality?: string;
  type?: string;
  price?: PriceRange;
  hectares?: HectaresRange;
  /** Características con valor "true" (o igual al valor dado). */
  features?: Record<string, string>;
  statuses?: PropertyStatusCode[];
  featured?: boolean;
  sort?: PropertySort;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  items: Property[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Puerto de persistencia de campos (PLAN §2).
 * Implementado por `PostgresPropertyRepository` e `InMemoryPropertyRepository`.
 */
export interface PropertyRepository {
  create(property: Property): Promise<Property>;
  update(property: Property): Promise<Property>;
  findById(id: string): Promise<Property | null>;
  /** Solo devuelve campos con estado visible públicamente salvo que el criterio diga lo contrario. */
  findBySlug(slug: string, options?: { includeUnpublished?: boolean }): Promise<Property | null>;
  search(criteria: SearchCriteria): Promise<SearchResult>;
  listFeatured(limit?: number): Promise<Property[]>;
  listRecent(limit?: number): Promise<Property[]>;
  /** Total de campos por departamento (sección "Zonas" de la portada). */
  countByDepartment(): Promise<Array<{ department: string; count: number }>>;
  /** Elimina el campo. Devuelve `true` si existía. */
  deleteById(id: string): Promise<boolean>;
}
