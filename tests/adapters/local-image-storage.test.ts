import { existsSync, rmSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { LocalImageStorage } from "@/adapters/storage/local-image-storage";

let baseDir = "";

beforeAll(async () => {
  baseDir = await mkdtemp(path.join(tmpdir(), "remates-uploads-"));
});

afterAll(() => {
  rmSync(baseDir, { recursive: true, force: true });
});

describe("LocalImageStorage", () => {
  it("sube bytes a public/uploads y devuelve la URL pública", async () => {
    const storage = new LocalImageStorage(baseDir);
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x01, 0x02, 0x03]);
    const uploaded = await storage.upload("campos/abc/foto-1.jpg", bytes);

    expect(uploaded.publicUrl).toBe("/uploads/campos/abc/foto-1.jpg");
    expect(existsSync(path.join(baseDir, "campos/abc/foto-1.jpg"))).toBe(true);
    const onDisk = new Uint8Array(await readFile(path.join(baseDir, "campos/abc/foto-1.jpg")));
    expect([...onDisk]).toEqual([...bytes]);
  });

  it("sube un File leyendo su contenido", async () => {
    const storage = new LocalImageStorage(baseDir);
    const file = new File(["contenido-png"], "a.png", { type: "image/png" });
    const uploaded = await storage.upload("remates/def/foto-2.png", file);

    const content = await readFile(path.join(baseDir, "remates/def/foto-2.png"), "utf8");
    expect(content).toBe("contenido-png");
    expect(uploaded.publicUrl).toBe("/uploads/remates/def/foto-2.png");
  });

  it("rechaza paths que escapan de la raíz", async () => {
    const storage = new LocalImageStorage(baseDir);
    await expect(storage.upload("../secreto.txt", new Uint8Array([1]))).rejects.toThrow(
      "Path de imagen inválido.",
    );
    expect(() => storage.getPublicUrl("../../etc/passwd")).toThrow("Path de imagen inválido.");
  });

  it("elimina archivos subidos y tolera paths inexistentes", async () => {
    const storage = new LocalImageStorage(baseDir);
    const uploaded = await storage.upload("campos/ghi/foto-3.jpg", new Uint8Array([9, 9]));

    await storage.remove([uploaded.path]);
    expect(existsSync(path.join(baseDir, uploaded.path))).toBe(false);

    await expect(storage.remove(["campos/nada/foto-x.jpg"])).resolves.toBeUndefined();
  });
});
