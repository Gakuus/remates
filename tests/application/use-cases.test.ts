import { describe, expect, it } from "vitest";
import type {
  PropertyRepository,
  SearchCriteria,
  SearchResult,
} from "@/application/ports/property-repository";
import type { Property } from "@/domain/entities/property";
import type { InquiryProps } from "@/domain/entities/inquiry";
import { createInquiry } from "@/domain/entities/inquiry";
import type { InquiryRepository } from "@/application/ports/inquiry-repository";
import { createChangePropertyStatus } from "@/application/use-cases/property-lifecycle";
import { createSubmitInquiry } from "@/application/use-cases/submit-inquiry";
import { createListInquiries } from "@/application/use-cases/list-inquiries";
import { createUpdateInquiryStatus } from "@/application/use-cases/update-inquiry-status";
import { createSearchProperties } from "@/application/use-cases/search-properties";
import { Property as PropertyEntity } from "@/domain/entities/property";
import { Hectares } from "@/domain/value-objects/hectares";
import { Price } from "@/domain/value-objects/price";

/** Doble mínimo del puerto de consultas (PLAN §2). */
function fakeInquiryRepo(saved: InquiryProps[] = []): InquiryRepository {
  return {
    save: async (inquiry) => {
      saved.push(inquiry);
    },
    listInquiries: async () =>
      [...saved].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    updateInquiryStatus: async (id, status) => {
      const found = saved.find((i) => i.id === id);
      if (!found) return false;
      found.status = status;
      return true;
    },
  };
}

/** Repo en memoria: doble de prueba sin infraestructura (PLAN §2). */
class InMemoryPropertyRepository implements PropertyRepository {
  readonly items = new Map<string, Property>();

