import { describe, expect, it } from "vitest";
import { Hectares } from "@/domain/value-objects/hectares";
import { Price } from "@/domain/value-objects/price";
import { createSlug, departmentSlug, slugify } from "@/domain/value-objects/slug";
import { Coordinates } from "@/domain/value-objects/coordinates";

describe("Hectares", () => {
  it("acepta superficies positivas", () => {
    const result = Hectares.create(450);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe(450);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rechaza la superficie inválida %s",
    (value) => {
      expect(Hectares.create(value).ok).toBe(false);
    },
  );

  it("formatea con separadores es-UY", () => {
    const h = Hectares.fromStored(1250.5);
    expect(h.format()).toBe("1.250,5");
  });

  it("compara igualdad", () => {
    expect(Hectares.fromStored(100).equals(Hectares.fromStored(100))).toBe(true);
    expect(Hectares.fromStored(100).equals(Hectares.fromStored(101))).toBe(false);
  });
});

describe("Price", () => {
  it("acepta precios no negativos", () => {
    const result = Price.create(1_250_000);
    expect(result.ok).toBe(true);
  });

  it("rechaza negativos y no numéricos", () => {
    expect(Price.create(-1).ok).toBe(false);
    expect(Price.create(Number.NaN).ok).toBe(false);
  });

  it("formatea como USD 1.250.000", () => {
    expect(Price.fromStored(1_250_000).format()).toBe("USD 1.250.000");
  });

  it("calcula precio por hectárea", () => {
    expect(Price.fromStored(1_000_000).perHectare(400)).toBe(2500);
    expect(Price.fromStored(1_000_000).perHectare(0)).toBeNull();
  });
});

describe("slug", () => {
  it("normaliza tildes y espacios", () => {
    expect(slugify("Estancia La Esperanza")).toBe("estancia-la-esperanza");
    expect(slugify("Área Rural N° 3")).toBe("area-rural-n-3");
  });

  it("genera slug desde texto", () => {
    const result = createSlug("Estancia La Esperanza");
    expect(result).toEqual({ ok: true, value: "estancia-la-esperanza" });
  });

  it("rechaza texto sin contenido slugificable", () => {
    expect(createSlug("!!!")).toEqual({ ok: false, reason: "empty" });
  });

  it("slugea departamentos", () => {
    expect(departmentSlug("Treinta y Tres")).toBe("treinta-y-tres");
    expect(departmentSlug("Río Negro")).toBe("rio-negro");
  });
});

describe("Coordinates", () => {
  it("acepta coordenadas dentro de rango", () => {
    const result = Coordinates.create(-34.9, -56.2);
    expect(result.ok).toBe(true);
  });

  it("rechaza fuera de rango", () => {
    expect(Coordinates.create(-91, 0).ok).toBe(false);
    expect(Coordinates.create(0, 181).ok).toBe(false);
  });
});
