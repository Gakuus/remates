import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminPasswordMatches,
  adminSessionCookieName,
  createAdminSessionToken,
  isAdminConfigured,
  revokeAdminSessionToken,
  verifyAdminSessionToken,
} from "@/infrastructure/admin/session";

const ORIGINAL_PASSWORD = process.env.ADMIN_PASSWORD;

beforeAll(() => {
  process.env.ADMIN_PASSWORD = "clave-de-testeo-muy-segura";
});

afterAll(() => {
  if (ORIGINAL_PASSWORD === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = ORIGINAL_PASSWORD;
});

describe("adminPasswordMatches", () => {
  it("acepta la contraseña correcta", async () => {
    expect(await adminPasswordMatches("clave-de-testeo-muy-segura")).toBe(true);
  });

  it("rechaza contraseñas incorrectas", async () => {
    expect(await adminPasswordMatches("otra-cosa")).toBe(false);
    expect(await adminPasswordMatches("")).toBe(false);
    // Longitud distinta tampoco debe pasar (sin fuga de longitud por timing).
    expect(await adminPasswordMatches("clave-de-testeo-muy-segura!mas-larga")).toBe(false);
  });
});

describe("isAdminConfigured", () => {
  it("detecta una contraseña configurada", () => {
    expect(isAdminConfigured()).toBe(true);
  });
});

describe("createAdminSessionToken / verifyAdminSessionToken", () => {
  it("genera un token que se verifica", async () => {
    const now = 1_700_000_000_000;
    const token = await createAdminSessionToken(now);
    expect(token.startsWith("v1.")).toBe(true);
    expect(await verifyAdminSessionToken(token, now)).toBe(true);
  });

  it("rechaza tokens alterados", async () => {
    const now = 1_700_000_000_000;
    const token = await createAdminSessionToken(now);
    const [version, payload] = token.split(".");
    const tampered = `${version}.${payload}.${"0".repeat(64)}`;
    expect(await verifyAdminSessionToken(tampered, now)).toBe(false);
  });

  it("rechaza tokens con payload alterado", async () => {
    const now = 1_700_000_000_000;
    const token = await createAdminSessionToken(now);
    const [version, , signature] = token.split(".");
    const tampered = `${version}.${now + 99}.${signature}`;
    expect(await verifyAdminSessionToken(tampered, now)).toBe(false);
  });

  it("rechaza tokens expirados", async () => {
    const now = 1_700_000_000_000;
    const token = await createAdminSessionToken(now);
    expect(await verifyAdminSessionToken(token, now + 12 * 60 * 60 * 1000 + 1)).toBe(false);
  });

  it("rechaza formatos inválidos", async () => {
    expect(await verifyAdminSessionToken(undefined, 0)).toBe(false);
    expect(await verifyAdminSessionToken("", 0)).toBe(false);
    expect(await verifyAdminSessionToken("v1.abc", 0)).toBe(false);
    expect(await verifyAdminSessionToken("no-mato-el-formato", 0)).toBe(false);
    expect(await verifyAdminSessionToken(`v1.${1_700_000_000_000}`, 0)).toBe(false);
  });

  it("permite conocer el nombre de la cookie de sesión", () => {
    expect(adminSessionCookieName()).toBe("admin_session");
  });
});

describe("revokeAdminSessionToken", () => {
  it("invalida un token revocado aunque su firma sea correcta", async () => {
    const now = 1_700_000_000_000;
    const token = await createAdminSessionToken(now);
    expect(await verifyAdminSessionToken(token, now)).toBe(true);

    revokeAdminSessionToken(token);
    expect(await verifyAdminSessionToken(token, now)).toBe(false);
  });

  it("no revoca tokens ajenos", async () => {
    const now = 1_700_000_000_000;
    const token = await createAdminSessionToken(now);
    const other = await createAdminSessionToken(now + 1000);

    revokeAdminSessionToken(token);
    expect(await verifyAdminSessionToken(other, now + 1000)).toBe(true);
  });

  it("ignora tokens vacíos", () => {
    expect(() => revokeAdminSessionToken("")).not.toThrow();
    expect(() => revokeAdminSessionToken("   ")).not.toThrow();
  });
});
