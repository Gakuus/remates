import { describe, expect, it } from "vitest";
import { Property as PropertyEntity } from "@/domain/entities/property";
import { Hectares } from "@/domain/value-objects/hectares";
import { Price } from "@/domain/value-objects/price";
import { presentPropertyDetail } from "@/adapters/presentation/property-detail-presenter";

function makeProperty(
  overrides: Partial<Parameters<typeof PropertyEntity.create>[0]> = {},
): PropertyEntity {
  return PropertyEntity.create({
    id: "p-1",
    slug: "estancia-la-esperanza",
    name: "Estancia La Esperanza",
    status: "publicado",
    type: "ganadero",
    price: Price.fromStored(1_250_000),
    hectares: Hectares.fromStored(450),
    location: {
      department: "Paysandú",
      locality: "Chacras de Dolores",
      latitude: -32.5,
      longitude: -57.1,
      accessNotes: "A 4 km de la Ruta 3 por camino asfaltado.",
    },
    description: "Campo ganadero con casa y corrales.",
    isFeatured: true,
    images: [
      {
        id: "img-1",
        storagePath: "properties/p-1/1.webp",
        url: "https://example.com/1.webp",
        altText: "Vista principal",
        sortOrder: 0,
        isMain: true,
      },
      {
        id: "img-2",
        storagePath: "properties/p-1/2.webp",
        url: "https://example.com/2.webp",
        altText: "Corrales",
        sortOrder: 1,
        isMain: false,
      },
    ],
    features: [],
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

describe("presentPropertyDetail", () => {
  it("construye la URL canónica y el rastro de migas de pan", () => {
    const model = presentPropertyDetail(makeProperty());

    expect(model.href).toBe("/campos/paysandu/estancia-la-esperanza");
    expect(model.breadcrumb.map((c) => c.label)).toEqual([
      "Inicio",
      "Campos",
      "Paysandú",
      "Chacras de Dolores",
    ]);
    expect(model.locationLabel).toBe("Chacras de Dolores, Paysandú");
    expect(model.priceLabel).toBe("USD 1.250.000");
    expect(model.hectaresLabel).toBe("450 ha");
    expect(model.isFeatured).toBe(true);
  });

  it("arma la galería con todas las imágenes", () => {
    const model = presentPropertyDetail(makeProperty());
    expect(model.photoCount).toBe(2);
    expect(model.gallery).toHaveLength(2);
    expect(model.gallery[0]?.url).toBe("https://example.com/1.webp");
    expect(model.gallery[0]?.alt).toBe("Vista principal");
  });

  it("agrupa solo las características presentes", () => {
    const model = presentPropertyDetail(
      makeProperty({
        features: [
          { code: "aptitud", value: "Ganadero" },
          { code: "agua", value: "Manantial" },
          { code: "casa", value: "true" },
          { code: "electricidad", value: "true" },
        ],
      }),
    );

    const titles = model.featureGroups.map((g) => g.title);
    expect(titles).toContain("Superficie y aptitud");
    expect(titles).toContain("Recursos hídricos");
    expect(titles).toContain("Instalaciones");
    expect(titles).toContain("Infraestructura");
    // Sin monte, alambradas ni acceso: no se arma un grupo con esos ítems.
    expect(model.featureGroups.flatMap((g) => g.items.map((i) => i.label))).toEqual([
      "Superficie total",
      "Aptitud",
      "Agua",
      "Casa",
      "Electricidad",
    ]);
  });

  it("omite información productiva cuando no hay datos", () => {
    expect(presentPropertyDetail(makeProperty()).productiveInfo).toEqual([]);

    const withData = presentPropertyDetail(
      makeProperty({
        features: [
          { code: "tipo_suelo", value: "Franco" },
          { code: "productividad", value: "Alta" },
        ],
      }),
    );
    expect(withData.productiveInfo).toEqual([
      { label: "Tipo de suelo", value: "Franco" },
      { label: "Productividad", value: "Alta" },
    ]);
  });

  it("genera el enlace de mapa solo con coordenadas", () => {
    const withCoords = presentPropertyDetail(makeProperty());
    expect(withCoords.location.hasCoordinates).toBe(true);
    expect(withCoords.location.mapUrl).toContain("-32.5");

    const withoutCoords = presentPropertyDetail(
      makeProperty({ location: { department: "Paysandú", locality: null } }),
    );
    expect(withoutCoords.location.hasCoordinates).toBe(false);
    expect(withoutCoords.location.mapUrl).toBeNull();
    expect(withoutCoords.locationLabel).toBe("Paysandú");
  });

  it("muestra precio a consultar cuando no hay precio", () => {
    const model = presentPropertyDetail(makeProperty({ price: null }));
    expect(model.priceLabel).toBe("A consultar");
  });
});
