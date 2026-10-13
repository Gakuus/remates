import type {
  PropertyRepository,
  SearchCriteria,
  SearchResult,
} from "@/application/ports/property-repository";
import type {
  AuctionRepository,
  AuctionSearchCriteria,
  AuctionSearchResult,
} from "@/application/ports/auction-repository";
import type {
  MachineryRepository,
  MachinerySearchCriteria,
  MachinerySearchResult,
} from "@/application/ports/machinery-repository";
import type { PropertyCatalogRepository } from "@/application/ports/property-catalog-repository";
import type { InquiryRepository } from "@/application/ports/inquiry-repository";
import type { Property } from "@/domain/entities/property";
import type { Auction } from "@/domain/entities/auction";
import type { MachineryItem } from "@/domain/entities/machinery-item";
import type { InquiryProps, InquiryStatus } from "@/domain/entities/inquiry";
import { URUGUAY_DEPARTMENTS } from "@/domain/enums/department";
import { PROPERTY_TYPE_CODES, PROPERTY_TYPE_LABELS } from "@/domain/enums/property-type";
import { PROPERTY_STATUS_CODES, PROPERTY_STATUS_LABELS } from "@/domain/enums/property-status";
import {
  MACHINERY_CATEGORY_CODES,
  MACHINERY_CATEGORY_LABELS,
} from "@/domain/enums/machinery-category";

/**
 * Adaptadores en memoria (modo sin backend): responden al instante y sin
 * red, y retienen lo creado/guardado durante la vida del proceso — útil
 * para demo local y para tests. Se usa cuando no hay `DATABASE_URL`
 * (`isPostgresConfigured()`).
 */
export class InMemoryPropertyRepository implements PropertyRepository {
  private readonly byId = new Map<string, Property>();
  private readonly bySlug = new Map<string, Property>();

  async create(property: Property): Promise<Property> {
    this.byId.set(property.id, property);
    this.bySlug.set(property.slug, property);
    return property;
  }

  async update(property: Property): Promise<Property> {
    const existing = this.byId.get(property.id);
    if (!existing) return property;
    const current = this.bySlug.get(property.slug);
    if (current && current.id !== property.id) return property;
    if (existing.slug !== property.slug) this.bySlug.delete(existing.slug);
    this.bySlug.set(property.slug, property);
    this.byId.set(property.id, property);
    return property;
  }

  async findById(id: string): Promise<Property | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySlug(
    slug: string,
    options?: { includeUnpublished?: boolean },
  ): Promise<Property | null> {
    const property = this.bySlug.get(slug) ?? null;
    if (!property) return null;
    if (property.isPublished || options?.includeUnpublished) return property;
    return null;
  }

  async search(criteria: SearchCriteria): Promise<SearchResult> {
    let items = [...this.byId.values()] as Property[];
    const statuses = criteria.statuses ?? [];
    if (statuses.length > 0) items = items.filter((p) => statuses.includes(p.status));
    if (criteria.featured) items = items.filter((p) => p.isFeatured);
    if (criteria.query) {
      const q = criteria.query.toLowerCase();
      items = items.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q),
      );
    }
    if (criteria.department) {
      items = items.filter((p) => p.location.department === criteria.department);
    }
    if (criteria.type) items = items.filter((p) => p.type === criteria.type);

    items.sort(
      (a, b) =>
        (b.publishedAt?.getTime() ?? b.createdAt.getTime()) -
        (a.publishedAt?.getTime() ?? a.createdAt.getTime()),
    );

    const page = criteria.page ?? 1;
    const pageSize = criteria.pageSize ?? 24;
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
    };
  }

  async listFeatured(limit = 6): Promise<Property[]> {
    return this.byId
      .values()
      .filter((p) => p.isPublished && p.isFeatured)
      .toArray()
      .slice(0, limit);
  }

  async listRecent(limit = 6): Promise<Property[]> {
    return this.byId
      .values()
      .filter((p) => p.isPublished)
      .toArray()
      .sort(
        (a, b) =>
          (b.publishedAt?.getTime() ?? b.createdAt.getTime()) -
          (a.publishedAt?.getTime() ?? a.createdAt.getTime()),
      )
      .slice(0, limit);
  }

  async countByDepartment(): Promise<Array<{ department: string; count: number }>> {
    const counts = new Map<string, number>();
    for (const p of this.byId.values()) {
      if (!p.isPublished) continue;
      counts.set(p.location.department, (counts.get(p.location.department) ?? 0) + 1);
    }
    return URUGUAY_DEPARTMENTS.map((department) => ({
      department,
      count: counts.get(department) ?? 0,
    }));
  }

  async deleteById(id: string): Promise<boolean> {
    const property = this.byId.get(id);
    if (!property) return false;
    this.byId.delete(id);
    this.bySlug.delete(property.slug);
    return true;
  }
}

