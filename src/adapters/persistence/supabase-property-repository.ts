import type {
  PropertyRepository,
  SearchCriteria,
  SearchResult,
} from "@/application/ports/property-repository";
import type { Property } from "@/domain/entities/property";
import { getSupabasePublicClient } from "@/infrastructure/supabase/client";
import { safePostgrestTerm } from "@/infrastructure/supabase/filters";
import {
  mapProperty,
  type PropertyRow,
  type PropertyImageRow,
  type FeatureRow,
} from "@/adapters/persistence/mappers";

const PROPERTY_SELECT = `
  id, slug, name, price, currency, hectares, department, locality,
  latitude, longitude, access_notes, description, is_featured,
  main_image_path, main_image_url, published_at, created_at, updated_at,
  status:property_statuses!properties_status_id_fkey ( code ),
  type:property_types!properties_type_id_fkey ( code ),
  property_images ( id, storage_path, url, alt_text, sort_order, is_main ),
  property_features ( feature_code, value )
`;

type RawRow = Omit<PropertyRow, "status_code" | "type_code"> & {
  status: { code: string } | null;
  type: { code: string } | null;
  property_images?: PropertyImageRow[];
  property_features?: FeatureRow[];
};

function toRow(raw: RawRow): PropertyRow {
  return {
    ...raw,
    status_code: raw.status?.code ?? "borrador",
    type_code: raw.type?.code ?? "mixto",
    images: raw.property_images,
    features: raw.property_features,
  };
}

/** Mapeo de orden de catálogo a columnas reales. */
const SORT_MAP = {
  relevancia: { column: "published_at", ascending: false },
  recientes: { column: "published_at", ascending: false },
  precio_asc: { column: "price", ascending: true },
  precio_desc: { column: "price", ascending: false },
  hectareas_asc: { column: "hectares", ascending: true },
  hectareas_desc: { column: "hectares", ascending: false },
} as const;

interface StatusIdLookup {
  (code: string): Promise<number | null>;
}

/**
 * Adaptador de persistencia de campos (PLAN §2).
 * Único punto que conoce el esquema de Supabase/PostgREST.
 */
export class SupabasePropertyRepository implements PropertyRepository {
  constructor(private readonly getStatusId: StatusIdLookup) {}

  private async requireId(code: string): Promise<number> {
    const id = await this.getStatusId(code);
    if (id === null) throw new Error(`Catálogo no encontrado: "${code}". ¿Falta el seed?`);
    return id;
  }

  async create(property: Property): Promise<Property> {
    const supabase = getSupabasePublicClient();
    const statusId = await this.requireId(property.status);
    const typeId = await this.requireId(property.type);

    const { data, error } = await supabase
      .from("properties")
      .insert(this.toWriteRow(property, statusId, typeId))
      .select(PROPERTY_SELECT)
      .single();

    if (error) throw new Error(`No se pudo crear el campo: ${error.message}`);
    return mapProperty(toRow(data as unknown as RawRow));
  }

  async update(property: Property): Promise<Property> {
    const supabase = getSupabasePublicClient();
    const statusId = await this.requireId(property.status);
    const typeId = await this.requireId(property.type);

    const { data, error } = await supabase
      .from("properties")
      .update(this.toWriteRow(property, statusId, typeId))
      .eq("id", property.id)
      .select(PROPERTY_SELECT)
      .single();

    if (error) throw new Error(`No se pudo actualizar el campo: ${error.message}`);
    return mapProperty(toRow(data as unknown as RawRow));
  }

  async findById(id: string): Promise<Property | null> {
    const supabase = getSupabasePublicClient();
    const { data, error } = await supabase
      .from("properties")
      .select(PROPERTY_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`No se pudo obtener el campo: ${error.message}`);
    return data ? mapProperty(toRow(data as unknown as RawRow)) : null;
  }

