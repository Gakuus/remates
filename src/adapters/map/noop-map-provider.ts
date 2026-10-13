import type { MapProvider } from "@/application/ports/map-provider";

/**
 * Adaptador de mapa sin operación para el MVP (PLAN §2, §5).
 * El mapa no es obligatorio en la primera versión; la ficha muestra el
 * bloque de accesos en texto. El proveedor real se agrega acá sin tocar
 * dominio ni casos de uso.
 */
export class NoopMapProvider implements MapProvider {
  getStaticMapUrl(): string | null {
    return null;
  }
}