  async create(property: Property): Promise<Property> {
    this.items.set(property.id, property);
    return property;
  }
  async update(property: Property): Promise<Property> {
    this.items.set(property.id, property);
    return property;
  }
  async findById(id: string): Promise<Property | null> {
    return this.items.get(id) ?? null;
  }
  async findBySlug(slug: string): Promise<Property | null> {
    return [...this.items.values()].find((p) => p.slug === slug) ?? null;
  }
  async search(criteria: SearchCriteria): Promise<SearchResult> {
    let items = [...this.items.values()];
    if (criteria.statuses) {
      items = items.filter((p) => criteria.statuses!.includes(p.status));
    }
    if (criteria.featured !== undefined) {
      items = items.filter((p) => p.isFeatured === criteria.featured);
    }
    const page = criteria.page ?? 1;
    const pageSize = criteria.pageSize ?? 24;
    const from = (page - 1) * pageSize;
    return {
      items: items.slice(from, from + pageSize),
      total: items.length,
      page,
      pageSize,
    };
  }
  async listFeatured(): Promise<Property[]> {
    return [...this.items.values()].filter((p) => p.isFeatured);
  }
  async listRecent(): Promise<Property[]> {
    return [...this.items.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async countByDepartment(): Promise<Array<{ department: string; count: number }>> {
    const counts = new Map<string, number>();
    for (const p of this.items.values()) {
      counts.set(p.location.department, (counts.get(p.location.department) ?? 0) + 1);
    }
    return [...counts.entries()].map(([department, count]) => ({ department, count }));
  }

  async deleteById(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}

function makeProperty(overrides: Partial<Parameters<typeof PropertyEntity.create>[0]> = {}) {
  return PropertyEntity.create({
    id: "22222222-2222-4222-8222-222222222222",
    slug: "estancia-la-esperanza",
    name: "Estancia La Esperanza",
    status: "borrador",
    type: "ganadero",
    price: Price.fromStored(1_250_000),
    hectares: Hectares.fromStored(450),
    location: {
      department: "Paysandú",
      locality: null,
      latitude: null,
      longitude: null,
      accessNotes: null,
    },
    description: "Campo ganadero con casa y corrales.",
    isFeatured: false,
    images: [
      {
        id: "img-1",
        storagePath: "properties/p1/1.webp",
        url: "https://example.com/1.webp",
        altText: "Vista principal",
        sortOrder: 0,
        isMain: true,
      },
    ],
    features: [],
    publishedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

describe("ChangePropertyStatus", () => {
  it("publica un campo que cumple las reglas", async () => {
    const repo = new InMemoryPropertyRepository();
    const property = makeProperty();
    await repo.create(property);

    const useCase = createChangePropertyStatus(repo);
    const result = await useCase(property, "publicado");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.property.status).toBe("publicado");
      expect(result.property.publishedAt).toBeInstanceOf(Date);
    }
  });

  it("rechaza publicar sin precio", async () => {
    const repo = new InMemoryPropertyRepository();
    const property = makeProperty({ price: null });
    await repo.create(property);

    const useCase = createChangePropertyStatus(repo);
    const result = await useCase(property, "publicado");

    expect(result).toEqual({ ok: false, error: "cannot_publish" });
    expect((await repo.findById(property.id))?.status).toBe("borrador");
  });

  it("despublica un campo publicado sin reglas", async () => {
    const repo = new InMemoryPropertyRepository();
    const property = makeProperty().withStatus("publicado");
    await repo.create(property);

    const useCase = createChangePropertyStatus(repo);
    const result = await useCase(property, "borrador");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.property.status).toBe("borrador");
  });

  it("devuelve not_found si el campo no existe", async () => {
    const repo = new InMemoryPropertyRepository();
    const useCase = createChangePropertyStatus(repo);
    const result = await useCase(makeProperty(), "publicado");
    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

describe("SubmitInquiry", () => {
  it("persiste una consulta válida", async () => {
    const saved: InquiryProps[] = [];
    const repo = fakeInquiryRepo(saved);

    const submit = createSubmitInquiry(repo);
    const result = await submit({
      id: "33333333-3333-4333-8333-333333333333",
      subject: { type: "property", id: null },
      name: "María Rodríguez",
      email: "maria@example.com.uy",
      message: "Quisiera coordinar una visita al campo.",
    });

    expect(result.ok).toBe(true);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.status).toBe("nuevo");
  });

  it("no persiste consultas inválidas", async () => {
    const repo = fakeInquiryRepo();
    const submit = createSubmitInquiry(repo);
    const result = await submit({
      id: "44444444-4444-4444-8444-444444444444",
      subject: { type: "property", id: null },
      name: "María",
      email: "no-email",
      message: "hola",
    });

    expect(result.ok).toBe(false);
  });

  it("lista las consultas de la más reciente a la más antigua", async () => {
    const older = createInquiry({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      subject: { type: "property", id: null },
      name: "Ana",
      email: "ana@example.com",
      message: "Mensaje viejo",
      createdAt: new Date("2026-01-01T12:00:00Z"),
    });
    const newer = createInquiry({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      subject: { type: "property", id: null },
      name: "Bruno",
      email: "bruno@example.com",
      message: "Mensaje reciente",
      createdAt: new Date("2026-02-01T12:00:00Z"),
    });
    expect(older.ok).toBe(true);
    expect(newer.ok).toBe(true);
    if (!older.ok || !newer.ok) return;

    const list = createListInquiries(fakeInquiryRepo([older.value, newer.value]));
    const result = await list();
    expect(result.map((i) => i.name)).toEqual(["Bruno", "Ana"]);
  });
});

describe("UpdateInquiryStatus", () => {
  it("marca como respondida una consulta existente", async () => {
    const inquiry = createInquiry({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
      subject: { type: "property", id: null },
      name: "Carlos",
      email: "carlos@example.com",
      message: "Consulta para responder.",
    });
    expect(inquiry.ok).toBe(true);
    if (!inquiry.ok) return;

    const repo = fakeInquiryRepo([inquiry.value]);
    const update = createUpdateInquiryStatus(repo);
    expect(await update(inquiry.value.id, "respondido")).toEqual({ ok: true });
    expect((await repo.listInquiries())[0]?.status).toBe("respondido");
  });

  it("rechaza estados inválidos", async () => {
    const update = createUpdateInquiryStatus(fakeInquiryRepo());
    expect(await update("cualquier-id", "spam")).toEqual({ ok: false, error: "invalid_status" });
    expect(await update("", "respondido")).toEqual({ ok: false, error: "invalid_status" });
  });

  it("devuelve not_found si la consulta no existe", async () => {
    const update = createUpdateInquiryStatus(fakeInquiryRepo());
    expect(await update("no-existe", "respondido")).toEqual({
      ok: false,
      error: "not_found",
    });
  });
});

describe("SearchProperties", () => {
  it("restringe por defecto a estados publicados", async () => {
    const repo = new InMemoryPropertyRepository();
    await repo.create(makeProperty());
    await repo.create(makeProperty({ id: "pub", slug: "otro-campo" }).withStatus("publicado"));

    const search = createSearchProperties(repo);
    const result = await search({});

    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe("otro-campo");
  });

  it("aplica paginación y orden por defecto", async () => {
    const repo = new InMemoryPropertyRepository();
    await repo.create(makeProperty({ id: "a", slug: "a" }).withStatus("publicado"));
    const search = createSearchProperties(repo);

    const result = await search({ page: 2, pageSize: 10 });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
  });
});
