/**
 * Presenter de filtros activos (PLAN §7): traduce el estado crudo de la
 * URL a chips con etiqueta legible. Capa de presentación — consumida por
 * la UI, nunca al revés.
 */
export interface ActiveFilterInput {
  q: string;
  depto: string;
  localidad: string;
  tipo: string;
  precioMin: string;
  precioMax: string;
  haMin: string;
  haMax: string;
  features: Record<string, string>;
}

export interface ActiveFilter {
  key: string;
  label: string;
  /** Parámetro de URL a limpiar al remover el chip. */
  param: string;
}

const TYPE_LABELS: Record<string, string> = {
  agricola: "Agrícola",
  ganadero: "Ganadero",
  mixto: "Mixto",
};

const FEATURE_LABELS: Record<string, string> = {
  aptitud: "Aptitud",
  agua: "Agua",
  arroyo_rio: "Arroyo / río",
  monte: "Monte",
  casa: "Casa",
  galpon: "Galpón",
  corrales: "Corrales",
  alambrados: "Alambrados",
  electricidad: "Electricidad",
  acceso_ruta: "Acceso por ruta",
  mejoras: "Mejoras",
};

export function buildActiveFilters(raw: ActiveFilterInput): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  if (raw.q) filters.push({ key: "q", label: `"${raw.q}"`, param: "q" });
  if (raw.depto) filters.push({ key: "depto", label: raw.depto, param: "depto" });
  if (raw.localidad) filters.push({ key: "localidad", label: raw.localidad, param: "localidad" });
  if (raw.tipo) {
    filters.push({ key: "tipo", label: TYPE_LABELS[raw.tipo] ?? raw.tipo, param: "tipo" });
  }
  if (raw.precioMin) {
    filters.push({ key: "precio_min", label: `Desde USD ${raw.precioMin}`, param: "precio_min" });
  }
  if (raw.precioMax) {
    filters.push({ key: "precio_max", label: `Hasta USD ${raw.precioMax}`, param: "precio_max" });
  }
  if (raw.haMin) filters.push({ key: "ha_min", label: `Desde ${raw.haMin} ha`, param: "ha_min" });
  if (raw.haMax) filters.push({ key: "ha_max", label: `Hasta ${raw.haMax} ha`, param: "ha_max" });

  for (const [code, value] of Object.entries(raw.features)) {
    const label = FEATURE_LABELS[code] ?? code;
    filters.push({
      key: `f_${code}`,
      label: value === "true" ? label : `${label}: ${value}`,
      param: `f_${code}`,
    });
  }

  return filters;
}
