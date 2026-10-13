import type {
  MachineryRepository,
  MachinerySearchCriteria,
  MachinerySearchResult,
} from "@/application/ports/machinery-repository";
import type { MachineryItem } from "@/domain/entities/machinery-item";
import { mapMachineryItem, type MachineryRow } from "@/adapters/persistence/mappers";
import { getPool } from "@/infrastructure/postgres/client";
import { groupByParent, withTransaction } from "@/adapters/persistence/postgres-utils";

const MAIN_COLUMNS = `
  m.id, m.slug, m.title, m.brand, m.model, m.year, m.hours_used, m.price,
  m.currency, m.department, m.locality, m.description, m.is_featured,
  m.main_image_path, m.main_image_url, m.published_at, m.created_at, m.updated_at,
  st.code as status_code, cat.code as category_code
`;

const FROM = `
  from machinery m
  join property_statuses st on st.id = m.status_id
  join machinery_categories cat on cat.id = m.category_id
`;

type ImageRow = {
  id: string;
  storage_path: string;
  url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_main: boolean;
};

interface BuiltWhere {
  clause: string;
  params: unknown[];
}

/** Adaptador de maquinaria en Postgres (PLAN §2, §11). */
export class PostgresMachineryRepository implements MachineryRepository {
  private buildWhere(criteria: MachinerySearchCriteria): BuiltWhere {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (criteria.statuses?.length) {
      params.push(criteria.statuses);
      clauses.push(
        `m.status_id in (select id from property_statuses where code = any($${params.length}::text[]))`,
      );
    }
    if (criteria.category) {
      params.push(criteria.category);
      clauses.push(
        `m.category_id = (select id from machinery_categories where code = $${params.length})`,
      );
    }
    if (criteria.department) {
      params.push(criteria.department);
      clauses.push(`m.department = $${params.length}`);
    }
    if (criteria.brand) {
      params.push(`%${criteria.brand}%`);
      clauses.push(`m.brand ilike $${params.length}`);
    }
    if (criteria.priceMin !== undefined && criteria.priceMin !== null) {
      params.push(criteria.priceMin);
      clauses.push(`m.price >= $${params.length}`);
    }
    if (criteria.priceMax !== undefined && criteria.priceMax !== null) {
      params.push(criteria.priceMax);
      clauses.push(`m.price <= $${params.length}`);
    }
    if (criteria.query) {
      const term = `%${criteria.query.replace(/[%_]/g, " ")}%`;
      params.push(term, term, term);
      clauses.push(
        `(
           m.title ilike $${params.length - 2}
           or m.brand ilike $${params.length - 1}
           or m.model ilike $${params.length}
         )`,
      );
    }
    if (criteria.featured) {
      clauses.push("m.is_featured = true");
    }

    return {
      clause: clauses.length > 0 ? `where ${clauses.join(" and ")}` : "",
      params,
    };
  }

  private async loadChildren(
    rows: Array<Record<string, unknown>>,
  ): Promise<Map<string, ImageRow[]>> {
    const ids = rows.map((r) => String(r.id));
    if (ids.length === 0) return new Map();

    const result = await getPool().query<ImageRow & { parent_id: string }>(
      `select machinery_id as parent_id, id, storage_path, url, alt_text, sort_order, is_main
       from machinery_images where machinery_id = any($1::uuid[]) order by sort_order`,
      [ids],
    );
    return groupByParent(result.rows);
  }

  private hydrate(
    rows: Array<Record<string, unknown>>,
    images: Map<string, ImageRow[]>,
  ): MachineryItem[] {
    return rows.map((r) =>
      mapMachineryItem({
        ...r,
        machinery_images: images.get(r.id as string),
      } as unknown as MachineryRow),
    );
  }

