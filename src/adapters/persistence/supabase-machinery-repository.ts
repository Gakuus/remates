import type {
  MachineryRepository,
  MachinerySearchCriteria,
  MachinerySearchResult,
} from "@/application/ports/machinery-repository";
import type { MachineryItem } from "@/domain/entities/machinery-item";
import { getSupabasePublicClient } from "@/infrastructure/supabase/client";
import { safePostgrestTerm } from "@/infrastructure/supabase/filters";
import { mapMachineryItem, type MachineryRow } from "@/adapters/persistence/mappers";

const MACHINERY_SELECT = `
  id, slug, title, brand, model, year, hours_used, price, currency,
  department, locality, description, is_featured, main_image_path,
  main_image_url, published_at, created_at, updated_at,
  status:property_statuses!machinery_status_id_fkey ( code ),
  category:machinery_categories!machinery_category_id_fkey ( code ),
  machinery_images ( id, storage_path, url, alt_text, sort_order, is_main )
`;

type RawRow = Omit<MachineryRow, "status_code" | "category_code"> & {
  status: { code: string } | null;
  category: { code: string } | null;
};

function toRow(raw: RawRow): MachineryRow {
  return {
    ...raw,
    status_code: raw.status?.code ?? "borrador",
    category_code: raw.category?.code ?? "otro",
  };
}

interface StatusIdLookup {
  (code: string): Promise<number | null>;
}

interface CategoryIdLookup {
  (code: string): Promise<number | null>;
}

/**
 * Adaptador de persistencia de maquinaria (PLAN §2, Sprint 8).
 * Único punto que conoce el esquema de `machinery`.
 */
export class SupabaseMachineryRepository implements MachineryRepository {
  constructor(
    private readonly getStatusId: StatusIdLookup,
    private readonly getCategoryId: CategoryIdLookup,
  ) {}

  async create(item: MachineryItem): Promise<MachineryItem> {
    const supabase = getSupabasePublicClient();
    const statusId = await this.requireStatusId(item.status);
    const categoryId = await this.requireCategoryId(item.category);
    const { data, error } = await supabase
      .from("machinery")
      .insert(this.toWriteRow(item, statusId, categoryId))
      .select(MACHINERY_SELECT)
      .single();
    if (error) throw new Error(`No se pudo crear el aviso: ${error.message}`);
    return mapMachineryItem(toRow(data as unknown as RawRow));
  }

  async update(item: MachineryItem): Promise<MachineryItem> {
    const supabase = getSupabasePublicClient();
    const statusId = await this.requireStatusId(item.status);
    const categoryId = await this.requireCategoryId(item.category);
    const { data, error } = await supabase
      .from("machinery")
      .update(this.toWriteRow(item, statusId, categoryId))
      .eq("id", item.id)
      .select(MACHINERY_SELECT)
      .single();
    if (error) throw new Error(`No se pudo actualizar el aviso: ${error.message}`);
    return mapMachineryItem(toRow(data as unknown as RawRow));
  }

  async findById(id: string): Promise<MachineryItem | null> {
    const supabase = getSupabasePublicClient();
    const { data, error } = await supabase
      .from("machinery")
      .select(MACHINERY_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`No se pudo obtener el aviso: ${error.message}`);
    return data ? mapMachineryItem(toRow(data as unknown as RawRow)) : null;
  }

  async findBySlug(slug: string): Promise<MachineryItem | null> {
    const supabase = getSupabasePublicClient();
    const { data, error } = await supabase
      .from("machinery")
      .select(MACHINERY_SELECT)
      .eq("slug", slug)
      .eq("status_id", await this.requireStatusId("publicado"))
      .maybeSingle();
    if (error) throw new Error(`No se pudo obtener el aviso: ${error.message}`);
    return data ? mapMachineryItem(toRow(data as unknown as RawRow)) : null;
  }

  async search(criteria: MachinerySearchCriteria): Promise<MachinerySearchResult> {
    const supabase = getSupabasePublicClient();
    const page = Math.max(1, criteria.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, criteria.pageSize ?? 24));
    const from = (page - 1) * pageSize;

    let query = supabase.from("machinery").select(MACHINERY_SELECT, { count: "exact" });

    if (criteria.statuses?.length) {
      const ids = (
        await Promise.all(criteria.statuses.map((code) => this.getStatusId(code)))
      ).filter((id): id is number => id !== null);
      if (ids.length > 0) query = query.in("status_id", ids);
    }
    if (criteria.category) {
      const categoryId = await this.getCategoryId(criteria.category);
      if (categoryId !== null) query = query.eq("category_id", categoryId);
    }
    if (criteria.department) query = query.ilike("department", criteria.department);
    if (criteria.brand) query = query.ilike("brand", `%${criteria.brand}%`);
    if (criteria.priceMin !== undefined && criteria.priceMin !== null) {
      query = query.gte("price", criteria.priceMin);
    }
    if (criteria.priceMax !== undefined && criteria.priceMax !== null) {
      query = query.lte("price", criteria.priceMax);
    }
    if (criteria.query) {
      const term = `%${safePostgrestTerm(criteria.query)}%`;
      query = query.or(`title.ilike.${term},brand.ilike.${term},model.ilike.${term}`);
    }

    switch (criteria.sort) {
      case "precio_asc":
        query = query.order("price", { ascending: true, nullsFirst: false });
        break;
      case "precio_desc":
        query = query.order("price", { ascending: false, nullsFirst: false });
        break;
      default:
        query = query.order("published_at", { ascending: false, nullsFirst: false });
    }

    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(`No se pudo buscar maquinaria: ${error.message}`);

    return {
      items: ((data ?? []) as unknown as RawRow[]).map((r) => mapMachineryItem(toRow(r))),
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async listFeatured(limit = 4): Promise<MachineryItem[]> {
    const result = await this.search({
      featured: true,
      statuses: ["publicado"],
      sort: "recientes",
      page: 1,
      pageSize: limit,
    });
    return result.items;
  }

  async listRecent(limit = 4): Promise<MachineryItem[]> {
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
    const { error } = await supabase.from("machinery").delete().eq("id", id);
    if (error) return false;
    return true;
  }

  private async requireStatusId(code: string): Promise<number> {
    const id = await this.getStatusId(code);
    if (id === null) throw new Error(`Catálogo no encontrado: "${code}". ¿Falta el seed?`);
    return id;
  }

  private async requireCategoryId(code: string): Promise<number> {
    const id = await this.getCategoryId(code);
    if (id === null) throw new Error(`Categoría no encontrada: "${code}". ¿Falta el seed?`);
    return id;
  }

  private toWriteRow(item: MachineryItem, statusId: number, categoryId: number) {
    return {
      slug: item.slug,
      title: item.title,
      category_id: categoryId,
      brand: item.brand,
      model: item.model,
      year: item.year,
      hours_used: item.hoursUsed,
      price: item.price?.value ?? null,
      currency: item.price?.currency ?? item.currency,
      department: item.department,
      locality: item.locality,
      description: item.description,
      status_id: statusId,
      is_featured: item.isFeatured,
      main_image_path: item.mainImage?.storagePath ?? null,
      main_image_url: item.mainImage?.url ?? null,
      published_at: item.publishedAt ? item.publishedAt.toISOString() : null,
    };
  }
}
