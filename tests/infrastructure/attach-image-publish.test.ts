import { describe, expect, it } from "vitest";

import {
  InMemoryAuctionRepository,
  InMemoryMachineryRepository,
  InMemoryPropertyRepository,
} from "@/adapters/persistence/in-memory-repositories";
import { createChangeAuctionStatus } from "@/application/use-cases/auction-lifecycle";
import { createChangeMachineryStatus } from "@/application/use-cases/machinery-lifecycle";
import { createChangePropertyStatus } from "@/application/use-cases/property-lifecycle";
import { Auction } from "@/domain/entities/auction";
import { MachineryItem } from "@/domain/entities/machinery-item";
import { Property } from "@/domain/entities/property";
import { Hectares } from "@/domain/value-objects/hectares";
import { Price } from "@/domain/value-objects/price";

/**
 * Regresión del flujo del panel: crear borrador → subir foto → publicar.
 * Sin la foto (`missing_main_image`) ningún publish debe pasar; con ella, sí.
 */
function propertyFixture(): Property {
  return Property.create({
    id: "campo-foto",
    slug: "campo-con-foto",
    name: "Campo con foto",
    status: "borrador",
    type: "mixto",
    price: Price.fromStored(250_000),
    hectares: Hectares.fromStored(300),
    location: {
      department: "Colonia",
      locality: null,
      latitude: null,
      longitude: null,
      accessNotes: null,
    },
    description: null,
    isFeatured: false,
    images: [],
    features: [],
    publishedAt: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
  });
}

const IMAGE = {
  id: "img-1",
  storagePath: "campos/campo-foto/img-1.jpg",
  url: "/uploads/campos/campo-foto/img-1.jpg",
  altText: "Campo con foto",
  sortOrder: 1,
  isMain: true,
};

describe("adjuntar foto habilita la publicación", () => {
  it("campos: sin foto no publica; con la foto adjuntada sí", async () => {
    const repo = new InMemoryPropertyRepository();
    const draft = propertyFixture();
    await repo.create(draft);
    const changeStatus = createChangePropertyStatus(repo);

    expect((await changeStatus(draft, "publicado")).ok).toBe(false);

    const withImage = await repo.update(draft.withImages([IMAGE]));
    const result = await changeStatus(withImage, "publicado");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.property.isPublished).toBe(true);
      expect(result.property.mainImage?.url).toBe(IMAGE.url);
    }
  });

  it("promueve la primera foto como principal (isMain)", async () => {
    const repo = new InMemoryPropertyRepository();
    await repo.create(propertyFixture());
    const updated = await repo.update(propertyFixture().withImages([IMAGE]));

    expect(updated.mainImage?.isMain).toBe(true);
    expect(updated.canPublish()).toBe(true);
  });

  it("actualiza ambos índices: la ficha pública encuentra el campo publicado", async () => {
    const repo = new InMemoryPropertyRepository();
    const draft = propertyFixture();
    await repo.create(draft);
    await repo.update(draft.withImages([IMAGE]));
    await createChangePropertyStatus(repo)(draft.withImages([IMAGE]), "publicado");

    expect((await repo.findBySlug("campo-con-foto"))?.isPublished).toBe(true);
  });

  it("remates requieren rematador y maquinaria requiere foto (flujo crear→foto→publicar)", async () => {
    const auctionRepo = new InMemoryAuctionRepository();
    const auction = Auction.create({
      id: "remate-foto",
      slug: "remate-con-foto",
      title: "Remate con foto",
      status: "borrador",
      eventStatus: "proximo",
      scheduledAt: new Date("2026-12-01T15:00:00-03:00"),
      location: "Estancia El Pinar, Colonia",
      auctioneer: null,
      minimumBid: null,
      currency: "USD",
      description: null,
      isFeatured: false,
      images: [],
      lots: [],
      publishedAt: null,
      createdAt: new Date("2026-10-01T00:00:00Z"),
      updatedAt: new Date("2026-10-01T00:00:00Z"),
    });
    await auctionRepo.create(auction);
    // Sin rematador el remate no publica (rules de dominio).
    expect((await createChangeAuctionStatus(auctionRepo)(auction, "publicado")).ok).toBe(false);

    // Con rematador agregado y foto adjuntada, el remate sí publica.
    const complete = Auction.create({
      id: auction.id,
      slug: auction.slug,
      title: auction.title,
      status: "borrador",
      eventStatus: "proximo",
      scheduledAt: auction.scheduledAt,
      location: auction.location,
      auctioneer: "Remates del Litoral",
      minimumBid: null,
      currency: "USD",
      description: null,
      isFeatured: false,
      images: [],
      lots: [],
      publishedAt: null,
      createdAt: auction.createdAt,
      updatedAt: auction.updatedAt,
    });
    await auctionRepo.update(complete);
    const auctionWithImage = await auctionRepo.update(
      complete.withImages([{ ...IMAGE, storagePath: "remates/remate-foto/img-1.jpg" }]),
    );
    expect((await createChangeAuctionStatus(auctionRepo)(auctionWithImage, "publicado")).ok).toBe(
      true,
    );

    const machineryRepo = new InMemoryMachineryRepository();
    const item = MachineryItem.create({
      id: "maq-foto",
      slug: "tractor-con-foto",
      title: "Tractor con foto",
      category: "tractor",
      brand: null,
      model: null,
      year: null,
      hoursUsed: null,
      price: Price.fromStored(15_000),
      currency: "USD",
      department: "Durazno",
      locality: null,
      description: null,
      status: "borrador",
      isFeatured: false,
      images: [],
      publishedAt: null,
      createdAt: new Date("2026-10-01T00:00:00Z"),
      updatedAt: new Date("2026-10-01T00:00:00Z"),
    });
    await machineryRepo.create(item);
    expect((await createChangeMachineryStatus(machineryRepo)(item, "publicado")).ok).toBe(false);
    const itemWithImage = await machineryRepo.update(
      item.withImages([{ ...IMAGE, storagePath: "maquinaria/maq-foto/img-1.jpg" }]),
    );
    expect((await createChangeMachineryStatus(machineryRepo)(itemWithImage, "publicado")).ok).toBe(
      true,
    );
  });
});
