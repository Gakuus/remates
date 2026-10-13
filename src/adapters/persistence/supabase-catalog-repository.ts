import type { PropertyCatalogRepository } from "@/application/ports/property-catalog-repository";
import { getSupabasePublicClient } from "@/infrastructure/supabase/client";

/** Adaptador de catálogos de referencia (PLAN §2). */
export class SupabaseCatalogRepository implements PropertyCatalogRepository {
  async listTypes(): Promise<Array<{ code: string; name: string }>> {
    const supabase = getSupabasePublicClient();
    const { data, error } = await supabase.from("property_types").select("code, name").order("id");
    if (error) throw new Error(`No se pudieron leer los tipos: ${error.message}`);
    return (data ?? []) as Array<{ code: string; name: string }>;
  }

  async listStatuses(): Promise<Array<{ code: string; name: string }>> {
    const supabase = getSupabasePublicClient();
    const { data, error } = await supabase
      .from("property_statuses")
      .select("code, name")
      .order("id");
    if (error) throw new Error(`No se pudieron leer los estados: ${error.message}`);
    return (data ?? []) as Array<{ code: string; name: string }>;
  }

  async listMachineryCategories(): Promise<Array<{ code: string; name: string }>> {
    const supabase = getSupabasePublicClient();
    const { data, error } = await supabase
      .from("machinery_categories")
      .select("code, name")
      .order("id");
    if (error) throw new Error(`No se pudieron leer las categorías: ${error.message}`);
    return (data ?? []) as Array<{ code: string; name: string }>;
  }
}

/**
 * Cache simple en memoria de los ids de catálogo (tipo/estado), que solo
 * cambian por migración. Evita una ida y vuelta por cada búsqueda.
 */
export function createCatalogIdLookup(): (code: string) => Promise<number | null> {
  return createTableCodeIdLookup("property_types", "property_statuses");
}

/** Ids de `machinery_categories` (Sprint 8). */
export function createMachineryCategoryIdLookup(): (code: string) => Promise<number | null> {
  return createTableCodeIdLookup("machinery_categories");
}

function createTableCodeIdLookup(
  ...tables: Array<"property_types" | "property_statuses" | "machinery_categories">
) {
  const cache = new Map<string, number | null>();

  return async (code: string) => {
    if (cache.has(code)) return cache.get(code) ?? null;

    const supabase = getSupabasePublicClient();
    const results = await Promise.all(
      tables.map((table) => supabase.from(table).select("id, code")),
    );

    const error = results.find((r) => r.error);
    if (error) {
      throw new Error(`No se pudieron leer los catálogos: ${error.error?.message}`);
    }

    const all: Array<{ id: number; code: string }> = [];
    for (const result of results)
      all.push(...((result.data ?? []) as Array<{ id: number; code: string }>));

    for (const row of all) cache.set(row.code, row.id);

    return cache.get(code) ?? null;
  };
}
