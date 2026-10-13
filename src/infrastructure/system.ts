import type { Clock, IdGenerator } from "@/application/ports/system";

/** Reloj del sistema. */
export const systemClock: Clock = {
  now: () => new Date(),
};

/** Generador de ids UUID v4 (crypto). */
export const cryptoIdGenerator: IdGenerator = {
  newId: () => crypto.randomUUID(),
};
