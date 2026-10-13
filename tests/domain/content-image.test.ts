import { describe, expect, it } from "vitest";

import { removeContentImage, type ContentImage } from "@/domain/entities/content-image";

function image(id: string, isMain = false): ContentImage {
  return {
    id,
    storagePath: `x/${id}.jpg`,
    url: `/uploads/${id}.jpg`,
    altText: "",
    sortOrder: 1,
    isMain,
  };
}

describe("removeContentImage", () => {
  it("quita la imagen indicada y mantiene la principal si no era la eliminada", () => {
    const result = removeContentImage([image("a", true), image("b")], "b");
    expect(result.map((i) => i.id)).toEqual(["a"]);
    expect(result[0]?.isMain).toBe(true);
  });

  it("promueve la primera restante cuando se elimina la principal", () => {
    const result = removeContentImage([image("a", true), image("b"), image("c")], "a");
    expect(result.map((i) => i.id)).toEqual(["b", "c"]);
    expect(result.filter((i) => i.isMain)).toHaveLength(1);
    expect(result[0]?.isMain).toBe(true);
  });

  it("devuelve vacío al quitar la única foto", () => {
    expect(removeContentImage([image("a", true)], "a")).toEqual([]);
  });

  it("si la principal queda, no la toca aunque no sea la primera", () => {
    const result = removeContentImage([image("a"), image("b", true), image("c")], "c");
    expect(result.find((i) => i.id === "b")?.isMain).toBe(true);
    expect(result.filter((i) => i.isMain)).toHaveLength(1);
  });
});
