import { describe, expect, it } from "vitest";
import { canPublishMachinery } from "@/domain/rules/machinery-rules";
import { MachineryItem } from "@/domain/entities/machinery-item";
import { Price } from "@/domain/value-objects/price";

function makeMachineryProps(overrides: Partial<Parameters<typeof MachineryItem.create>[0]> = {}) {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    slug: "tractor-massey-275",
    title: "Tractor Massey Ferguson 275",
    category: "tractor" as const,
    brand: "Massey Ferguson",
    model: "275",
    year: 2005,
    hoursUsed: 8200,
    price: Price.fromStored(28_500),
    currency: "USD",
    department: "Soriano",
    locality: "Mercedes",
    description: "En buen estado, arranque y andar.",
    status: "borrador" as const,
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
  };
}

function makeMachinery(overrides: Partial<Parameters<typeof MachineryItem.create>[0]> = {}) {
  return MachineryItem.create(makeMachineryProps(overrides));
}

describe("reglas de publicación de maquinaria", () => {
  it("permite publicar con todos los datos obligatorios", () => {
    expect(makeMachinery().publishBlockers()).toEqual([]);
    expect(makeMachinery().canPublish()).toBe(true);
  });

  it("bloquea sin precio", () => {
    const item = makeMachinery();
    const blockers = canPublishMachinery({
      title: item.title,
      slug: item.slug,
      category: item.category,
      department: item.department,
      price: null,
      hasMainImage: true,
    });
    expect(blockers).toEqual(["missing_price"]);
  });

  it("bloquea categoría no válida", () => {
    const blockers = canPublishMachinery({
      title: "Aviso",
      slug: "aviso",
      category: "obi" as "tractor",
      department: "Soriano",
      price: Price.fromStored(10_000),
      hasMainImage: true,
    });
    expect(blockers).toContain("missing_category");
  });

  it("acumula todos los bloqueos de datos base", () => {
    const blockers = canPublishMachinery({
      title: "  ",
      slug: "",
      category: "otro",
      department: "",
      price: null,
      hasMainImage: false,
    });
    expect(blockers).toEqual(
      expect.arrayContaining([
        "missing_title",
        "missing_slug",
        "missing_department",
        "missing_price",
        "missing_main_image",
      ]),
    );
  });
});

describe("entidad MachineryItem", () => {
  it("publica con status publicado y setea publishedAt", () => {
    const publicado = makeMachinery().withStatus("publicado");
    expect(publicado.status).toBe("publicado");
    expect(publicado.publishedAt).toBeInstanceOf(Date);
  });

  it("compone lineup a partir de marca y modelo", () => {
    expect(makeMachinery().lineup).toBe("Massey Ferguson 275");
  });

  it("usa el título como lineup si no hay marca ni modelo", () => {
    const item = makeMachinery({ brand: null, model: null });
    expect(item.lineup).toBe(item.title);
  });
});
