/**
 * Precio. Value object inmutable.
 * Moneda soportada: USD (mercado uruguayo de campos, PLAN §11).
 */
export const SUPPORTED_CURRENCIES = ["USD"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export type PriceError = { ok: false; reason: "negative" | "invalid" };
export type PriceResult = { ok: true; value: Price } | PriceError;

export class Price {
  private constructor(
    private readonly amount: number,
    private readonly currencyCode: Currency,
  ) {}

  static create(amount: number, currency: Currency = "USD"): PriceResult {
    if (!Number.isFinite(amount)) return { ok: false, reason: "invalid" };
    if (amount < 0) return { ok: false, reason: "negative" };
    return { ok: true, value: new Price(amount, currency) };
  }

  static fromStored(amount: number, currency: string = "USD"): Price {
    const code = (SUPPORTED_CURRENCIES as readonly string[]).includes(currency)
      ? (currency as Currency)
      : "USD";
    return new Price(amount, code);
  }

  get value(): number {
    return this.amount;
  }

  get currency(): Currency {
    return this.currencyCode;
  }

  /** Formato de display: "USD 1.250.000". */
  format(): string {
    const formatted = new Intl.NumberFormat("es-UY", { maximumFractionDigits: 0 }).format(
      this.amount,
    );
    return `${this.currency} ${formatted}`;
  }

  /** Precio por hectárea, redondeado a entero. */
  perHectare(hectares: number): number | null {
    if (hectares <= 0) return null;
    return Math.round(this.amount / hectares);
  }

  equals(other: Price): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
