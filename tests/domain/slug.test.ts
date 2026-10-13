import { describe, expect, it } from "vitest";
import { slugify } from "@/domain/value-objects/slug";

describe("slugify", () => {
  it("normaliza a minúsculas y guiones", () => {
    expect(slugify("Estancia La Esperanza")).toBe("estancia-la-esperanza");
  });

  it("elimina acentos y caracteres especiales", () => {
    expect(slugify("Cañada del Tomé—N° 12")).toBe("canada-del-tome-n-12");
  });

  it("colapsa espacios y guiones repetidos", () => {
    expect(slugify("  Campo   Grande----Sur ")).toBe("campo-grande-sur");
  });

  it("maneja cifras y números", () => {
    expect(slugify("Padrón 4.850")).toBe("padron-4-850");
  });
});
