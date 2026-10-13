import { describe, expect, it } from "vitest";

import { isTrustedOrigin, noStoreHeaders } from "@/infrastructure/admin/request-guard";

const SITE_URL = new URL("https://camposdeluruguay.uy/api/admin/login");

describe("isTrustedOrigin", () => {
  it("permite peticiones sin encabezado de origen (curl, server-side)", () => {
    expect(isTrustedOrigin(null, SITE_URL)).toBe(true);
  });

  it("permite el propio origen del sitio", () => {
    expect(isTrustedOrigin("https://camposdeluruguay.uy", SITE_URL)).toBe(true);
  });

  it("rechaza orígenes extraños (anti-CSRF)", () => {
    expect(isTrustedOrigin("https://malicioso.com", SITE_URL)).toBe(false);
    expect(isTrustedOrigin("https://camposdeluruguay.uy.evil.io", SITE_URL)).toBe(false);
  });
});

describe("noStoreHeaders", () => {
  it("prohíbe guardar la respuesta en caché", () => {
    const headers = noStoreHeaders();
    expect(headers["Cache-Control"]).toContain("no-store");
    expect(headers.Pragma).toBe("no-cache");
    expect(headers.Expires).toBe("0");
  });
});
