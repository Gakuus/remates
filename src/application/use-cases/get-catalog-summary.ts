import type { PropertyRepository } from "@/application/ports/property-repository";

export type GetCatalogSummary = () => Promise<{
  total: number;
  byDepartment: Array<{ department: string; count: number }>;
}>;

/**
 * Datos de cabecera del catálogo: total de resultados y facets por
 * departamento (PLAN §4 sección "Zonas", §7 contador).
 */
export function createGetCatalogSummary(repo: PropertyRepository): GetCatalogSummary {
  return async () => {
    const [all, byDepartment] = await Promise.all([
      repo.search({ statuses: ["publicado"], page: 1, pageSize: 1 }),
      repo.countByDepartment(),
    ]);
    return { total: all.total, byDepartment };
  };
}
