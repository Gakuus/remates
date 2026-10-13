import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Property as PropertyEntity } from "@/domain/entities/property";
import { Hectares } from "@/domain/value-objects/hectares";
import { Price } from "@/domain/value-objects/price";
import { presentPropertyDetail } from "@/adapters/presentation/property-detail-presenter";
import { PropertyDetailView } from "@/ui/features/property/detail-view";

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
    location: { department: "Paysandú", locality: "Chacras de Dolores" },
    description: "Campo ganadero con casa, galpón y corrales.",
    isFeatured: false,
    images: [
      {
        id: "img-1",
        storagePath: "p/1.webp",
        url: "https://example.com/1.webp",
        altText: "Vista principal",
        sortOrder: 0,
        isMain: true,
      },
    ],
    features: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function render(entity: PropertyEntity): string {
  return renderToStaticMarkup(<PropertyDetailView property={presentPropertyDetail(entity)} />);
}

describe("PropertyDetailView", () => {
  it("respetá el orden editorial: galería, datos, descripción, características", () => {
    const html = render(
      makeProperty({
        features: [
          { code: "agua", value: "Manantial" },
          { code: "tipo_suelo", value: "Franco" },
        ],
      }),
    );

    // next/image sirve vía /_next/image?url=… (el archivo igual es visible).
    const gallery = html.indexOf("1.webp");
    const title = html.indexOf("Estancia La Esperanza");
    const description = html.indexOf("Descripción");
    const features = html.indexOf("Características");
    const location = html.indexOf("Ubicación y accesos");

    expect(gallery).toBeGreaterThan(-1);
    expect(title).toBeGreaterThan(gallery);
    expect(description).toBeGreaterThan(title);
    expect(features).toBeGreaterThan(description);
    expect(location).toBeGreaterThan(features);
  });

  it("muestra el CTA primario y la barra sticky mobile", () => {
    const html = render(makeProperty());
    const ctas = html.match(/Consultar por este campo/g) ?? [];
    expect(ctas.length).toBeGreaterThanOrEqual(2); // aside + barra mobile
    expect(html).toContain("fixed inset-x-0 bottom-0");
  });

  it("omite bloques opcionales vacíos", () => {
    const html = render(makeProperty({ description: null, features: [] }));
    expect(html).not.toContain("Descripción");
    expect(html).not.toContain("Información productiva");
    expect(html).toContain("Características"); // superficie siempre está
    expect(html).toContain("Ubicación y accesos");
  });

  it("renderiza información productiva solo cuando hay datos", () => {
    const html = render(
      makeProperty({ features: [{ code: "uso_actual", value: "Ganadería extensiva" }] }),
    );
    expect(html).toContain("Información productiva");
    expect(html).toContain("Ganadería extensiva");
  });

  it("incluye las migas de pan con la última miga en curso", () => {
    const html = render(makeProperty());
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Campos");
    expect(html).toContain("Paysandú");
  });
});
