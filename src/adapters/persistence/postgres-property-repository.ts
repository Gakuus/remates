import type {
  PropertyRepository,
  SearchCriteria,
  SearchResult,
} from "@/application/ports/property-repository";
import type { Property } from "@/domain/entities/property";
import {
  mapProperty,
  type FeatureRow,
  type PropertyImageRow,
  type PropertyRow,
} from "@/adapters/persistence/mappers";
import { getPool } from "@/infrastructure/postgres/client";
import { groupByParent, withTransaction } from "@/adapters/persistence/postgres-utils";

const MAIN_COLUMNS = `
  p.id, p.slug, p.name, p.price, p.currency, p.hectares, p.department,
  p.locality, p.latitude, p.longitude, p.access_notes, p.description,
  p.is_featured, p.main_image_path, p.main_image_url, p.published_at,
  p.created_at, p.updated_at,
  st.code as status_code, ty.code as type_code
`;

const FROM = `
  from properties p
  join property_statuses st on st.id = p.status_id
  join property_types ty on ty.id = p.type_id
`;

const ORDER_SQL: Record<string, string> = {
  relevancia: "p.published_at desc nulls last",
  recientes: "p.published_at desc nulls last",
  precio_asc: "p.price asc nulls last",
  precio_desc: "p.price desc nulls last",
  hectareas_asc: "p.hectares asc nulls last",
  hectareas_desc: "p.hectares desc nulls last",
};

interface BuiltWhere {
  clause: string;
  params: unknown[];
}

/**
 * Adaptador de persistencia de campos en Postgres (PLAN §2, §11).
 * Guarda además características (EAV) e imágenes, y filtra en SQL.
 */
export class PostgresPropertyRepository implements PropertyRepository {
  private buildWhere(criteria: SearchCriteria): BuiltWhere {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (criteria.statuses?.length) {
      params.push(criteria.statuses);
      clauses.push(
        `p.status_id in (select id from property_statuses where code = any($${params.length}::text[]))`,
      );
    }
    if (criteria.featured !== undefined) {
      params.push(criteria.featured);
      clauses.push(`p.is_featured = $${params.length}`);
    }
    if (criteria.department) {
      params.push(criteria.department);
      clauses.push(`p.department = $${params.length}`);
    }
    if (criteria.locality) {
      params.push(`%${criteria.locality}%`);
      clauses.push(`p.locality ilike $${params.length}`);
    }
    if (criteria.type) {
      params.push(criteria.type);
      clauses.push(`p.type_id = (select id from property_types where code = $${params.length})`);
    }
    if (criteria.price?.min !== undefined) {
      params.push(criteria.price.min);
      clauses.push(`p.price >= $${params.length}`);
    }
    if (criteria.price?.max !== undefined) {
      params.push(criteria.price.max);
      clauses.push(`p.price <= $${params.length}`);
    }
    if (criteria.hectares?.min !== undefined) {
      params.push(criteria.hectares.min);
      clauses.push(`p.hectares >= $${params.length}`);
    }
    if (criteria.hectares?.max !== undefined) {
      params.push(criteria.hectares.max);
      clauses.push(`p.hectares <= $${params.length}`);
    }
    if (criteria.query) {
      const term = `%${criteria.query.replace(/[%_]/g, " ")}%`;
      params.push(term);
      clauses.push(`(p.name ilike $${params.length} or p.description ilike $${params.length})`);
    }
    for (const [code, value] of Object.entries(criteria.features ?? {})) {
      const filterValue = value === "true" ? "true" : value;
      params.push(code, filterValue);
      clauses.push(
        `exists (
           select 1 from property_features pf
           where pf.property_id = p.id
             and pf.feature_code = $${params.length - 1}
             and pf.value = $${params.length}
         )`,
      );
    }

    return {
      clause: clauses.length > 0 ? `where ${clauses.join(" and ")}` : "",
      params,
    };
  }

  private async loadChildren(rows: Array<Record<string, unknown>>): Promise<{
    images: Map<string, PropertyImageRow[]>;
    features: Map<string, FeatureRow[]>;
  }> {
    const ids = rows.map((r) => String(r.id));
    if (ids.length === 0) return { images: new Map(), features: new Map() };

    const [imageResult, featureResult] = await Promise.all([
      getPool().query<PropertyImageRow & { parent_id: string }>(
        `select property_id as parent_id, id, storage_path, url, alt_text, sort_order, is_main
         from property_images where property_id = any($1::uuid[]) order by sort_order`,
        [ids],
      ),
      getPool().query<FeatureRow & { parent_id: string }>(
        `select property_id as parent_id, feature_code, value
         from property_features where property_id = any($1::uuid[])`,
        [ids],
      ),
    ]);

    return {
      images: groupByParent(imageResult.rows),
      features: groupByParent(featureResult.rows),
    };
  }

  private hydrate(
    rows: Array<Record<string, unknown>>,
    images: Map<string, PropertyImageRow[]>,
    features: Map<string, FeatureRow[]>,
  ): Property[] {
    return rows.map((r) =>
      mapProperty({
        ...r,
        images: images.get(r.id as string),
        features: features.get(r.id as string),
      } as unknown as PropertyRow),
    );
  }

