/**
 * Coordenadas geográficas opcionales (PLAN §11, mapa post-MVP).
 */
export type CoordinatesError = { ok: false; reason: "out_of_range" };
export type CoordinatesResult = { ok: true; value: Coordinates } | CoordinatesError;

export class Coordinates {
  private constructor(
    private readonly lat: number,
    private readonly lng: number,
  ) {}

  static create(lat: number, lng: number): CoordinatesResult {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { ok: false, reason: "out_of_range" };
    }
    return { ok: true, value: new Coordinates(lat, lng) };
  }

  static fromStored(lat: number, lng: number): Coordinates {
    return new Coordinates(lat, lng);
  }

  get latitude(): number {
    return this.lat;
  }

  get longitude(): number {
    return this.lng;
  }
}
