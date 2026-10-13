import { describe, expect, it } from "vitest";
import { createInMemoryRateLimiter } from "@/infrastructure/rate-limit";

describe("createInMemoryRateLimiter", () => {
  it("permite hasta el límite dentro de la ventana", () => {
    const now = 0;
    const limiter = createInMemoryRateLimiter({
      limit: 3,
      windowMs: 60_000,
      now: () => now,
    });

    expect(limiter.check("1.1.1.1").allowed).toBe(true);
    expect(limiter.check("1.1.1.1").allowed).toBe(true);
    expect(limiter.check("1.1.1.1").allowed).toBe(true);

    const blocked = limiter.check("1.1.1.1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("aisla las claves (una IP no bloquea a otra)", () => {
    const limiter = createInMemoryRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("libera el cupo cuando pasa la ventana", () => {
    let now = 0;
    const limiter = createInMemoryRateLimiter({ limit: 1, windowMs: 1_000, now: () => now });

    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").allowed).toBe(false);

    now = 1_001;
    expect(limiter.check("ip").allowed).toBe(true);
  });

  it("calcula el retryAfter hasta el fin del registro más viejo", () => {
    let now = 0;
    const limiter = createInMemoryRateLimiter({ limit: 2, windowMs: 10_000, now: () => now });

    limiter.check("ip"); // t = 0
    now = 4_000;
    limiter.check("ip"); // t = 4000
    now = 5_000;

    const blocked = limiter.check("ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(5); // el primer registro expira en t=10000
  });
});
