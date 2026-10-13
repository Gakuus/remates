import { describe, expect, it, vi } from "vitest";
import { createInquiryController } from "@/adapters/http/inquiry-controller";
import { createInMemoryRateLimiter } from "@/infrastructure/rate-limit";
import type { SubmitInquiry } from "@/application/use-cases/submit-inquiry";

const VALID_BODY = {
  subject: { type: "property" as const, id: null },
  name: "María Silva",
  email: "maria@example.uy",
  phone: "099123456",
  message: "Hola, me interesa el campo. ¿Sigue disponible?",
  website: "",
};

function makeController(
  submit: SubmitInquiry = vi.fn(async () => ({
    ok: true as const,
    value: {} as never,
  })),
  overrides: { limit?: number } = {},
) {
  const limiter = createInMemoryRateLimiter({
    limit: overrides.limit ?? 3,
    windowMs: 10 * 60 * 1000,
  });
  let counter = 0;
  return {
    submit,
    handle: createInquiryController({
      submit,
      limiter,
      newId: () => `id-${++counter}`,
    }),
  };
}

describe("createInquiryController", () => {
  it("rechaza bodies que no son objetos", async () => {
    const { handle } = makeController();
    expect((await handle({ body: "hola", ip: "1.1.1.1" })).status).toBe(400);
    expect((await handle({ body: null, ip: "1.1.1.1" })).status).toBe(400);
    expect((await handle({ body: [], ip: "1.1.1.1" })).status).toBe(400);
  });

  it("el honeypot corta el envío sin tocar el dominio", async () => {
    const submit = vi.fn();
    const { handle } = makeController(submit as unknown as SubmitInquiry);

    const result = await handle({ body: { ...VALID_BODY, website: "spam" }, ip: "1.1.1.1" });

    expect(result.status).toBe(201);
    expect(submit).not.toHaveBeenCalled();
  });

  it("aplica rate limiting por IP y devuelve Retry-After", async () => {
    const { handle } = makeController(undefined, { limit: 2 });

    await handle({ body: VALID_BODY, ip: "2.2.2.2" });
    await handle({ body: VALID_BODY, ip: "2.2.2.2" });
    const blocked = await handle({ body: VALID_BODY, ip: "2.2.2.2" });

    expect(blocked.status).toBe(429);
    expect(blocked.body.ok).toBe(false);
    if (!blocked.body.ok) expect(blocked.body.retryAfterSeconds).toBeGreaterThan(0);

    // Otra IP sigue pudiendo enviar.
    expect((await handle({ body: VALID_BODY, ip: "3.3.3.3" })).status).toBe(201);
  });

  it("devuelve errores por campo cuando la validación falla", async () => {
    const { handle } = makeController();

    const result = await handle({
      body: { name: " ", email: "no-es-email", message: "corto" },
      ip: "4.4.4.4",
    });

    expect(result.status).toBe(422);
    if (result.body.ok === false) {
      expect(result.body.fieldErrors).toEqual({
        name: "Ingresá tu nombre",
        email: "Ingresá un email válido",
        message: "Contanos un poco más (mínimo 10 caracteres)",
      });
    }
  });

  it("normaliza los valores y genera el id en el servidor", async () => {
    const submit = vi.fn<SubmitInquiry>(async () => ({ ok: true as const, value: {} as never }));
    const { handle } = makeController(submit);

    const result = await handle({
      body: { ...VALID_BODY, name: "  María Silva  ", phone: "" },
      ip: "5.5.5.5",
    });

    expect(result.status).toBe(201);
    expect(submit).toHaveBeenCalledWith({
      id: "id-1",
      subject: { type: "property", id: null },
      name: "María Silva",
      email: "maria@example.uy",
      phone: undefined,
      message: VALID_BODY.message,
    });
  });

  it("traduce los errores del dominio a errores de campo", async () => {
    const { handle } = makeController(async () => ({
      ok: false as const,
      error: "invalid_email" as const,
    }));

    const result = await handle({ body: VALID_BODY, ip: "6.6.6.6" });

    expect(result.status).toBe(422);
    if (result.body.ok === false) {
      expect(result.body.fieldErrors).toEqual({ email: "Revisá este campo" });
    }
  });

  it("nunca filtra errores de infraestructura al cliente", async () => {
    const { handle } = makeController(async () => {
      throw new Error("base de datos caída: conexión rechazada");
    });

    const result = await handle({ body: VALID_BODY, ip: "7.7.7.7" });

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ ok: false, error: "server_error" });
  });

  it("rechaza una consulta cuyo aviso ya no existe con un mensaje claro", async () => {
    const submit = vi.fn<SubmitInquiry>();
    const limiter = createInMemoryRateLimiter({ limit: 3, windowMs: 600000 });
    const handle = createInquiryController({
      submit,
      limiter,
      newId: () => "id-x",
      subjectExists: async () => false,
    });

    const result = await handle({
      body: {
        ...VALID_BODY,
        subject: { type: "property", id: "0e2bb97a-8dc4-4f24-9d89-d0e369ff6ed4" } as const,
      },
      ip: "8.8.8.8",
    });

    expect(result.status).toBe(422);
    expect(result.body).toEqual({ ok: false, error: "invalid_subject" });
    expect(submit).not.toHaveBeenCalled();
  });

  it("permite avanzar cuando el aviso consultado existe", async () => {
    const limiter = createInMemoryRateLimiter({ limit: 3, windowMs: 600000 });
    const handle = createInquiryController({
      submit: async () => ({ ok: true as const, value: {} as never }),
      limiter,
      newId: () => "id-ok",
      subjectExists: async () => true,
    });

    const result = await handle({
      body: {
        ...VALID_BODY,
        subject: { type: "auction", id: "0e2bb97a-8dc4-4f24-9d89-d0e369ff6ed4" } as const,
      },
      ip: "9.9.9.9",
    });

    expect(result.status).toBe(201);
  });
});
