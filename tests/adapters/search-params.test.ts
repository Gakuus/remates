import { describe, expect, it } from "vitest";
import { parseCatalogParams } from "@/adapters/http/search-params";
import { buildActiveFilters } from "@/adapters/presentation/active-filters";

describe("parseCatalogParams", () => {
  it("devuelve criterio vacío con defaults para params vacíos", () => {
    const { criteria, issues } = parseCatalogParams({});
    expect(criteria.sort).toBe("relevancia");
    expect(criteria.page).toBe(1);
    expect(criteria.pageSize).toBe(24);
    expect(criteria.statuses).toEqual(["publicado"]);
    expect(issues).toEqual([]);
  });

  it("mapea filtros principales a criterios de búsqueda", () => {
    const { criteria } = parseCatalogParams({
      q: "esperanza",
      depto: "Paysandú",
      tipo: "ganadero",
      ha_min: "100",
      ha_max: "500",
      precio_min: "500000",
      precio_max: "2000000",
    });

    expect(criteria.query).toBe("esperanza");
    expect(criteria.department).toBe("Paysandú");
    expect(criteria.type).toBe("ganadero");
    expect(criteria.hectares).toEqual({ min: 100, max: 500 });
    expect(criteria.price).toEqual({ min: 500000, max: 2000000 });
  });

  it("mapea características f_<code>", () => {
    const { criteria, issues } = parseCatalogParams({
      f_casa: "true",
      f_agua: "true",
      f_desconocida: "true",
    });

    expect(criteria.features).toEqual({ casa: "true", agua: "true" });
    expect(issues).toContain("f_desconocida");
  });

  it("ignora orden y página inválidos", () => {
    const { criteria, issues } = parseCatalogParams({ orden: "no-existe", page: "-3" });
    expect(criteria.sort).toBe("relevancia");
    expect(criteria.page).toBe(1);
    expect(issues).toEqual(expect.arrayContaining(["orden", "page"]));
  });

  it("acepta arrays repetidos tomando el primero", () => {
    const { criteria } = parseCatalogParams({ depto: ["Salto", "Rivera"] });
    expect(criteria.department).toBe("Salto");
  });

  it("descarta números no finitos en rangos", () => {
    const { criteria } = parseCatalogParams({ ha_min: "abc" });
    expect(criteria.hectares).toBeUndefined();
  });
});

describe("buildActiveFilters", () => {
  const empty = {
    q: "",
    depto: "",
    localidad: "",
    tipo: "",
    precioMin: "",
    precioMax: "",
    haMin: "",
    haMax: "",
    features: {},
  };

  it("no genera chips sin filtros", () => {
    expect(buildActiveFilters(empty)).toEqual([]);
  });

  it("genera un chip por filtro con etiqueta legible", () => {
    const chips = buildActiveFilters({
      ...empty,
      q: "la esperanza",
      depto: "Paysandú",
      tipo: "ganadero",
      haMin: "100",
      precioMax: "1500000",
      features: { casa: "true", electricidad: "true" },
    });

    expect(chips.map((c) => c.param)).toEqual([
      "q",
      "depto",
      "tipo",
      "precio_max",
      "ha_min",
      "f_casa",
      "f_electricidad",
    ]);
    expect(chips.find((c) => c.param === "tipo")?.label).toBe("Ganadero");
    expect(chips.find((c) => c.param === "ha_min")?.label).toBe("Desde 100 ha");
    expect(chips.find((c) => c.param === "f_casa")?.label).toBe("Casa");
  });
});
