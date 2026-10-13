/**
 * Proveedor de mapas (PLAN §2, §5).
 * En el MVP se usa `NoopMapProvider`; el real (Mapbox/Google) se agrega
 * sin tocar dominio ni casos de uso.
 */
export interface MapRenderOptions {
  latitude: number;
  longitude: number;
  zoom?: number;
  width?: number;
  height?: number;
  label?: string;
}

export interface MapProvider {
  /** URL de imagen estática, o null si no hay proveedor configurado. */
  getStaticMapUrl(options: MapRenderOptions): string | null;
  /** HTML/data-URL para embed interactivo (post-MVP). */
  getEmbedUrl?(options: MapRenderOptions): string | null;
}
