import { describe, expect, it } from "vitest";
import { IMAGE_RULES, detectImageType, validateImageFile } from "@/domain/rules/image-rules";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const AVIF = new Uint8Array([0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]);

describe("detectImageType", () => {
  it("reconoce las firmas soportadas", () => {
    expect(detectImageType(JPEG)).toBe("image/jpeg");
    expect(detectImageType(PNG)).toBe("image/png");
    expect(detectImageType(WEBP)).toBe("image/webp");
    expect(detectImageType(AVIF)).toBe("image/avif");
  });

  it("devuelve null para formatos no soportados o cabeceras incompletas", () => {
    expect(detectImageType(GIF)).toBeNull();
    expect(detectImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("validateImageFile", () => {
  it("acepta una imagen cuya firma coincide con el MIME declarado", () => {
    expect(
      validateImageFile({ bytes: PNG, declaredType: "image/png", sizeBytes: PNG.length }),
    ).toEqual({ ok: true, contentType: "image/png" });
  });

  it("normaliza el MIME con parámetros (charset, mayúsculas)", () => {
    expect(
      validateImageFile({
        bytes: JPEG,
        declaredType: "IMAGE/JPEG; charset=binary",
        sizeBytes: JPEG.length,
      }),
    ).toEqual({ ok: true, contentType: "image/jpeg" });
  });

  it("rechaza archivos que superan el tamaño máximo", () => {
    const result = validateImageFile({
      bytes: PNG,
      declaredType: "image/png",
      sizeBytes: IMAGE_RULES.maxBytes + 1,
    });
    expect(result).toEqual({ ok: false, error: "too_large" });
  });

  it("rechaza tipos no permitidos", () => {
    expect(
      validateImageFile({ bytes: GIF, declaredType: "image/gif", sizeBytes: GIF.length }),
    ).toEqual({ ok: false, error: "unsupported_type" });
  });

  it("rechaza cuando la firma no coincide con el MIME declarado", () => {
    expect(
      validateImageFile({ bytes: PNG, declaredType: "image/jpeg", sizeBytes: PNG.length }),
    ).toEqual({ ok: false, error: "signature_mismatch" });
  });

  it("rechaza archivos vacíos", () => {
    expect(
      validateImageFile({ bytes: new Uint8Array(0), declaredType: "image/png", sizeBytes: 0 }),
    ).toEqual({ ok: false, error: "empty" });
  });
});
