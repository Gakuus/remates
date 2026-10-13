import type { Auction } from "@/domain/entities/auction";
import type { PropertyStatusCode } from "@/domain/enums/property-status";
import type { AuctionEventStatusCode } from "@/domain/enums/auction-event-status";

/** Criterio de búsqueda del catálogo de remates (PLAN §11 `auctions`). */
export interface AuctionSearchCriteria {
  /** `proximo` por defecto en la UI; sin valor = todos los eventos. */
  eventStatus?: AuctionEventStatusCode | null;
  /** Filtro por departamento/texto de ubicación (PLAN Sprint 9). */
  department?: string | null;
  statuses?: PropertyStatusCode[];
  featured?: boolean;
  sort?: "proximos" | "recientes";
  page?: number;
  pageSize?: number;
}

export interface AuctionSearchResult {
  items: Auction[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Puerto de persistencia de remates (PLAN §2, Sprint 8).
 * Implementado por `PostgresAuctionRepository` e `InMemoryAuctionRepository`.
 */
export interface AuctionRepository {
  create(auction: Auction): Promise<Auction>;
  update(auction: Auction): Promise<Auction>;
  findById(id: string): Promise<Auction | null>;
  findBySlug(slug: string): Promise<Auction | null>;
  search(criteria: AuctionSearchCriteria): Promise<AuctionSearchResult>;
  listFeatured(limit?: number): Promise<Auction[]>;
  /** Publicados, `proximo`, por fecha de remate ascendente. */
  listUpcoming(limit?: number): Promise<Auction[]>;
  /** Elimina el remate y sus lotes. Devuelve `true` si existía. */
  deleteById(id: string): Promise<boolean>;
}
