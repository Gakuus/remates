import type { SearchCriteria, PropertySort } from "@/application/ports/property-repository";
import { PROPERTY_STATUS_CODES } from "@/domain/enums/property-status";
import { isFeatureCode } from "@/domain/enums/feature-code";

/**
 * Adaptador HTTP: traduce los search params de la URL a `SearchCriteria`
 * (PLAN §5 "Los filtros viven en la URL").
 *
 * Formato:
 *   ?q=paysandu&depto=paysandu&localidad=...&tipo=ganadero
 *   &precio_min=100000&precio_max=900000&ha_min=100&ha_max=500
 *   &f_casa=true&f_agua=true&orden=precio_asc&page=2
 */

const SORTS: readonly PropertySort[] = [
  "relevancia",
  "recientes",
  "precio_asc",
  "precio_desc",
  "hectareas_asc",
  "hectareas_desc",
];

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

export interface ParsedCatalogParams {
  criteria: SearchCriteria;
  /** Valores crudos para repoblar el formulario de filtros. */
  raw: {
    q: string;
    depto: string;
    localidad: string;
    tipo: string;
    precioMin: string;
    precioMax: string;
    haMin: string;
    haMax: string;
    orden: PropertySort;
    page: number;
    features: Record<string, string>;
  };
  /** Errores suaves: parámetros ignorados por ser inválidos. */
  issues: string[];
}

export function parseCatalogParams(
  params: Record<string, string | string[] | undefined>,
): ParsedCatalogParams {
  const issues: string[] = [];

  const q = first(params.q) ?? "";
  const depto = first(params.depto) ?? "";
  const localidad = first(params.localidad) ?? "";
  const tipo = first(params.tipo) ?? "";

  const precioMin = first(params.precio_min) ?? "";
  const precioMax = first(params.precio_max) ?? "";
  const haMin = first(params.ha_min) ?? "";
  const haMax = first(params.ha_max) ?? "";

  const ordenRaw = first(params.orden) ?? "relevancia";
  const orden = (SORTS as readonly string[]).includes(ordenRaw)
    ? (ordenRaw as PropertySort)
    : "relevancia";
  if (ordenRaw !== orden) issues.push("orden");

  const pageRaw = toNumber(first(params.page)) ?? 1;
  const page = Math.max(1, Math.floor(pageRaw));
  if (page !== pageRaw) issues.push("page");

  // Características: f_<code>=true|<valor>
  const features: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!key.startsWith("f_")) continue;
    const code = key.slice(2);
    if (!isFeatureCode(code)) {
      issues.push(key);
      continue;
    }
    const v = first(value);
    if (v !== undefined && v !== "") features[code] = v;
  }

  const criteria: SearchCriteria = {
    sort: orden,
    page,
    pageSize: 24,
    statuses: [...PROPERTY_STATUS_CODES.filter((c) => c === "publicado")],
  };

  if (q.trim()) criteria.query = q.trim();
  if (depto) criteria.department = depto;
  if (localidad) criteria.locality = localidad;
  if (tipo) criteria.type = tipo;

  const priceMin = toNumber(precioMin);
  const priceMax = toNumber(precioMax);
  if (priceMin !== undefined || priceMax !== undefined) {
    criteria.price = {
      ...(priceMin !== undefined ? { min: priceMin } : {}),
      ...(priceMax !== undefined ? { max: priceMax } : {}),
    };
  }

  const haMinN = toNumber(haMin);
  const haMaxN = toNumber(haMax);
  if (haMinN !== undefined || haMaxN !== undefined) {
    criteria.hectares = {
      ...(haMinN !== undefined ? { min: haMinN } : {}),
      ...(haMaxN !== undefined ? { max: haMaxN } : {}),
    };
  }

  if (Object.keys(features).length > 0) criteria.features = features;

  return {
    criteria,
    raw: {
      q,
      depto,
      localidad,
      tipo,
      precioMin,
      precioMax,
      haMin,
      haMax,
      orden,
      page,
      features,
    },
    issues,
  };
}
