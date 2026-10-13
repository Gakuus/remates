/**
 * Rate limiting en memoria para endpoints públicos (PLAN §15
 * "Límites de formularios de contacto": máx. 3 envíos / 10 min / IP).
 *
 * Ventana deslizante por timestamp. Instancia única por proceso; en un
 * despliegue serverless conviene migrarlo a Redis/Upstash sin tocar los
 * llamadores (mismo contrato).
 */
export interface RateLimitResult {
  allowed: boolean;
  /** Segundos hasta poder volver a intentar (cuando `allowed` es false). */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  /** Reloj inyectable para tests. */
  now?: () => number;
}

export function createInMemoryRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>();
  let lastCleanup = now();

  return {
    check(key) {
      const timestamp = now();
      const windowStart = timestamp - windowMs;

      // Limpieza periódica para no acumular claves viejas.
      if (timestamp - lastCleanup > windowMs) {
        for (const [k, times] of hits) {
          const alive = times.filter((t) => t > timestamp - windowMs);
          if (alive.length === 0) hits.delete(k);
          else hits.set(k, alive);
        }
        lastCleanup = timestamp;
      }

      const times = (hits.get(key) ?? []).filter((t) => t > windowStart);

      if (times.length >= limit) {
        const oldest = times[0] ?? timestamp;
        const retryAfterMs = Math.max(0, oldest + windowMs - timestamp);
        hits.set(key, times);
        return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
      }

      times.push(timestamp);
      hits.set(key, times);
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