  async findBySlug(
    slug: string,
    options: { includeUnpublished?: boolean } = {},
  ): Promise<Property | null> {
    const supabase = getSupabasePublicClient();
    let query = supabase.from("properties").select(PROPERTY_SELECT).eq("slug", slug);

    if (!options.includeUnpublished) {
      const publicadoId = await this.getStatusId("publicado");
      if (publicadoId !== null) query = query.eq("status_id", publicadoId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(`No se pudo obtener el campo: ${error.message}`);
    return data ? mapProperty(toRow(data as unknown as RawRow)) : null;
  }

  async search(criteria: SearchCriteria): Promise<SearchResult> {
    const supabase = getSupabasePublicClient();
    const page = Math.max(1, criteria.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, criteria.pageSize ?? 24));
    const from = (page - 1) * pageSize;

    let query = supabase.from("properties").select(PROPERTY_SELECT, { count: "exact" });

    // Estados visibles
    if (criteria.statuses?.length) {
      const ids = (
        await Promise.all(criteria.statuses.map((code) => this.getStatusId(code)))
      ).filter((id): id is number => id !== null);
      if (ids.length > 0) query = query.in("status_id", ids);
    }

    if (criteria.featured !== undefined) query = query.eq("is_featured", criteria.featured);
    if (criteria.department) query = query.ilike("department", criteria.department);
    if (criteria.locality) query = query.ilike("locality", `%${criteria.locality}%`);
    if (criteria.type) {
      const typeId = await this.getStatusId(criteria.type);
      if (typeId !== null) query = query.eq("type_id", typeId);
    }
    if (criteria.price?.min !== undefined) query = query.gte("price", criteria.price.min);
    if (criteria.price?.max !== undefined) query = query.lte("price", criteria.price.max);
    if (criteria.hectares?.min !== undefined) query = query.gte("hectares", criteria.hectares.min);
    if (criteria.hectares?.max !== undefined) query = query.lte("hectares", criteria.hectares.max);

    if (criteria.query) {
      const term = `%${safePostgrestTerm(criteria.query)}%`;
      query = query.or(`name.ilike.${term},description.ilike.${term}`);
    }

    // Características EAV: un filtro por característica vía exists.
    for (const [code, value] of Object.entries(criteria.features ?? {})) {
      const filterValue = value === "true" ? "true" : value;
      query = query.filter("property_features.feature_code", "eq", code);
      query = query.filter("property_features.value", "eq", filterValue);
    }

    const sort = SORT_MAP[criteria.sort ?? "relevancia"];
    query = query.order(sort.column, { ascending: sort.ascending, nullsFirst: false });

    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(`No se pudo buscar campos: ${error.message}`);

    return {
      items: ((data ?? []) as unknown as RawRow[]).map((r) => mapProperty(toRow(r))),
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async listFeatured(limit = 6): Promise<Property[]> {
    const result = await this.search({
      featured: true,
      statuses: ["publicado"],
      sort: "recientes",
      page: 1,
      pageSize: limit,
    });
    return result.items;
  }

  async listRecent(limit = 6): Promise<Property[]> {
    const result = await this.search({
      statuses: ["publicado"],
      sort: "recientes",
      page: 1,
      pageSize: limit,
    });
    return result.items;
  }

  async deleteById(id: string): Promise<boolean> {
    const supabase = getSupabasePublicClient();
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) return false;
    return true;
  }

  async countByDepartment(): Promise<Array<{ department: string; count: number }>> {
    const supabase = getSupabasePublicClient();
    const publicadoId = await this.getStatusId("publicado");

    let query = supabase.from("properties").select("department", { count: "exact", head: false });

    if (publicadoId !== null) query = query.eq("status_id", publicadoId);

    const { data, error } = await query;
    if (error) throw new Error(`No se pudo contar por departamento: ${error.message}`);

    const counts = new Map<string, number>();
    for (const row of (data ?? []) as Array<{ department: string }>) {
      counts.set(row.department, (counts.get(row.department) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);
  }

  private toWriteRow(property: Property, statusId: number, typeId: number) {
    return {
      slug: property.slug,
      name: property.name,
      status_id: statusId,
      type_id: typeId,
      price: property.price?.value ?? null,
      currency: property.price?.currency ?? "USD",
      hectares: property.hectares.value,
      department: property.location.department,
      locality: property.location.locality ?? null,
      latitude: property.location.latitude ?? null,
      longitude: property.location.longitude ?? null,
      access_notes: property.location.accessNotes ?? null,
      description: property.description,
      is_featured: property.isFeatured,
      main_image_path: property.mainImage?.storagePath ?? null,
      main_image_url: property.mainImage?.url ?? null,
      published_at: property.publishedAt ? property.publishedAt.toISOString() : null,
    };
  }
}
