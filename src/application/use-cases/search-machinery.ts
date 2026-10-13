import type {
  MachineryRepository,
  MachinerySearchCriteria,
  MachinerySearchResult,
} from "@/application/ports/machinery-repository";
import type { MachineryItem } from "@/domain/entities/machinery-item";
import { PUBLICLY_VISIBLE_STATUSES } from "@/domain/enums/property-status";

export type SearchMachinery = (criteria: MachinerySearchCriteria) => Promise<MachinerySearchResult>;

/** Buscar maquinaria (PLAN Sprint 8). Por defecto solo publicados, más recientes primero. */
export function createSearchMachinery(repo: MachineryRepository): SearchMachinery {
  return async (criteria) => {
    const resolved: MachinerySearchCriteria = {
      sort: "recientes",
      page: 1,
      pageSize: 24,
      ...criteria,
      statuses: criteria.statuses ?? [...PUBLICLY_VISIBLE_STATUSES],
    };
    return repo.search(resolved);
  };
}

export type GetRecentMachinery = (limit?: number) => Promise<MachineryItem[]>;

/** Últimos avisos publicados (PLAN §4 Maquinaria). */
export function createGetRecentMachinery(repo: MachineryRepository): GetRecentMachinery {
  return (limit = 4) =>
    repo
      .search({
        statuses: [...PUBLICLY_VISIBLE_STATUSES],
        sort: "recientes",
        page: 1,
        pageSize: limit,
      })
      .then((r) => r.items);
}

export type GetFeaturedMachinery = (limit?: number) => Promise<MachineryItem[]>;

/** Avisos destacados (PLAN §4). */
export function createGetFeaturedMachinery(repo: MachineryRepository): GetFeaturedMachinery {
  return (limit = 4) =>
    repo
      .search({
        featured: true,
        statuses: [...PUBLICLY_VISIBLE_STATUSES],
        sort: "recientes",
        page: 1,
        pageSize: limit,
      })
      .then((r) => r.items);
}

export type GetMachineryBySlug = (slug: string) => Promise<MachineryItem | null>;

/** Ficha de un aviso de maquinaria (PLAN Sprint 9). */
export function createGetMachineryBySlug(repo: MachineryRepository): GetMachineryBySlug {
  return (slug) => repo.findBySlug(slug);
}
