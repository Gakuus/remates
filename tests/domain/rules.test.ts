import { describe, expect, it } from "vitest";
import { canPublish } from "@/domain/rules/publish-rules";
import { Price } from "@/domain/value-objects/price";
import { createInquiry, INQUIRY_LIMITS } from "@/domain/entities/inquiry";

const validInput = {
  name: "Estancia La Esperanza",
  slug: "estancia-la-esperanza",
  type: "ganadero" as const,
  department: "Paysandú",
  hectares: 450,
  price: Price.fromStored(1_250_000),
  hasMainImage: true,
};

describe("reglas de publicación", () => {
  it("permite publicar con todos los datos obligatorios", () => {
    expect(canPublish(validInput)).toEqual([]);
  });

  it("bloquea sin precio", () => {
    expect(canPublish({ ...validInput, price: null })).toEqual(["missing_price"]);
  });

  it("bloquea sin imagen principal", () => {
    expect(canPublish({ ...validInput, hasMainImage: false })).toEqual(["missing_main_image"]);
  });

  it("bloquea superficie inválida", () => {
    expect(canPublish({ ...validInput, hectares: 0 })).toEqual(["invalid_hectares"]);
  });

  it("acumula todos los bloqueos", () => {
    const blockers = canPublish({
      ...validInput,
      name: "  ",
      department: "",
      price: null,
      hectares: -5,
      hasMainImage: false,
    });
    expect(blockers).toEqual(
      expect.arrayContaining([
        "missing_name",
        "missing_department",
        "invalid_hectares",
        "missing_price",
        "missing_main_image",
      ]),
    );
  });
});

describe("createInquiry", () => {
  const base = {
    id: "11111111-1111-4111-8111-111111111111",
    subject: { type: "property" as const, id: null },
    name: "Juan Pérez",
    email: "juan@example.com.uy",
    message: "Me interesa el campo de Paysandú, ¿sigue disponible?",
  };

  it("crea una consulta válida con valores por defecto", () => {
    const result = createInquiry(base);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("nuevo");
      expect(result.value.source).toBe("web");
      expect(result.value.email).toBe("juan@example.com.uy");
    }
  });

  it("rechaza email inválido", () => {
    expect(createInquiry({ ...base, email: "no-es-email" })).toEqual({
      ok: false,
      error: "invalid_email",
    });
  });

  it("rechaza mensaje demasiado corto", () => {
    expect(createInquiry({ ...base, message: "hola" })).toEqual({
      ok: false,
      error: "invalid_message",
    });
  });

  it("rechaza mensaje demasiado largo", () => {
    const long = "x".repeat(INQUIRY_LIMITS.messageMax + 1);
    expect(createInquiry({ ...base, message: long }).ok).toBe(false);
  });

  it("rechaza nombre vacío", () => {
    expect(createInquiry({ ...base, name: "   " })).toEqual({
      ok: false,
      error: "invalid_name",
    });
  });
});
