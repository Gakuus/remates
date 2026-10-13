import { describe, expect, it } from "vitest";

import {
  buildImageStoragePath,
  contentImageFromUpload,
  describeImageValidationError,
  isTrustedStoragePath,
} from "@/infrastructure/admin/image-upload";
import { validateImageFile } from "@/domain/rules/image-rules";

describe("describeImageValidationError", () => {
  it("mapea cada tipo de error a un mensaje claro en español", () => {
    const empty = validateImageFile({
      bytes: new Uint8Array(0),
      declaredType: "image/png",
      sizeBytes: 0,
    });
    expect(describeImageValidationError(empty)).toBe("El archivo elegido está vacío.");
  });

  it("distingue tamaño, tipo y firma con mensajes distintos", () => {
    const declaration = { bytes: new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3, 4, 5, 6, 7, 8, 9]) };
    const tooLarge = validateImageFile({
      ...declaration,
      declaredType: "image/jpeg",
      sizeBytes: 9 * 1024 * 1024,
    });
    expect(describeImageValidationError(tooLarge)).toContain("8 MB");

    const unsupported = validateImageFile({
      ...declaration,
      declaredType: "image/gif",
      sizeBytes: 100,
    });
    expect(describeImageValidationError(unsupported)).toMatch(/JPG|PNG/);

    const renamed = validateImageFile({
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6, 7, 8]),
      declaredType: "image/jpeg",
      sizeBytes: 100,
    });
    expect(describeImageValidationError(renamed)).toContain("no coincide");
  });
});

describe("buildImageStoragePath", () => {
  it("arma `kind/id/imagen.ext` solo con extensiones permitidas", () => {
    expect(buildImageStoragePath("campos", "abc", "img-1", "image/jpeg")).toBe(
      "campos/abc/img-1.jpg",
    );
    expect(buildImageStoragePath("remates", "abc", "img-2", "image/webp")).toBe(
      "remates/abc/img-2.webp",
    );
  });
});

describe("isTrustedStoragePath", () => {
  it("acepta paths con el kind e id exactos y UUID + extensión permitida", () => {
    expect(
      isTrustedStoragePath(
        "campos",
        "11111111-1111-4111-8111-111111111111",
        "campos/11111111-1111-4111-8111-111111111111/9f8e7d6c-0000-4000-8000-000000000000.jpg",
      ),
    ).toBe(true);
    expect(
      isTrustedStoragePath(
        "maquinaria",
        "22222222-2222-4222-8222-222222222222",
        "maquinaria/22222222-2222-4222-8222-222222222222/bbbbbbbb-0000-4000-8000-000000000000.webp",
      ),
    ).toBe(true);
  });

  it("rechaza otros ids, kinds, extensiones y traversal", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(isTrustedStoragePath("campos", id, `campos/${id}/x.gif`)).toBe(false);
    expect(isTrustedStoragePath("campos", id, `campos/otro-id/x.jpg`)).toBe(false);
    expect(isTrustedStoragePath("remates", id, `campos/${id}/x.jpg`)).toBe(false);
    expect(isTrustedStoragePath("campos", id, `campos/${id}/../x.jpg`)).toBe(false);
    expect(isTrustedStoragePath("campos", id, `campos/${id}/a.b.jpg`)).toBe(false);
    expect(isTrustedStoragePath("campos", "ids-con-puntos", `campos/ids-con-puntos/x.jpg`)).toBe(
      false,
    );
  });
});

describe("contentImageFromUpload", () => {
  it("construye una ContentImage con main/sortOrder y URL pública", () => {
    const image = contentImageFromUpload({
      id: "img-1",
      uploaded: { path: "campos/abc/img-1.jpg", publicUrl: "/uploads/campos/abc/img-1.jpg" },
      altText: "Campo ejemplo",
      sortOrder: 2,
      isMain: true,
    });
    expect(image.storagePath).toBe("campos/abc/img-1.jpg");
    expect(image.url).toBe("/uploads/campos/abc/img-1.jpg");
    expect(image.altText).toBe("Campo ejemplo");
    expect(image.sortOrder).toBe(2);
    expect(image.isMain).toBe(true);
  });
});
