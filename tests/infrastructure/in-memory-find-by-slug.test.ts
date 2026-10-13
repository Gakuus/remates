import { describe, expect, it } from "vitest";
import {
  InMemoryAuctionRepository,
  InMemoryMachineryRepository,
  InMemoryPropertyRepository,
} from "@/adapters/persistence/in-memory-repositories";
import { createGetAuctionBySlug } from "@/application/use-cases/search-auctions";
import { createGetMachineryBySlug } from "@/application/use-cases/search-machinery";
import { createGetPropertyBySlug } from "@/application/use-cases/property-lifecycle";
import { Auction as AuctionEntity } from "@/domain/entities/auction";
import { MachineryItem as MachineryItemEntity } from "@/domain/entities/machinery-item";
import { Property as PropertyEntity } from "@/domain/entities/property";
import { Hectares } from "@/domain/value-objects/hectares";
import { Price } from "@/domain/value-objects/price";

function makeProperty(status: "publicado" | "borrador") {
  return PropertyEntity.create({
    id: status === "publicado" ? "prop-pub" : "prop-draft",
    slug: status === "publicado" ? "campo-publicado" : "campo-borrador",
    name: status === "publicado" ? "Campo Publicado" : "Campo Borrador",
    status,
    type: "ganadero",
    price: Price.fromStored(120_000),
    hectares: Hectares.fromStored(200),
    location: {
      department: "Salto",
      locality: null,
      latitude: null,
      longitude: null,
      accessNotes: null,
    },
    description: null,
    isFeatured: false,
    images: [],
    features: [],
    publishedAt: status === "publicado" ? new Date("2026-10-01T00:00:00Z") : null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
  });
}

function makeAuction(status: "publicado" | "borrador") {
  return AuctionEntity.create({
    id: status === "publicado" ? "auct-pub" : "auct-draft",
    slug: status === "publicado" ? "remate-publicado" : "remate-borrador",
    title: status === "publicado" ? "Remate Publicado" : "Remate Borrador",
    status,
    eventStatus: "proximo",
    scheduledAt: new Date("2026-12-01T15:00:00-03:00"),
    location: "Salto",
    auctioneer: null,
    minimumBid: null,
    currency: "USD",
    description: null,
    isFeatured: false,
    images: [],
    lots: [],
    publishedAt: status === "publicado" ? new Date("2026-10-01T00:00:00Z") : null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
  });
}

function makeMachinery(status: "publicado" | "borrador") {
  return MachineryItemEntity.create({
    id: status === "publicado" ? "mach-pub" : "mach-draft",
    slug: status === "publicado" ? "tractor-publicado" : "tractor-borrador",
    title: status === "publicado" ? "Tractor Publicado" : "Tractor Borrador",
    category: "tractor",
    brand: null,
    model: null,
    year: null,
    hoursUsed: null,
    price: status === "publicado" ? Price.fromStored(9_000) : null,
    currency: "USD",
    department: "Durazno",
    locality: null,
    description: null,
    status,
    isFeatured: false,
    images: [],
    publishedAt: status === "publicado" ? new Date("2026-10-01T00:00:00Z") : null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
  });
}

describe("findBySlug público oculta borradores (consistencia con Supabase)", () => {
  it("property: devuelve el publicado y oculta el borrador", async () => {
    const repo = new InMemoryPropertyRepository();
    await repo.create(makeProperty("borrador"));
    await repo.create(makeProperty("publicado"));
    const useCase = createGetPropertyBySlug(repo);

    expect((await useCase("campo-publicado"))?.id).toBe("prop-pub");
    expect(await useCase("campo-borrador")).toBeNull();
  });

  it("auction: devuelve el publicado y oculta el borrador", async () => {
    const repo = new InMemoryAuctionRepository();
    await repo.create(makeAuction("borrador"));
    await repo.create(makeAuction("publicado"));
    const useCase = createGetAuctionBySlug(repo);

    expect((await useCase("remate-publicado"))?.id).toBe("auct-pub");
    expect(await useCase("remate-borrador")).toBeNull();
  });

  it("auction: tras publicar con update, la ficha pública responde", async () => {
    const repo = new InMemoryAuctionRepository();
    const draft = makeAuction("borrador");
    await repo.create(draft);
    const published = draft.withStatus("publicado");
    await repo.update(published);

    const useCase = createGetAuctionBySlug(repo);
    expect((await useCase("remate-borrador"))?.status).toBe("publicado");
  });

  it("machinery: devuelve el publicado y oculta el borrador", async () => {
    const repo = new InMemoryMachineryRepository();
    await repo.create(makeMachinery("borrador"));
    await repo.create(makeMachinery("publicado"));
    const useCase = createGetMachineryBySlug(repo);

    expect((await useCase("tractor-publicado"))?.id).toBe("mach-pub");
    expect(await useCase("tractor-borrador")).toBeNull();
  });

  it("machinery: tras publicar con update, la ficha pública responde", async () => {
    const repo = new InMemoryMachineryRepository();
    const draft = makeMachinery("borrador");
    await repo.create(draft);
    const published = draft.withStatus("publicado");
    await repo.update(published);

    const useCase = createGetMachineryBySlug(repo);
    expect((await useCase("tractor-borrador"))?.status).toBe("publicado");
  });
});
