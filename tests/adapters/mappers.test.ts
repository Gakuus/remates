import { describe, expect, it } from "vitest";
import {
  mapFeatures,
  mapImages,
  mapLocation,
  mapProperty,
  type PropertyRow,
} from "@/adapters/persistence/mappers";

function makeRow(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    id: "p-1",
    slug: "estancia-la-esperanza",
    name: "Estancia La Esperanza",
    status_code: "publicado",
    type_code: "ganadero",
    price: "1250000",
    currency: "USD",
    hectares: "450",
    department: "Paysandú",
    locality: "Chacras de Dolores",
    latitude: "-32.4782",
    longitude: "-57.1034",
    access_notes: "A 4 km de la ruta 3",
    description: "Campo con casa y corrales.",
    is_featured: true,
    main_image_path: "properties/p-1/main.webp",
    main_image_url: "https://example.com/main.webp",
    published_at: "2026-01-15T10:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("mapProperty", () => {
  it("convierte strings de Postgres a value objects tipados", () => {
    const property = mapProperty(makeRow());

    expect(property.id).toBe("p-1");
    expect(property.slug).toBe("estancia-la-esperanza");
    expect(property.status).toBe("publicado");
    expect(property.isPublished).toBe(true);
    expect(property.type).toBe("ganadero");
    expect(property.price?.value).toBe(1_250_000);
    expect(property.price?.currency).toBe("USD");
    expect(property.hectares.value).toBe(450);
    expect(property.location.latitude).toBeCloseTo(-32.4782);
    expect(property.location.longitude).toBeCloseTo(-57.1034);
    expect(property.isFeatured).toBe(true);
    expect(property.publishedAt?.toISOString()).toBe("2026-01-15T10:00:00.000Z");
  });

  it("tolera precio nulo y coordenadas nulas", () => {
    const property = mapProperty(
      makeRow({
        price: null,
        currency: null,
        latitude: null,
        longitude: null,
        locality: null,
        description: null,
        published_at: null,
      }),
    );

    expect(property.price).toBeNull();
    expect(property.location.latitude).toBeNull();
    expect(property.location.locality).toBeNull();
    expect(property.description).toBeNull();
    expect(property.publishedAt).toBeNull();
  });

  it("arma la imagen principal aunque no venga ordenada", () => {
    const property = mapProperty(
      makeRow({
        images: [
          {
            id: "img-2",
            storage_path: "properties/p-1/2.webp",
            url: "https://example.com/2.webp",
            alt_text: "Corrales",
            sort_order: 1,
            is_main: false,
          },
          {
            id: "img-1",
            storage_path: "properties/p-1/1.webp",
            url: "https://example.com/1.webp",
            alt_text: "Vista",
            sort_order: 0,
            is_main: true,
          },
        ],
      }),
    );

    expect(property.images.map((image) => image.id)).toEqual(["img-1", "img-2"]);
    expect(property.mainImage?.id).toBe("img-1");
  });
});

describe("mapImages", () => {
  it("ordena por sort_order y no rompe con fila ausente", () => {
    expect(mapImages(undefined)).toEqual([]);

    const images = mapImages([
      {
        id: "b",
        storage_path: "b.webp",
        url: "https://example.com/b.webp",
        alt_text: "",
        sort_order: 5,
        is_main: false,
      },
      {
        id: "a",
        storage_path: "a.webp",
        url: "https://example.com/a.webp",
        alt_text: "",
        sort_order: 1,
        is_main: false,
      },
    ]);

    expect(images.map((image) => image.id)).toEqual(["a", "b"]);
  });
});

describe("mapFeatures", () => {
  it("descarta códigos fuera del catálogo de dominio", () => {
    const features = mapFeatures([
      { feature_code: "casa", value: "true" },
      { feature_code: "tipo_suelo", value: "Franco" },
      { feature_code: "codigo_que_no_existe", value: "x" },
    ]);

    expect(features).toEqual([
      { code: "casa", value: "true" },
      { code: "tipo_suelo", value: "Franco" },
    ]);
  });
});

describe("mapLocation", () => {
  it("mapea accesos y localidad", () => {
    const location = mapLocation(makeRow());
    expect(location).toEqual({
      department: "Paysandú",
      locality: "Chacras de Dolores",
      latitude: -32.4782,
      longitude: -57.1034,
      accessNotes: "A 4 km de la ruta 3",
    });
  });
});