  async create(property: Property): Promise<Property> {
    await withTransaction(getPool(), async (client) => {
      await client.query(
        `insert into properties
           (id, slug, name, status_id, type_id, price, hectares, department, locality,
            latitude, longitude, access_notes, description, is_featured,
            main_image_path, main_image_url, published_at)
         values (
           $1, $2, $3,
           (select id from property_statuses where code = $4),
           (select id from property_types where code = $5),
           $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
         )`,
        [
          property.id,
          property.slug,
          property.name,
          property.status,
          property.type,
          property.price?.value ?? null,
          property.hectares.value,
          property.location.department,
          property.location.locality ?? null,
          property.location.latitude ?? null,
          property.location.longitude ?? null,
          property.location.accessNotes ?? null,
          property.description,
          property.isFeatured,
          property.mainImage?.storagePath ?? null,
          property.mainImage?.url ?? null,
          property.publishedAt ?? null,
        ],
      );
      await this.replaceChildren(client, property);
    });
    return property;
  }

  async update(property: Property): Promise<Property> {
    await withTransaction(getPool(), async (client) => {
      await client.query(
        `update properties set
           slug = $2, name = $3,
           status_id = (select id from property_statuses where code = $4),
           type_id = (select id from property_types where code = $5),
           price = $6, hectares = $7, department = $8, locality = $9,
           latitude = $10, longitude = $11, access_notes = $12, description = $13,
           is_featured = $14, main_image_path = $15, main_image_url = $16, published_at = $17
         where id = $1`,
        [
          property.id,
          property.slug,
          property.name,
          property.status,
          property.type,
          property.price?.value ?? null,
          property.hectares.value,
          property.location.department,
          property.location.locality ?? null,
          property.location.latitude ?? null,
          property.location.longitude ?? null,
          property.location.accessNotes ?? null,
          property.description,
          property.isFeatured,
          property.mainImage?.storagePath ?? null,
          property.mainImage?.url ?? null,
          property.publishedAt ?? null,
        ],
      );
      await this.replaceChildren(client, property);
    });
    return property;
  }

  /**
   * Reemplaza características e imágenes (transacción del padre).
   * Los ids de imagen son los del dominio, estables entre actualizaciones.
   */
  private async replaceChildren(
    client: import("pg").PoolClient,
    property: Property,
  ): Promise<void> {
    await client.query("delete from property_features where property_id = $1", [property.id]);
    for (const feature of property.features) {
      await client.query(
        "insert into property_features (property_id, feature_code, value) values ($1, $2, $3)",
        [property.id, feature.code, feature.value],
      );
    }

    await client.query("delete from property_images where property_id = $1", [property.id]);
    for (const image of property.images) {
      await client.query(
        `insert into property_images
           (id, property_id, storage_path, url, alt_text, sort_order, is_main)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          image.id,
          property.id,
          image.storagePath,
          image.url,
          image.altText,
          image.sortOrder,
          image.isMain,
        ],
      );
    }
  }

  async findById(id: string): Promise<Property | null> {
    const pool = getPool();
    const { rows } = await pool.query<Record<string, unknown>>(
      `select ${MAIN_COLUMNS} ${FROM} where p.id = $1`,
      [id],
    );
    if (rows.length === 0) return null;
    const children = await this.loadChildren(rows);
    return this.hydrate(rows, children.images, children.features)[0] ?? null;
  }

  async findBySlug(
    slug: string,
    options: { includeUnpublished?: boolean } = {},
  ): Promise<Property | null> {
    const { clause, params } = options.includeUnpublished
      ? { clause: "where p.slug = $1", params: [slug] }
      : {
          clause:
            "where p.slug = $1 and p.status_id = (select id from property_statuses where code = 'publicado')",
          params: [slug],
        };
    const { rows } = await getPool().query<Record<string, unknown>>(
      `select ${MAIN_COLUMNS} ${FROM} ${clause} limit 1`,
      params,
    );
    if (rows.length === 0) return null;
    const children = await this.loadChildren(rows);
    return this.hydrate(rows, children.images, children.features)[0] ?? null;
  }

  async search(criteria: SearchCriteria): Promise<SearchResult> {
    const pool = getPool();
    const page = Math.max(1, criteria.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, criteria.pageSize ?? 24));
    const { clause, params } = this.buildWhere(criteria);

    const { rows: countRows } = await pool.query<{ total: number }>(
      `select count(*)::int as total ${FROM} ${clause}`,
      params,
    );
    const total = countRows[0]?.total ?? 0;

    const orderSql = ORDER_SQL[criteria.sort ?? "relevancia"] ?? ORDER_SQL.relevancia;
    const { rows } = await pool.query<Record<string, unknown>>(
      `select ${MAIN_COLUMNS} ${FROM} ${clause} order by ${orderSql} limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    );

    const children = await this.loadChildren(rows);
    return {
      items: this.hydrate(rows, children.images, children.features),
      total,
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

  async countByDepartment(): Promise<Array<{ department: string; count: number }>> {
    const { rows } = await getPool().query<{ department: string; count: number }>(
      `select department, count(*)::int as count
       from properties
       where status_id = (select id from property_statuses where code = 'publicado')
       group by department
       order by count desc`,
    );
    return rows;
  }

  async deleteById(id: string): Promise<boolean> {
    const { rowCount } = await getPool().query("delete from properties where id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }
}
