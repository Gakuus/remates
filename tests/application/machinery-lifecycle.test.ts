import { describe, expect, it } from "vitest";
import type {
  MachineryRepository,
  MachinerySearchCriteria,
  MachinerySearchResult,
} from "@/application/ports/machinery-repository";
import type { MachineryItem } from "@/domain/entities/machinery-item";
import {
  createCreateMachinery,
  createChangeMachineryStatus,
} from "@/application/use-cases/machinery-lifecycle";
import {
  createSearchMachinery,
  createGetRecentMachinery,
} from "@/application/use-cases/search-machinery";
import { MachineryItem as MachineryItemEntity } from "@/domain/entities/machinery-item";
import { Price } from "@/domain/value-objects/price";

/** Repo en memoria: doble de prueba sin infraestructura. */
class MemoryMachineryRepository implements MachineryRepository {
  readonly items = new Map<string, MachineryItem>();

  async create(item: MachineryItem): Promise<MachineryItem> {
    this.items.set(item.id, item);
    return item;
  }
  async update(item: MachineryItem): Promise<MachineryItem> {
    this.items.set(item.id, item);
    return item;
  }
  async findById(id: string): Promise<MachineryItem | null> {
    return this.items.get(id) ?? null;
  }
  async findBySlug(slug: string): Promise<MachineryItem | null> {
    return [...this.items.values()].find((i) => i.slug === slug) ?? null;
  }
  async search(criteria: MachinerySearchCriteria): Promise<MachinerySearchResult> {
    let items = [...this.items.values()];
    if (criteria.statuses) items = items.filter((i) => criteria.statuses!.includes(i.status));
    if (criteria.department) items = items.filter((i) => i.department === criteria.department);
    if (criteria.brand) {
      const brand = criteria.brand.toLowerCase();
      items = items.filter((i) => (i.brand ?? "").toLowerCase().includes(brand));
    }
    items.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
    const page = criteria.page ?? 1;
    const pageSize = criteria.pageSize ?? 24;
    const from = (page - 1) * pageSize;
    return { items: items.slice(from, from + pageSize), total: items.length, page, pageSize };
  }
  async listFeatured(): Promise<MachineryItem[]> {
    return [...this.items.values()].filter((i) => i.isFeatured && i.isPublished);
  }
  async listRecent(): Promise<MachineryItem[]> {
    return this.search({}).then((r) => r.items);
  }

  async deleteById(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}

const clock = { now: () => new Date("2026-10-01T00:00:00Z") };

function makeMachinery(overrides: Partial<Parameters<typeof MachineryItemEntity.create>[0]> = {}) {
  return MachineryItemEntity.create({
    id: "44444444-4444-4444-8444-444444444444",
    slug: "tractor-massey-275",
    title: "Tractor Massey Ferguson 275",
    category: "tractor",
    brand: "Massey Ferguson",
    model: "275",
    year: 2005,
    hoursUsed: 8200,
    price: null,
    currency: "USD",
    department: "Soriano",
    locality: "Mercedes",
    description: "En buen estado.",
    status: "borrador",
    isFeatured: false,
    images: [
      {
        id: "img-mach-1",
        storagePath: "machinery/tractor-1/1.webp",
        url: "https://example.com/tractor-1.webp",
        altText: "Tractor MF 275",
        sortOrder: 0,
        isMain: true,
      },
    ],
    publishedAt: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  });
}

describe("createCreateMachinery", () => {
  it("crea el aviso como borrador con slug derivado", async () => {
    const repo = new MemoryMachineryRepository();
    const create = createCreateMachinery(repo, clock);

    const result = await create({
      id: "44444444-4444-4444-8444-444444444444",
      title: "Tractor Massey Ferguson 275",
      category: "tractor",
      brand: "Massey Ferguson",
      model: "275",
      department: "Soriano",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.slug).toBe("tractor-massey-ferguson-275");
      expect(result.item.status).toBe("borrador");
      expect(result.item.price).toBeNull();
    }
  });

  it("rechaza precio negativo", async () => {
    const result = await createCreateMachinery(
      new MemoryMachineryRepository(),
      clock,
    )({
      id: "44444444-4444-4444-8444-444444444444",
      title: "Tractor MF 275",
      category: "tractor",
      department: "Soriano",
      price: -100,
    });
    expect(result).toEqual({ ok: false, error: "invalid_price" });
  });
});

describe("ChangeMachineryStatus", () => {
  it("publica un aviso completo", async () => {
    const repo = new MemoryMachineryRepository();
    const item = makeMachinery({ price: Price.fromStored(28_500) });
    await repo.create(item);

    const result = await createChangeMachineryStatus(repo)(item, "publicado");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.status).toBe("publicado");
    }
  });

  it("rechaza publicar sin precio", async () => {
    const repo = new MemoryMachineryRepository();
    const item = makeMachinery({ price: null });
    await repo.create(item);

    const result = await createChangeMachineryStatus(repo)(item, "publicado");
    expect(result).toEqual({ ok: false, error: "cannot_publish" });
  });

  it("retorna not_found si no existe", async () => {
    const result = await createChangeMachineryStatus(new MemoryMachineryRepository())(
      makeMachinery(),
      "publicado",
    );
    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

describe("search de maquinaria", () => {
  it("restringe por defecto a publicados", async () => {
    const repo = new MemoryMachineryRepository();
    await repo.create(
      makeMachinery({
        id: "44444444-4444-4444-8444-444444444001",
        slug: "aviso-publicado",
        status: "publicado",
      }),
    );
    await repo.create(
      makeMachinery({
        id: "44444444-4444-4444-8444-444444444002",
        slug: "aviso-borrador",
        status: "borrador",
      }),
    );

    const result = await createSearchMachinery(repo)({});
    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe("aviso-publicado");
  });

  it("filtra por departamento y marca", async () => {
    const repo = new MemoryMachineryRepository();
    await repo.create(
      makeMachinery({
        id: "44444444-4444-4444-8444-444444444011",
        slug: "tractor-en-soriano",
        status: "publicado",
        department: "Soriano",
        brand: "Massey Ferguson",
      }),
    );
    await repo.create(
      makeMachinery({
        id: "44444444-4444-4444-8444-444444444012",
        slug: "camion-en-rio-negro",
        status: "publicado",
        department: "Río Negro",
        brand: "Ford",
        category: "camion",
      }),
    );

    const result = await repo.search({
      department: "Soriano",
      brand: "massey",
      statuses: ["publicado"],
    });
    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe("tractor-en-soriano");
  });

  it("trae los más recientes", async () => {
    const repo = new MemoryMachineryRepository();
    await repo.create(
      makeMachinery({
        id: "44444444-4444-4444-8444-444444444021",
        slug: "antiguo",
        status: "publicado",
        publishedAt: new Date("2026-01-01T00:00:00Z"),
      }),
    );
    await repo.create(
      makeMachinery({
        id: "44444444-4444-4444-8444-444444444022",
        slug: "nuevo",
        status: "publicado",
        publishedAt: new Date("2026-02-01T00:00:00Z"),
      }),
    );

    const recent = await createGetRecentMachinery(repo)(4);
    expect(recent.map((i) => i.slug)).toEqual(["nuevo", "antiguo"]);
  });
});