export class InMemoryAuctionRepository implements AuctionRepository {
  private readonly byId = new Map<string, Auction>();
  private readonly bySlug = new Map<string, Auction>();

  async create(auction: Auction): Promise<Auction> {
    this.byId.set(auction.id, auction);
    this.bySlug.set(auction.slug, auction);
    return auction;
  }

  async update(auction: Auction): Promise<Auction> {
    const existing = this.byId.get(auction.id);
    if (!existing) return auction;
    const current = this.bySlug.get(auction.slug);
    if (current && current.id !== auction.id) return auction;
    if (existing.slug !== auction.slug) this.bySlug.delete(existing.slug);
    this.bySlug.set(auction.slug, auction);
    this.byId.set(auction.id, auction);
    return auction;
  }

  async findById(id: string): Promise<Auction | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Auction | null> {
    const auction = this.bySlug.get(slug) ?? null;
    if (!auction) return null;
    if (auction.isPublished) return auction;
    return null;
  }

  async search(criteria: AuctionSearchCriteria): Promise<AuctionSearchResult> {
    let items = [...this.byId.values()] as Auction[];
    const statuses = criteria.statuses ?? [];
    if (statuses.length > 0) items = items.filter((a) => statuses.includes(a.status));
    if (criteria.eventStatus) items = items.filter((a) => a.eventStatus === criteria.eventStatus);
    if (criteria.department) {
      const dept = criteria.department.toLowerCase();
      items = items.filter((a) => (a.location ?? "").toLowerCase().includes(dept));
    }
    if (criteria.featured) items = items.filter((a) => a.isFeatured);

    if (criteria.sort === "proximos") {
      items.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    } else {
      items.sort(
        (a, b) =>
          (b.publishedAt?.getTime() ?? b.createdAt.getTime()) -
          (a.publishedAt?.getTime() ?? a.createdAt.getTime()),
      );
    }

    const page = criteria.page ?? 1;
    const pageSize = criteria.pageSize ?? 24;
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
    };
  }

  async listFeatured(limit = 3): Promise<Auction[]> {
    return this.byId
      .values()
      .filter((a) => a.isPublished && a.isFeatured && a.isUpcoming)
      .toArray()
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      .slice(0, limit);
  }

  async listUpcoming(limit = 3): Promise<Auction[]> {
    return this.byId
      .values()
      .filter((a) => a.isPublished && a.eventStatus === "proximo")
      .toArray()
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      .slice(0, limit);
  }

  async deleteById(id: string): Promise<boolean> {
    const auction = this.byId.get(id);
    if (!auction) return false;
    this.byId.delete(id);
    this.bySlug.delete(auction.slug);
    return true;
  }
}

export class InMemoryMachineryRepository implements MachineryRepository {
  private readonly byId = new Map<string, MachineryItem>();
  private readonly bySlug = new Map<string, MachineryItem>();

  async create(item: MachineryItem): Promise<MachineryItem> {
    this.byId.set(item.id, item);
    this.bySlug.set(item.slug, item);
    return item;
  }

  async update(item: MachineryItem): Promise<MachineryItem> {
    const existing = this.byId.get(item.id);
    if (!existing) return item;
    const current = this.bySlug.get(item.slug);
    if (current && current.id !== item.id) return item;
    if (existing.slug !== item.slug) this.bySlug.delete(existing.slug);
    this.bySlug.set(item.slug, item);
    this.byId.set(item.id, item);
    return item;
  }

