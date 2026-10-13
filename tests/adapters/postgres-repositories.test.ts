import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PostgresPropertyRepository } from "@/adapters/persistence/postgres-property-repository";
import { PostgresAuctionRepository } from "@/adapters/persistence/postgres-auction-repository";
import { PostgresMachineryRepository } from "@/adapters/persistence/postgres-machinery-repository";
import { PostgresCatalogRepository } from "@/adapters/persistence/postgres-catalog-repository";
import { PostgresInquiryRepository } from "@/adapters/persistence/postgres-inquiry-repository";
import { closePool, getPool } from "@/infrastructure/postgres/client";
import { Hectares } from "@/domain/value-objects/hectares";
import { Price } from "@/domain/value-objects/price";
import { Property as PropertyEntity } from "@/domain/entities/property";
import {
  Auction as AuctionEntity,
  AuctionLot as AuctionLotEntity,
} from "@/domain/entities/auction";
import { MachineryItem as MachineryItemEntity } from "@/domain/entities/machinery-item";
import { createInquiry } from "@/domain/entities/inquiry";

const hasDb = Boolean(process.env.DATABASE_URL);

async function poolOnce() {
  if (!hasDb) return null;
  try {
    const pool = getPool();
    const { rows } = await pool.query<{ ok: string }>("select 'ok' as ok");
    return rows[0]?.ok === "ok" ? pool : null;
  } catch {
    return null;
  }
}

const ok = await poolOnce();
const describeDb = ok ? describe : describe.skip;
const stamp = randomUUID().slice(0, 8);

