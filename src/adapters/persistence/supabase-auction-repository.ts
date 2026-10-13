import type {
  AuctionRepository,
  AuctionSearchCriteria,
  AuctionSearchResult,
} from "@/application/ports/auction-repository";
import type { Auction } from "@/domain/entities/auction";
import { getSupabasePublicClient } from "@/infrastructure/supabase/client";
import { mapAuction, type AuctionRow } from "@/adapters/persistence/mappers";

const AUCTION_SELECT = `
  id, slug, title, event_status, scheduled_at, location, auctioneer,
  minimum_bid, currency, description, is_featured, main_image_path,
  main_image_url, published_at, created_at, updated_at,
  status:property_statuses!auctions_status_id_fkey ( code ),
  auction_images ( id, storage_path, url, alt_text, sort_order, is_main ),
  auction_lots ( id, auction_id, lot_number, title, description, minimum_bid, sort_order )
`;

type RawRow = Omit<AuctionRow, "status_code"> & {
  status: { code: string } | null;
};

function toRow(raw: RawRow): AuctionRow {
  return { ...raw, status_code: raw.status?.code ?? "borrador" };
}

interface StatusIdLookup {
  (code: string): Promise<number | null>;
}

/**
 * Adaptador de persistencia de remates (PLAN §2, Sprint 8).
 * Único punto que conoce el esquema de `auctions`/`auction_lots`.
 */
export class SupabaseAuctionRepository implements AuctionRepository {
  constructor(private readonly getStatusId: StatusIdLookup) {}

  async create(auction: Auction): Promise<Auction> {
    const supabase = getSupabasePublicClient();
    const statusId = await this.requireId(auction.status);
    const { data, error } = await supabase
      .from("auctions")
      .insert(this.toWriteRow(auction, statusId))
      .select(AUCTION_SELECT)
      .single();
    if (error) throw new Error(`No se pudo crear el remate: ${error.message}`);
    return mapAuction(toRow(data as unknown as RawRow));
  }

  async update(auction: Auction): Promise<Auction> {
    const supabase = getSupabasePublicClient();
    const statusId = await this.requireId(auction.status);
    const { data, error } = await supabase
      .from("auctions")
      .update(this.toWriteRow(auction, statusId))
      .eq("id", auction.id)
      .select(AUCTION_SELECT)
      .single();
    if (error) throw new Error(`No se pudo actualizar el remate: ${error.message}`);
    return mapAuction(toRow(data as unknown as RawRow));
  }

  async findById(id: string): Promise<Auction | null> {
    const supabase = getSupabasePublicClient();
    const { data, error } = await supabase
      .from("auctions")
      .select(AUCTION_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`No se pudo obtener el remate: ${error.message}`);
    return data ? mapAuction(toRow(data as unknown as RawRow)) : null;
  }

  async findBySlug(slug: string): Promise<Auction | null> {
    const supabase = getSupabasePublicClient();
    const { data, error } = await supabase
      .from("auctions")
      .select(AUCTION_SELECT)
      .eq("slug", slug)
      .eq("status_id", await this.requireId("publicado"))
      .maybeSingle();
    if (error) throw new Error(`No se pudo obtener el remate: ${error.message}`);
    return data ? mapAuction(toRow(data as unknown as RawRow)) : null;
  }

  async search(criteria: AuctionSearchCriteria): Promise<AuctionSearchResult> {
    const supabase = getSupabasePublicClient();
    const page = Math.max(1, criteria.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, criteria.pageSize ?? 24));
    const from = (page - 1) * pageSize;

    let query = supabase.from("auctions").select(AUCTION_SELECT, { count: "exact" });

    if (criteria.statuses?.length) {
      const ids = (
        await Promise.all(criteria.statuses.map((code) => this.getStatusId(code)))
      ).filter((id): id is number => id !== null);
      if (ids.length > 0) query = query.in("status_id", ids);
    }
    if (criteria.eventStatus) query = query.eq("event_status", criteria.eventStatus);
    if (criteria.department) query = query.ilike("location", `%${criteria.department}%`);
    if (criteria.featured) query = query.eq("is_featured", true);

    if (criteria.sort === "proximos") {
      query = query.order("scheduled_at", { ascending: true });
    } else {
      query = query.order("published_at", { ascending: false, nullsFirst: false });
    }

    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(`No se pudieron buscar remates: ${error.message}`);

    return {
      items: ((data ?? []) as unknown as RawRow[]).map((r) => mapAuction(toRow(r))),
      total: count ?? 0,
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
    const supabase = getSupabasePublicClient();
    const { error } = await supabase.from("auctions").delete().eq("id", id);
    if (error) return false;
    return true;
  }

  private async requireId(code: string): Promise<number> {
    const id = await this.getStatusId(code);
    if (id === null) throw new Error(`Catálogo no encontrado: "${code}". ¿Falta el seed?`);
    return id;
  }

  private toWriteRow(auction: Auction, statusId: number) {
    return {
      slug: auction.slug,
      title: auction.title,
      status_id: statusId,
      event_status: auction.eventStatus,
      scheduled_at: auction.scheduledAt.toISOString(),
      location: auction.location,
      auctioneer: auction.auctioneer,
      minimum_bid: auction.minimumBid?.value ?? null,
      currency: auction.minimumBid?.currency ?? auction.currency,
      description: auction.description,
      is_featured: auction.isFeatured,
      main_image_path: auction.mainImage?.storagePath ?? null,
      main_image_url: auction.mainImage?.url ?? null,
      published_at: auction.publishedAt ? auction.publishedAt.toISOString() : null,
    };
  }
}