  async findById(id: string): Promise<MachineryItem | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<MachineryItem | null> {
    const item = this.bySlug.get(slug) ?? null;
    if (!item) return null;
    if (item.isPublished) return item;
    return null;
  }

  async search(criteria: MachinerySearchCriteria): Promise<MachinerySearchResult> {
    let items = [...this.byId.values()] as MachineryItem[];
    const statuses = criteria.statuses ?? [];
    if (statuses.length > 0) items = items.filter((i) => statuses.includes(i.status));
    if (criteria.category) items = items.filter((i) => i.category === criteria.category);
    if (criteria.department) items = items.filter((i) => i.department === criteria.department);
    if (criteria.brand) {
      const brand = criteria.brand.toLowerCase();
      items = items.filter((i) => (i.brand ?? "").toLowerCase().includes(brand));
    }
    if (criteria.priceMin !== undefined && criteria.priceMin !== null) {
      items = items.filter((i) => i.price !== null && i.price!.value >= criteria.priceMin!);
    }
    if (criteria.priceMax !== undefined && criteria.priceMax !== null) {
      items = items.filter((i) => i.price !== null && i.price!.value <= criteria.priceMax!);
    }
    if (criteria.query) {
      const q = criteria.query.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.brand ?? "").toLowerCase().includes(q) ||
          (i.model ?? "").toLowerCase().includes(q),
      );
    }
    if (criteria.featured) items = items.filter((i) => i.isFeatured);

    if (criteria.sort === "precio_asc") {
      items.sort((a, b) => (a.price?.value ?? 0) - (b.price?.value ?? 0));
    } else if (criteria.sort === "precio_desc") {
      items.sort((a, b) => (b.price?.value ?? 0) - (a.price?.value ?? 0));
    } else {
      items.sort(
        (a, b) =>
          (b.publishedAt?.getTime() ?? b.createdAt.getTime()) -
          (a.publishedAt?.getTime() ?? a.createdAt.getTime()),
      );
    }

    const page = criteria.page ?? 1;
    const pageSize = criteria.pageSize ?? 24;
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
    };
  }

  async listFeatured(limit = 4): Promise<MachineryItem[]> {
    return this.byId
      .values()
      .filter((i) => i.isPublished && i.isFeatured)
      .toArray()
      .slice(0, limit);
  }

  async listRecent(limit = 4): Promise<MachineryItem[]> {
    return this.byId
      .values()
      .filter((i) => i.isPublished)
      .toArray()
      .sort(
        (a, b) =>
          (b.publishedAt?.getTime() ?? b.createdAt.getTime()) -
          (a.publishedAt?.getTime() ?? a.createdAt.getTime()),
      )
      .slice(0, limit);
  }

  async deleteById(id: string): Promise<boolean> {
    const item = this.byId.get(id);
    if (!item) return false;
    this.byId.delete(id);
    this.bySlug.delete(item.slug);
    return true;
  }
}

export class InMemoryCatalogRepository implements PropertyCatalogRepository {
  async listTypes(): Promise<Array<{ code: string; name: string }>> {
    return PROPERTY_TYPE_CODES.map((code) => ({ code, name: PROPERTY_TYPE_LABELS[code] }));
  }

  async listStatuses(): Promise<Array<{ code: string; name: string }>> {
    return PROPERTY_STATUS_CODES.map((code) => ({ code, name: PROPERTY_STATUS_LABELS[code] }));
  }

  async listMachineryCategories(): Promise<Array<{ code: string; name: string }>> {
    return MACHINERY_CATEGORY_CODES.map((code) => ({
      code,
      name: MACHINERY_CATEGORY_LABELS[code],
    }));
  }
}

export class InMemoryInquiryRepository implements InquiryRepository {
  private readonly saved: InquiryProps[] = [];

  async save(inquiry: InquiryProps): Promise<void> {
    this.saved.push(inquiry);
  }

  async listInquiries(): Promise<InquiryProps[]> {
    return [...this.saved].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateInquiryStatus(id: string, status: InquiryStatus): Promise<boolean> {
    const found = this.saved.find((inquiry) => inquiry.id === id);
    if (!found) return false;
    found.status = status;
    return true;
  }

  list(): readonly InquiryProps[] {
    return this.saved;
  }
}
