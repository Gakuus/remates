import type {
  AuctionRepository,
  AuctionSearchCriteria,
  AuctionSearchResult,
} from "@/application/ports/auction-repository";
import type { Auction } from "@/domain/entities/auction";
import { mapAuction, type AuctionLotRow, type AuctionRow } from "@/adapters/persistence/mappers";
import { getPool } from "@/infrastructure/postgres/client";
import { groupByParent, withTransaction } from "@/adapters/persistence/postgres-utils";

const MAIN_COLUMNS = `
  a.id, a.slug, a.title, a.event_status, a.scheduled_at, a.location,
  a.auctioneer, a.minimum_bid, a.currency, a.description, a.is_featured,
  a.main_image_path, a.main_image_url, a.published_at, a.created_at, a.updated_at,
  st.code as status_code
`;

const FROM = `
  from auctions a
  join property_statuses st on st.id = a.status_id
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

/** Adaptador de remates en Postgres (PLAN §2, §11). */
export class PostgresAuctionRepository implements AuctionRepository {
  private buildWhere(criteria: AuctionSearchCriteria): BuiltWhere {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (criteria.statuses?.length) {
      params.push(criteria.statuses);
      clauses.push(
        `a.status_id in (select id from property_statuses where code = any($${params.length}::text[]))`,
      );
    }
    if (criteria.eventStatus) {
      params.push(criteria.eventStatus);
      clauses.push(`a.event_status = $${params.length}`);
    }
    if (criteria.department) {
      params.push(`%${criteria.department}%`);
      clauses.push(`a.location ilike $${params.length}`);
    }
    if (criteria.featured) {
      clauses.push("a.is_featured = true");
    }

    return {
      clause: clauses.length > 0 ? `where ${clauses.join(" and ")}` : "",
      params,
    };
  }

  private async loadChildren(
    rows: Array<Record<string, unknown>>,
  ): Promise<{ images: Map<string, ImageRow[]>; lots: Map<string, AuctionLotRow[]> }> {
    const ids = rows.map((r) => String(r.id));
    if (ids.length === 0) return { images: new Map(), lots: new Map() };

    const [imageResult, lotResult] = await Promise.all([
      getPool().query<ImageRow & { parent_id: string }>(
        `select auction_id as parent_id, id, storage_path, url, alt_text, sort_order, is_main
         from auction_images where auction_id = any($1::uuid[]) order by sort_order`,
        [ids],
      ),
      getPool().query<AuctionLotRow & { parent_id: string }>(
        `select auction_id as parent_id, id, auction_id, lot_number, title, description, minimum_bid, sort_order
         from auction_lots where auction_id = any($1::uuid[]) order by sort_order`,
        [ids],
      ),
    ]);

    return { images: groupByParent(imageResult.rows), lots: groupByParent(lotResult.rows) };
  }

  private hydrate(
    rows: Array<Record<string, unknown>>,
    images: Map<string, ImageRow[]>,
    lots: Map<string, AuctionLotRow[]>,
  ): Auction[] {
    return rows.map((r) =>
      mapAuction({
        ...r,
        auction_images: images.get(r.id as string),
        auction_lots: lots.get(r.id as string),
      } as unknown as AuctionRow),
    );
  }

  async create(auction: Auction): Promise<Auction> {
    await withTransaction(getPool(), async (client) => {
      await client.query(
        `insert into auctions
           (id, slug, title, status_id, event_status, scheduled_at, location, auctioneer,
            minimum_bid, currency, description, is_featured, main_image_path, main_image_url, published_at)
         values (
           $1, $2, $3,
           (select id from property_statuses where code = $4),
           $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
         )`,
        [
          auction.id,
          auction.slug,
          auction.title,
          auction.status,
          auction.eventStatus,
          auction.scheduledAt,
          auction.location ?? null,
          auction.auctioneer ?? null,
          auction.minimumBid?.value ?? null,
          auction.minimumBid?.currency ?? auction.currency,
          auction.description ?? null,
          auction.isFeatured,
          auction.mainImage?.storagePath ?? null,
          auction.mainImage?.url ?? null,
          auction.publishedAt ?? null,
        ],
      );
      await this.replaceChildren(client, auction);
    });
    return auction;
  }

  async update(auction: Auction): Promise<Auction> {
    await withTransaction(getPool(), async (client) => {
      await client.query(
        `update auctions set
           slug = $2, title = $3,
           status_id = (select id from property_statuses where code = $4),
           event_status = $5, scheduled_at = $6, location = $7, auctioneer = $8,
           minimum_bid = $9, currency = $10, description = $11, is_featured = $12,
           main_image_path = $13, main_image_url = $14, published_at = $15
         where id = $1`,
        [
          auction.id,
          auction.slug,
          auction.title,
          auction.status,
          auction.eventStatus,
          auction.scheduledAt,
          auction.location ?? null,
          auction.auctioneer ?? null,
          auction.minimumBid?.value ?? null,
          auction.minimumBid?.currency ?? auction.currency,
          auction.description ?? null,
          auction.isFeatured,
          auction.mainImage?.storagePath ?? null,
          auction.mainImage?.url ?? null,
          auction.publishedAt ?? null,
        ],
      );
      await this.replaceChildren(client, auction);
    });
    return auction;
  }

  private async replaceChildren(client: import("pg").PoolClient, auction: Auction): Promise<void> {
    await client.query("delete from auction_lots where auction_id = $1", [auction.id]);
    for (const lot of auction.lots) {
      await client.query(
        `insert into auction_lots
           (id, auction_id, lot_number, title, description, minimum_bid, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          lot.id,
          auction.id,
          lot.lotNumber,
          lot.title,
          lot.description,
          lot.minimumBid?.value ?? null,
          0,
        ],
      );
    }

    await client.query("delete from auction_images where auction_id = $1", [auction.id]);
    for (const image of auction.images) {
      await client.query(
        `insert into auction_images
           (id, auction_id, storage_path, url, alt_text, sort_order, is_main)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          image.id,
          auction.id,
          image.storagePath,
          image.url,
          image.altText,
          image.sortOrder,
          image.isMain,
        ],
      );
    }
  }

  async findById(id: string): Promise<Auction | null> {
    const { rows } = await getPool().query<Record<string, unknown>>(
      `select ${MAIN_COLUMNS} ${FROM} where a.id = $1`,
      [id],
    );
    if (rows.length === 0) return null;
    const children = await this.loadChildren(rows);
    return this.hydrate(rows, children.images, children.lots)[0] ?? null;
  }

  async findBySlug(slug: string): Promise<Auction | null> {
    const { rows } = await getPool().query<Record<string, unknown>>(
      `select ${MAIN_COLUMNS} ${FROM}
       where a.slug = $1 and a.status_id = (select id from property_statuses where code = 'publicado')
       limit 1`,
      [slug],
    );
    if (rows.length === 0) return null;
    const children = await this.loadChildren(rows);
    return this.hydrate(rows, children.images, children.lots)[0] ?? null;
  }

  async search(criteria: AuctionSearchCriteria): Promise<AuctionSearchResult> {
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
      criteria.sort === "proximos" ? "a.scheduled_at asc" : "a.published_at desc nulls last";
    const { rows } = await pool.query<Record<string, unknown>>(
      `select ${MAIN_COLUMNS} ${FROM} ${clause} order by ${orderSql} limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    );

    const children = await this.loadChildren(rows);
    return {
      items: this.hydrate(rows, children.images, children.lots),
      total,
      page,
      pageSize,
    };
  }

  async listFeatured(limit = 3): Promise<Auction[]> {
    const result = await this.search({
      featured: true,
      eventStatus: "proximo",
      statuses: ["publicado"],
      sort: "proximos",
      page: 1,
      pageSize: limit,
    });
    return result.items;
  }

  async listUpcoming(limit = 3): Promise<Auction[]> {
    const result = await this.search({
      eventStatus: "proximo",
      statuses: ["publicado"],
      sort: "proximos",
      page: 1,
      pageSize: limit,
    });
    return result.items;
  }

  async deleteById(id: string): Promise<boolean> {
    const { rowCount } = await getPool().query("delete from auctions where id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }
}
