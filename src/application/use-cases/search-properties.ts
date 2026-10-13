import type {
  PropertyRepository,
  SearchCriteria,
  SearchResult,
} from "@/application/ports/property-repository";
import type { Property } from "@/domain/entities/property";
import { PUBLICLY_VISIBLE_STATUSES } from "@/domain/enums/property-status";

export interface SearchProperties {
  (criteria: SearchCriteria): Promise<SearchResult>;
}

/**
 * Buscar campos (PLAN §2).
 * Por defecto solo devuelve campos publicados y usa el orden de relevancia.
 */
export function createSearchProperties(repo: PropertyRepository): SearchProperties {
  return async (criteria) => {
    const resolved: SearchCriteria = {
      sort: "relevancia",
      page: 1,
      pageSize: 24,
      ...criteria,
      statuses: criteria.statuses ?? [...PUBLICLY_VISIBLE_STATUSES],
    };
    return repo.search(resolved);
  };
}

export type GetFeaturedProperties = (limit?: number) => Promise<Property[]>;

/** Campos destacados para la portada (PLAN §2, §4). */
export function createGetFeaturedProperties(repo: PropertyRepository): GetFeaturedProperties {
  return (limit = 6) =>
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

export type GetSimilarProperties = (property: Property, limit?: number) => Promise<Property[]>;

/**
 * Campos similares para la ficha (PLAN §8, Sprint 4): mismo departamento
 * o tipo, excluyendo el propio campo. Nunca lanza: ante un fallo de
 * persistencia devuelve vacío para no tumbar la ficha.
 */
export function createGetSimilarProperties(repo: PropertyRepository): GetSimilarProperties {
  return async (property, limit = 3) => {
    try {
      const result = await repo.search({
        statuses: [...PUBLICLY_VISIBLE_STATUSES],
        sort: "recientes",
        page: 1,
        pageSize: limit + 4,
        department: property.location.department,
      });
      const candidates = result.items.filter((p) => p.slug !== property.slug);

      if (candidates.length >= limit) return candidates.slice(0, limit);

      const byType = await repo.search({
        statuses: [...PUBLICLY_VISIBLE_STATUSES],
        sort: "recientes",
        page: 1,
        pageSize: limit + 4,
        type: property.type,
      });
      const merged = candidates.concat(byType.items.filter((p) => p.slug !== property.slug));
      const seen = new Set<string>();
      return merged
        .filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true)))
        .slice(0, limit);
    } catch {
      return [];
    }
  };
}

export type GetRecentProperties = (limit?: number) => Promise<Property[]>;

/** Publicados más recientes para la portada (PLAN §2, §4). */
export function createGetRecentProperties(repo: PropertyRepository): GetRecentProperties {
  return (limit = 6) =>
    repo
      .search({
        statuses: [...PUBLICLY_VISIBLE_STATUSES],
        sort: "recientes",
        page: 1,
        pageSize: limit,
      })
      .then((r) => r.items);
}