  async create(item: MachineryItem): Promise<MachineryItem> {
    await withTransaction(getPool(), async (client) => {
      await client.query(
        `insert into machinery
           (id, slug, title, category_id, brand, model, year, hours_used, price,
            currency, department, locality, description, status_id, is_featured,
            main_image_path, main_image_url, published_at)
         values (
           $1, $2, $3,
           (select id from machinery_categories where code = $4),
           $5, $6, $7, $8, $9, $10, $11, $12, $13,
           (select id from property_statuses where code = $14),
           $15, $16, $17, $18
         )`,
        [
          item.id,
          item.slug,
          item.title,
          item.category,
          item.brand ?? null,
          item.model ?? null,
          item.year ?? null,
          item.hoursUsed ?? null,
          item.price?.value ?? null,
          item.price?.currency ?? item.currency,
          item.department,
          item.locality ?? null,
          item.description ?? null,
          item.status,
          item.isFeatured,
          item.mainImage?.storagePath ?? null,
          item.mainImage?.url ?? null,
          item.publishedAt ?? null,
        ],
      );
      await this.replaceChildren(client, item);
    });
    return item;
  }

  async update(item: MachineryItem): Promise<MachineryItem> {
    await withTransaction(getPool(), async (client) => {
      await client.query(
        `update machinery set
           slug = $2, title = $3,
           category_id = (select id from machinery_categories where code = $4),
           brand = $5, model = $6, year = $7, hours_used = $8, price = $9,
           currency = $10, department = $11, locality = $12, description = $13,
           status_id = (select id from property_statuses where code = $14),
           is_featured = $15, main_image_path = $16, main_image_url = $17, published_at = $18
         where id = $1`,
        [
          item.id,
          item.slug,
          item.title,
          item.category,
          item.brand ?? null,
          item.model ?? null,
          item.year ?? null,
          item.hoursUsed ?? null,
          item.price?.value ?? null,
          item.price?.currency ?? item.currency,
          item.department,
          item.locality ?? null,
          item.description ?? null,
          item.status,
          item.isFeatured,
          item.mainImage?.storagePath ?? null,
          item.mainImage?.url ?? null,
          item.publishedAt ?? null,
        ],
      );
      await this.replaceChildren(client, item);
    });
    return item;
  }

  private async replaceChildren(
    client: import("pg").PoolClient,
    item: MachineryItem,
  ): Promise<void> {
    await client.query("delete from machinery_images where machinery_id = $1", [item.id]);
    for (const image of item.images) {
      await client.query(
        `insert into machinery_images
           (id, machinery_id, storage_path, url, alt_text, sort_order, is_main)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          image.id,
          item.id,
          image.storagePath,
          image.url,
          image.altText,
          image.sortOrder,
          image.isMain,
        ],
      );
    }
  }

  async findById(id: string): Promise<MachineryItem | null> {
    const { rows } = await getPool().query<Record<string, unknown>>(
      `select ${MAIN_COLUMNS} ${FROM} where m.id = $1`,
      [id],
    );
    if (rows.length === 0) return null;
    const images = await this.loadChildren(rows);
    return this.hydrate(rows, images)[0] ?? null;
  }

  async findBySlug(slug: string): Promise<MachineryItem | null> {
    const { rows } = await getPool().query<Record<string, unknown>>(
      `select ${MAIN_COLUMNS} ${FROM}
       where m.slug = $1 and m.status_id = (select id from property_statuses where code = 'publicado')
       limit 1`,
      [slug],
    );
    if (rows.length === 0) return null;
    const images = await this.loadChildren(rows);
    return this.hydrate(rows, images)[0] ?? null;
  }

  async search(criteria: MachinerySearchCriteria): Promise<MachinerySearchResult> {
    const pool = getPool();
    const page = Math.max(1, criteria.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, criteria.pageSize ?? 24));
    const { clause, params } = this.buildWhere(criteria);

    const { rows: countRows } = await pool.query<{ total: number }>(
      `select count(*)::int as total ${FROM} ${clause}`,
      params,
    );
    const total = countRows[0]?.total ?? 0;

    const orderSql =
      criteria.sort === "precio_asc"
        ? "m.price asc nulls last"
        : criteria.sort === "precio_desc"
          ? "m.price desc nulls last"
          : "m.published_at desc nulls last";
    const { rows } = await pool.query<Record<string, unknown>>(
      `select ${MAIN_COLUMNS} ${FROM} ${clause} order by ${orderSql} limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    );

    const images = await this.loadChildren(rows);
    return {
      items: this.hydrate(rows, images),
      total,
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
    const { rowCount } = await getPool().query("delete from machinery where id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }
}
