import { describe, expect, it } from "vitest";
import { clientIpFromRequest } from "@/infrastructure/net/client-ip";

function makeHeaders(init: Record<string, string> = {}): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(init)) headers.set(key, value);
  return headers;
}

describe("clientIpFromRequest", () => {
  it("usa x-real-ip cuando está presente", () => {
    const request = {
      headers: makeHeaders({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.2.3.4" }),
    };
    expect(clientIpFromRequest(request)).toBe("203.0.113.7");
  });

  it("cae al primer hop de x-forwarded-for", () => {
    const request = { headers: makeHeaders({ "x-forwarded-for": "198.51.100.10, 10.0.0.1" }) };
    expect(clientIpFromRequest(request)).toBe("198.51.100.10");
  });

  it("devuelve null sin encabezados (nunca una clave global 'unknown')", () => {
    // Con null el llamador degrada (cookie anónima o sin límite por bucket
    // compartido): un atacante no puede llenar un bucket común y bloquear a
    // todos los clientes (H1.1).
    const request = { headers: makeHeaders() };
    expect(clientIpFromRequest(request)).toBeNull();
  });
});
