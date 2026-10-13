import { describe, expect, it } from "vitest";
import { formatUyPhone, isUyPhoneValid, UY_PHONE_MAX_DIGITS } from "@/application/dtos/uy-phone";

describe("formatUyPhone", () => {
  it("agrupa un celular de 9 dígitos con espacios", () => {
    expect(formatUyPhone("099193151")).toBe("099 193 151");
    expect(formatUyPhone("099 193 151")).toBe("099 193 151");
  });

  it("acepta un fijo de 8 dígitos en el mismo formato", () => {
    expect(formatUyPhone("99193151")).toBe("991 931 51");
  });

  it("quita letras y símbolos, no solo espacios", () => {
    expect(formatUyPhone("0991a-9315!1x")).toBe("099 193 151");
  });

  it("tope de 9 dígitos (celular uruguayo)", () => {
    expect(formatUyPhone("099123456789")).toBe("099 123 456");
    expect(formatUyPhone("099123456789")).toHaveLength(11);
    expect(formatUyPhone("099123456789")).toMatch(/^\d{3} \d{3} \d{3}$/);
  });

  it("acepta el teléfono vacío (campo opcional)", () => {
    expect(formatUyPhone("")).toBe("");
  });

  it("limita a UY_PHONE_MAX_DIGITS dígitos", () => {
    expect(formatUyPhone("0".repeat(UY_PHONE_MAX_DIGITS + 10))).toHaveLength(11);
  });
});

describe("isUyPhoneValid", () => {
  it("acepta celular y fijo uruguayos", () => {
    expect(isUyPhoneValid("099 193 151")).toBe(true);
    expect(isUyPhoneValid("991 931 51")).toBe(true);
  });

  it("rechaza números muy cortos (menos de 8 dígitos)", () => {
    expect(isUyPhoneValid("099 12")).toBe(false);
  });

  it("el campo vacío es válido (es opcional)", () => {
    expect(isUyPhoneValid("")).toBe(true);
  });
});
