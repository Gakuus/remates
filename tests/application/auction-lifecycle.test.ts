import { describe, expect, it } from "vitest";
import type {
  AuctionRepository,
  AuctionSearchCriteria,
  AuctionSearchResult,
} from "@/application/ports/auction-repository";
import type { Auction } from "@/domain/entities/auction";
import {
  createCreateAuction,
  createChangeAuctionStatus,
  createSetAuctionEventStatus,
} from "@/application/use-cases/auction-lifecycle";
import {
  createSearchAuctions,
  createGetUpcomingAuctions,
} from "@/application/use-cases/search-auctions";
import { Auction as AuctionEntity, AuctionLot } from "@/domain/entities/auction";

/** Repo en memoria: doble de prueba sin infraestructura. */
class MemoryAuctionRepository implements AuctionRepository {
  readonly items = new Map<string, Auction>();

  async create(auction: Auction): Promise<Auction> {
    this.items.set(auction.id, auction);
    return auction;
  }
  async update(auction: Auction): Promise<Auction> {
    this.items.set(auction.id, auction);
    return auction;
  }
  async findById(id: string): Promise<Auction | null> {
    return this.items.get(id) ?? null;
  }
  async findBySlug(slug: string): Promise<Auction | null> {
    return [...this.items.values()].find((a) => a.slug === slug) ?? null;
  }
  async search(criteria: AuctionSearchCriteria): Promise<AuctionSearchResult> {
    let items = [...this.items.values()];
    if (criteria.statuses) items = items.filter((a) => criteria.statuses!.includes(a.status));
    if (criteria.eventStatus) items = items.filter((a) => a.eventStatus === criteria.eventStatus);
    if (criteria.featured) items = items.filter((a) => a.isFeatured);
    items.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    const page = criteria.page ?? 1;
    const pageSize = criteria.pageSize ?? 24;
    const from = (page - 1) * pageSize;
    return { items: items.slice(from, from + pageSize), total: items.length, page, pageSize };
  }
  async listFeatured(): Promise<Auction[]> {
    return [...this.items.values()].filter((a) => a.isFeatured && a.isUpcoming);
  }
  async listUpcoming(): Promise<Auction[]> {
    return [...this.items.values()]
      .filter((a) => a.isPublished && a.isUpcoming)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async deleteById(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}

const clock = { now: () => new Date("2026-10-01T00:00:00Z") };

function makeAuction(overrides: Partial<Parameters<typeof AuctionEntity.create>[0]> = {}) {
  return AuctionEntity.create({
    id: "33333333-3333-4333-8333-333333333333",
    slug: "remate-piedra-alta",
    title: "Remate Piedra Alta",
    status: "borrador",
    eventStatus: "proximo",
    scheduledAt: new Date("2026-11-15T15:00:00-03:00"),
    location: "Piedra Alta, Soriano",
    auctioneer: "Martillero Río Uruguay",
    minimumBid: null,
    currency: "USD",
    description: "Vaca gorda y ganado en pie.",
    isFeatured: false,
    images: [
      {
        id: "img-auction-1",
        storagePath: "auctions/remate-1/1.webp",
        url: "https://example.com/remate-1.webp",
        altText: "Hacienda en el corral",
        sortOrder: 0,
        isMain: true,
      },
    ],
    lots: [
      AuctionLot.create({
        id: "33333333-3333-4333-8333-333333333341",
        auctionId: "33333333-3333-4333-8333-333333333333",
        lotNumber: 1,
        title: "Lote 1 - 20 novillos",
        minimumBid: null,
        sortOrder: 1,
      }),
    ],
    publishedAt: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  });
}

describe("createCreateAuction", () => {
  it("crea el remate como borrador con slug derivado", async () => {
    const repo = new MemoryAuctionRepository();
    const create = createCreateAuction(repo, clock);

    const result = await create({
      id: "33333333-3333-4333-8333-333333333333",
      title: "Remate Piedra Alta",
      scheduledAt: "2026-11-15T15:00:00-03:00",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.auction.slug).toBe("remate-piedra-alta");
      expect(result.auction.status).toBe("borrador");
      expect(result.auction.eventStatus).toBe("proximo");
      expect(result.auction.createdAt).toEqual(clock.now());
    }
  });

  it("rechaza fecha de remate no válida", async () => {
    const result = await createCreateAuction(
      new MemoryAuctionRepository(),
      clock,
    )({
      id: "33333333-3333-4333-8333-333333333333",
      title: "Remate",
      scheduledAt: "no-es-una-fecha",
    });
    expect(result).toEqual({ ok: false, error: "invalid_scheduled_at" });
  });

  it("rechaza precio mínimo negativo", async () => {
    const result = await createCreateAuction(
      new MemoryAuctionRepository(),
      clock,
    )({
      id: "33333333-3333-4333-8333-333333333333",
      title: "Remate",
      scheduledAt: "2026-11-15T15:00:00-03:00",
      minimumBid: -10,
    });
    expect(result).toEqual({ ok: false, error: "invalid_price" });
  });
});

describe("ChangeAuctionStatus", () => {
  it("publica un remate completo", async () => {
    const repo = new MemoryAuctionRepository();
    const auction = makeAuction();
    await repo.create(auction);

    const result = await createChangeAuctionStatus(repo)(auction, "publicado");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.auction.status).toBe("publicado");
      expect(result.auction.publishedAt).toBeInstanceOf(Date);
    }
  });

  it("rechaza publicar remates sin ubicación o rematador", async () => {
    const repo = new MemoryAuctionRepository();
    const auction = makeAuction({ location: null, auctioneer: null });
    await repo.create(auction);

    const result = await createChangeAuctionStatus(repo)(auction, "publicado");
    expect(result).toEqual({ ok: false, error: "cannot_publish" });
  });

  it("rechaza publicar un remate cancelado", async () => {
    const repo = new MemoryAuctionRepository();
    const auction = makeAuction({ eventStatus: "cancelado" });
    await repo.create(auction);

    const result = await createChangeAuctionStatus(repo)(auction, "publicado");
    expect(result).toEqual({ ok: false, error: "cannot_publish" });
  });

  it("retorna not_found si el remate no existe", async () => {
    const result = await createChangeAuctionStatus(new MemoryAuctionRepository())(
      makeAuction(),
      "publicado",
    );
    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

describe("SetAuctionEventStatus", () => {
  it("marca como realizado tras el evento", async () => {
    const repo = new MemoryAuctionRepository();
    const auction = makeAuction({ status: "publicado" });
    await repo.create(auction);

    const updated = await createSetAuctionEventStatus(repo)(auction, "realizado");
    expect(updated?.eventStatus).toBe("realizado");
  });

  it("retorna null si no existe", async () => {
    const updated = await createSetAuctionEventStatus(new MemoryAuctionRepository())(
      makeAuction(),
      "realizado",
    );
    expect(updated).toBeNull();
  });
});

describe("search de remates", () => {
  it("restringe por defecto a publicados y próximos", async () => {
    const repo = new MemoryAuctionRepository();
    const publicadoProximo = makeAuction({
      id: "33333333-3333-4333-8333-333333333001",
      slug: "remate-uno",
      status: "publicado",
      scheduledAt: new Date("2026-11-01T15:00:00-03:00"),
    });
    const borrador = makeAuction({
      id: "33333333-3333-4333-8333-333333333002",
      slug: "remate-borrador",
      status: "borrador",
    });
    await repo.create(publicadoProximo);
    await repo.create(borrador);

    const result = await createSearchAuctions(repo)({});
    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe("remate-uno");
  });

  it("trae próximos ordenados por fecha ascendente", async () => {
    const repo = new MemoryAuctionRepository();
    const tarde = makeAuction({
      id: "33333333-3333-4333-8333-333333333011",
      slug: "remate-tarde",
      status: "publicado",
      scheduledAt: new Date("2026-12-01T15:00:00-03:00"),
    });
    const temprano = makeAuction({
      id: "33333333-3333-4333-8333-333333333012",
      slug: "remate-temprano",
      status: "publicado",
      scheduledAt: new Date("2026-11-01T15:00:00-03:00"),
    });
    await repo.create(tarde);
    await repo.create(temprano);

    const upcoming = await createGetUpcomingAuctions(repo)(3);
    expect(upcoming.map((a) => a.slug)).toEqual(["remate-temprano", "remate-tarde"]);
  });
});