describeDb("adaptadores Postgres", () => {
  beforeAll(async () => {
    await poolOnce();
  });

  afterAll(async () => {
    await closePool();
  });

  it("expone los catálogos con el seed", async () => {
    const repo = new PostgresCatalogRepository();
    const types = await repo.listTypes();
    const statuses = await repo.listStatuses();
    const categories = await repo.listMachineryCategories();

    expect(types.map((t) => t.code)).toEqual(["agricola", "ganadero", "mixto"]);
    expect(statuses.map((s) => s.code)).toContain("publicado");
    expect(categories.map((c) => c.code)).toContain("tractor");
  });

  it("crea, busca por criterios, actualiza con imagen/foto y borra un campo", async () => {
    const repo = new PostgresPropertyRepository();
    const id = randomUUID();
    const slug = `test-campo-${stamp}`;

    const property = PropertyEntity.create({
      id,
      slug,
      name: "Campo Postgres Test",
      status: "borrador",
      type: "ganadero",
      price: Price.fromStored(450000),
      hectares: Hectares.fromStored(120),
      location: { department: "Salto", locality: "Arapey" },
      description: "Un campo de prueba para la base real.",
      isFeatured: false,
      images: [
        {
          id: randomUUID(),
          storagePath: `campos/${id}/foto.png`,
          url: `/uploads/campos/${id}/foto.png`,
          altText: "Foto del campo",
          sortOrder: 0,
          isMain: true,
        },
      ],
      features: [{ code: "agua", value: "true" }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repo.create(property);

    const found = await repo.findById(id);
    expect(found?.name).toBe("Campo Postgres Test");
    expect(found?.mainImage?.url).toBe(`/uploads/campos/${id}/foto.png`);
    expect(found?.features.map((f) => f.code)).toContain("agua");

    const bySlug = await repo.findBySlug(slug);
    expect(bySlug).toBeNull();

    const draft = await repo.findBySlug(slug, { includeUnpublished: true });
    expect(draft?.id).toBe(id);

    const featured = await repo.listFeatured();
    expect(featured.some((p) => p.id === id)).toBe(false);

    const updated = property.withStatus("publicado").withImages([
      ...property.images,
      {
        id: randomUUID(),
        storagePath: `campos/${id}/otra.png`,
        url: `/uploads/campos/${id}/otra.png`,
        altText: "Segunda foto",
        sortOrder: 1,
        isMain: false,
      },
    ]);
    await repo.update(updated);

    const published = await repo.findBySlug(slug);
    expect(published?.id).toBe(id);
    expect(published?.images).toHaveLength(2);

    const salto = await repo.search({
      department: "Salto",
      type: "ganadero",
      price: { min: 400000 },
      statuses: ["publicado"],
      page: 1,
      pageSize: 24,
    });
    expect(salto.items.some((p) => p.id === id)).toBe(true);

    const counts = await repo.countByDepartment();
    expect(counts.find((c) => c.department === "Salto")?.count).toBeGreaterThanOrEqual(1);

    expect(await repo.deleteById(id)).toBe(true);
    expect(await repo.findById(id)).toBeNull();
  });

  it("crea un remate publicado con lote y lo persiste", async () => {
    const repo = new PostgresAuctionRepository();
    const id = randomUUID();
    const slug = `test-remate-${stamp}`;

    const auction = AuctionEntity.create({
      id,
      slug,
      title: "Remate Postgres Test",
      status: "publicado",
      eventStatus: "proximo",
      scheduledAt: new Date("2027-03-01T15:00:00Z"),
      location: "Tacuarembó, ruta 5",
      auctioneer: "Martillero Prueba",
      minimumBid: Price.fromStored(1000),
      currency: "USD",
      description: "Remate de prueba.",
      isFeatured: false,
      images: [],
      lots: [
        AuctionLotEntity.create({
          id: randomUUID(),
          auctionId: id,
          lotNumber: 1,
          title: "Lote 1",
          description: "Semental",
          minimumBid: Price.fromStored(500),
          sortOrder: 0,
        }),
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repo.create(auction);

    const found = await repo.findById(id);
    expect(found?.title).toBe("Remate Postgres Test");
    expect(found?.lots).toHaveLength(1);
    expect(found?.lots[0]?.lotNumber).toBe(1);

    const upcoming = await repo.listUpcoming();
    expect(upcoming.some((a) => a.id === id)).toBe(true);

    await repo.deleteById(id);
    expect(await repo.findById(id)).toBeNull();
  });

  it("crea maquinaria y la filtra por categoría y precio", async () => {
    const repo = new PostgresMachineryRepository();
    const id = randomUUID();
    const slug = `test-maquina-${stamp}`;

    const item = MachineryItemEntity.create({
      id,
      slug,
      title: "Tractor Test",
      category: "tractor",
      brand: "John Deere",
      model: "5R",
      year: 2020,
      hoursUsed: 1200,
      price: Price.fromStored(55000),
      currency: "USD",
      department: "Flores",
      locality: "Trinidad",
      status: "publicado",
      isFeatured: false,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repo.create(item);

    const found = await repo.findById(id);
    expect(found?.lineup).toBe("John Deere 5R");

    const results = await repo.search({
      category: "tractor",
      priceMax: 60000,
      statuses: ["publicado"],
    });
    expect(results.items.some((i) => i.id === id)).toBe(true);

    await repo.deleteById(id);
    expect(await repo.findById(id)).toBeNull();
  });

  it("persiste una consulta con sujeto de remate y la gestiona desde el panel", async () => {
    const repo = new PostgresInquiryRepository();
    const id = randomUUID();
    const result = createInquiry({
      id,
      subject: { type: "property", id: null },
      name: "Persona Test",
      email: "persona@example.com",
      phone: "+59899123",
      message: "Hola, me interesa un campo.",
      createdAt: new Date("2026-03-01T12:00:00Z"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    await repo.save(result.value);

    const listed = await repo.listInquiries();
    const saved = listed.find((i) => i.id === id);
    expect(saved?.name).toBe("Persona Test");
    expect(saved?.status).toBe("nuevo");

    expect(await repo.updateInquiryStatus(id, "respondido")).toBe(true);
    const updated = (await repo.listInquiries()).find((i) => i.id === id);
    expect(updated?.status).toBe("respondido");

    expect(await repo.updateInquiryStatus("no-existe", "archivado")).toBe(false);
  });
});
