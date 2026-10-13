/**
 * Superficie en hectáreas. Value object inmutable con validación.
 * Error tipado en lugar de excepción: el caller decide (sin overengineering).
 */
export type HectaresError = { ok: false; reason: "no_positive" };
export type HectaresResult = { ok: true; value: Hectares } | HectaresError;

export class Hectares {
  private constructor(private readonly amount: number) {}

  static create(amount: number): HectaresResult {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, reason: "no_positive" };
    }
    return { ok: true, value: new Hectares(amount) };
  }

  /** Reconstrucción desde persistencia (asume dato ya validado). */
  static fromStored(amount: number): Hectares {
    return new Hectares(amount);
  }

  get value(): number {
    return this.amount;
  }

  /** Formateo corto para tarjetas: 450 / 1.250,5 (es-UY). */
  format(): string {
    return new Intl.NumberFormat("es-UY", { maximumFractionDigits: 2 }).format(this.amount);
  }

  isAtLeast(min: number): boolean {
    return this.amount >= min;
  }

  equals(other: Hectares): boolean {
    return this.amount === other.amount;
  }
}
