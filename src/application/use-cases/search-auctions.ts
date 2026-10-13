import type {
  AuctionRepository,
  AuctionSearchCriteria,
  AuctionSearchResult,
} from "@/application/ports/auction-repository";
import type { Auction } from "@/domain/entities/auction";
import { PUBLICLY_VISIBLE_STATUSES } from "@/domain/enums/property-status";

export type SearchAuctions = (criteria: AuctionSearchCriteria) => Promise<AuctionSearchResult>;

/** Buscar remates (PLAN Sprint 8). Por defecto solo publicados, orden por fecha. */
export function createSearchAuctions(repo: AuctionRepository): SearchAuctions {
  return async (criteria) => {
    const resolved: AuctionSearchCriteria = {
      eventStatus: "proximo",
      sort: "proximos",
      page: 1,
      pageSize: 24,
      ...criteria,
      statuses: criteria.statuses ?? [...PUBLICLY_VISIBLE_STATUSES],
    };
    return repo.search(resolved);
  };
}

export type GetUpcomingAuctions = (limit?: number) => Promise<Auction[]>;

/** Próximos remates publicados, por fecha ascendente (PLAN §4 Remates próximos). */
export function createGetUpcomingAuctions(repo: AuctionRepository): GetUpcomingAuctions {
  return (limit = 3) =>
    repo
      .search({
        eventStatus: "proximo",
        statuses: [...PUBLICLY_VISIBLE_STATUSES],
        sort: "proximos",
        page: 1,
        pageSize: limit,
      })
      .then((r) => r.items);
}

export type GetFeaturedAuctions = (limit?: number) => Promise<Auction[]>;

/** Remates destacados (PLAN §4). */
export function createGetFeaturedAuctions(repo: AuctionRepository): GetFeaturedAuctions {
  return (limit = 3) =>
    repo
      .search({
        featured: true,
        statuses: [...PUBLICLY_VISIBLE_STATUSES],
        sort: "proximos",
        page: 1,
        pageSize: limit,
      })
      .then((r) => r.items);
}

export type GetAuctionBySlug = (slug: string) => Promise<Auction | null>;

/** Ficha de un remate (PLAN Sprint 9). */
export function createGetAuctionBySlug(repo: AuctionRepository): GetAuctionBySlug {
  return (slug) => repo.findBySlug(slug);
}
