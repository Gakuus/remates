import type { AuctionRepository } from "@/application/ports/auction-repository";
import type { AuctionProps } from "@/domain/entities/auction";
import { Auction, AuctionLot } from "@/domain/entities/auction";
import type { AuctionEventStatusCode } from "@/domain/enums/auction-event-status";
import type { PropertyStatusCode } from "@/domain/enums/property-status";
import { Price } from "@/domain/value-objects/price";
import { createSlug } from "@/domain/value-objects/slug";

export interface CreateAuctionLotInput {
  id: string;
  lotNumber: number;
  title?: string | null;
  description?: string | null;
  minimumBid?: number | null;
  sortOrder?: number;
}

export interface CreateAuctionInput {
  id: string;
  title: string;
  /** Fecha/hora del remate en ISO (PLAN §11 `scheduled_at`). */
  scheduledAt: string;
  eventStatus?: AuctionEventStatusCode;
  location?: string | null;
  auctioneer?: string | null;
  minimumBid?: number | null;
  currency?: string;
  description?: string | null;
  /** Slug explícito opcional; si falta se deriva del título. */
  slug?: string;
  lots?: CreateAuctionLotInput[];
}

export type CreateAuctionResult =
  | { ok: true; auction: Auction }
  | { ok: false; error: "invalid_slug" | "invalid_scheduled_at" | "invalid_price" };

/**
 * Crear remate (PLAN Sprint 8). Alta inicial como borrador; publicar es un
 * paso separado con sus propias reglas (`ChangeAuctionStatus`).
 */
export function createCreateAuction(
  repo: AuctionRepository,
  clock: { now(): Date },
): (input: CreateAuctionInput) => Promise<CreateAuctionResult> {
  return async (input) => {
    const slug = createSlug(input.slug ?? input.title);
    if (!slug.ok) return { ok: false, error: "invalid_slug" };

    const scheduledAt = new Date(input.scheduledAt);
    if (!Number.isFinite(scheduledAt.getTime())) {
      return { ok: false, error: "invalid_scheduled_at" };
    }

    let minimumBid: Price | null = null;
    if (input.minimumBid !== null && input.minimumBid !== undefined) {
      const created = Price.create(input.minimumBid);
      if (!created.ok) return { ok: false, error: "invalid_price" };
      minimumBid = created.value;
    }

    const now = clock.now();

    const lots: AuctionLot[] = [];
    for (const lot of input.lots ?? []) {
      let lotMinimumBid: Price | null = null;
      if (lot.minimumBid !== null && lot.minimumBid !== undefined) {
        const created = Price.create(lot.minimumBid);
        if (!created.ok) return { ok: false, error: "invalid_price" };
        lotMinimumBid = created.value;
      }
      lots.push(
        AuctionLot.create({
          id: lot.id,
          auctionId: input.id,
          lotNumber: lot.lotNumber,
          title: lot.title ?? null,
          description: lot.description ?? null,
          minimumBid: lotMinimumBid,
          sortOrder: lot.sortOrder ?? lot.lotNumber,
        }),
      );
    }

    const props: AuctionProps = {
      id: input.id,
      slug: slug.value,
      title: input.title.trim(),
      status: "borrador" satisfies PropertyStatusCode,
      eventStatus: input.eventStatus ?? "proximo",
      scheduledAt,
      location: input.location ?? null,
      auctioneer: input.auctioneer ?? null,
      minimumBid,
      currency: input.currency ?? "USD",
      description: input.description ?? null,
      isFeatured: false,
      images: [],
      lots,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const auction = Auction.create(props);
    await repo.create(auction);
    return { ok: true, auction };
  };
}

export type UpdateAuction = (auction: Auction) => Promise<Auction | null>;

/** Persistir cambios de un remate existente (PLAN Sprint 8). */
export function createUpdateAuction(repo: AuctionRepository): UpdateAuction {
  return async (auction) => {
    const existing = await repo.findById(auction.id);
    if (!existing) return null;
    return repo.update(auction);
  };
}

export type SetAuctionEventStatus = (
  auction: Auction,
  eventStatus: AuctionEventStatusCode,
) => Promise<Auction | null>;

/** Cambiar estado del evento (`proximo`/`realizado`/`cancelado`). */
export function createSetAuctionEventStatus(repo: AuctionRepository): SetAuctionEventStatus {
  return async (auction, eventStatus) => {
    const existing = await repo.findById(auction.id);
    if (!existing) return null;
    return repo.update(existing.withEventStatus(eventStatus));
  };
}

export type ChangeAuctionStatus = (
  auction: Auction,
  status: PropertyStatusCode,
) => Promise<{ ok: true; auction: Auction } | { ok: false; error: "not_found" | "cannot_publish" }>;

/** Publicar / despublicar un remate. Publicar exige las reglas de dominio. */
export function createChangeAuctionStatus(repo: AuctionRepository): ChangeAuctionStatus {
  return async (auction, status) => {
    const existing = await repo.findById(auction.id);
    if (!existing) return { ok: false, error: "not_found" };

    const next = existing.withStatus(status);
    if (status === "publicado" && !next.canPublish()) {
      return { ok: false, error: "cannot_publish" };
    }

    const saved = await repo.update(next);
    return { ok: true, auction: saved };
  };
}
