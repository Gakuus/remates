import { describe, expect, it } from "vitest";
import { canPublishAuction } from "@/domain/rules/auction-rules";
import { Auction, AuctionLot } from "@/domain/entities/auction";
import { Price } from "@/domain/value-objects/price";

function makeAuction() {
  return Auction.create({
    id: "33333333-3333-4333-8333-333333333333",
    slug: "remate-piedra-alta",
    title: "Remate Piedra Alta",
    status: "borrador",
    eventStatus: "proximo",
    scheduledAt: new Date("2026-11-15T15:00:00-03:00"),
    location: "Piedra Alta, Soriano",
    auctioneer: "Martillero Río Uruguay",
    minimumBid: Price.fromStored(50_000),
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
        minimumBid: Price.fromStored(20_000),
        sortOrder: 1,
      }),
    ],
    publishedAt: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
  });
}

describe("reglas de publicación de remates", () => {
  it("permite publicar con todos los datos obligatorios", () => {
    expect(makeAuction().publishBlockers()).toEqual([]);
    expect(makeAuction().canPublish()).toBe(true);
  });

  it("bloquea sin fecha/hora de remate", () => {
    const auction = makeAuction();
    const blockers = canPublishAuction({
      title: auction.title,
      slug: auction.slug,
      scheduledAt: new Date("invalid"),
      eventStatus: auction.eventStatus,
      location: auction.location,
      auctioneer: auction.auctioneer,
      hasMainImage: true,
    });
    expect(blockers).toEqual(["invalid_scheduled_at"]);
  });

  it("bloquea remate cancelado (no se publica)", () => {
    const blockers = canPublishAuction({
      title: "Remate",
      slug: "remate",
      scheduledAt: new Date(),
      eventStatus: "cancelado",
      location: "Soriano",
      auctioneer: "Martillero X",
      hasMainImage: true,
    });
    expect(blockers).toEqual(["canceled_event"]);
  });

  it("acumula bloqueos de ubicación, rematador y datos base", () => {
    const blockers = canPublishAuction({
      title: "   ",
      slug: "",
      scheduledAt: new Date(),
      eventStatus: "proximo",
      location: null,
      auctioneer: null,
      hasMainImage: false,
    });
    expect(blockers).toEqual(
      expect.arrayContaining([
        "missing_title",
        "missing_slug",
        "missing_location",
        "missing_auctioneer",
      ]),
    );
  });
});

describe("entidad Auction", () => {
  it("reporta isUpcoming solo para eventos próximos", () => {
    const proximo = makeAuction();
    expect(proximo.isUpcoming).toBe(true);

    const realizado = makeAuction();
    expect(realizado.withEventStatus("realizado").isUpcoming).toBe(false);
  });

  it("withStatus publica y setea publishedAt (no publicado) sin permitir cancelar", () => {
    const publicada = makeAuction().withStatus("publicado");
    expect(publicada.status).toBe("publicado");
    expect(publicada.publishedAt).toBeInstanceOf(Date);
  });

  it("withStatus no sobrescribe publishedAt si ya existía", () => {
    const publicado = makeAuction().withStatus("publicado");
    const again = publicado.withStatus("publicado");
    expect(again.publishedAt).toEqual(publicado.publishedAt);
  });

  it("requiere ubicación y rematador al publicar", () => {
    const auction = makeAuction();
    const blockers = canPublishAuction({
      title: auction.title,
      slug: auction.slug,
      scheduledAt: auction.scheduledAt,
      eventStatus: "proximo",
      location: null,
      auctioneer: null,
      hasMainImage: true,
    });
    expect(blockers).toEqual(["missing_location", "missing_auctioneer"]);
  });
});
