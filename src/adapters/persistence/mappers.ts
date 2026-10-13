import type { Property, PropertyLocation } from "@/domain/entities/property";
import type { FeatureValue, PropertyImage } from "@/domain/entities/property-image";
import type { PropertyStatusCode } from "@/domain/enums/property-status";
import type { PropertyTypeCode } from "@/domain/enums/property-type";
import { isFeatureCode, type FeatureCode } from "@/domain/enums/feature-code";
import { Property as PropertyEntity } from "@/domain/entities/property";
import { Hectares } from "@/domain/value-objects/hectares";
import { Price } from "@/domain/value-objects/price";
import type { Auction, AuctionLot, AuctionLotProps } from "@/domain/entities/auction";
import {
  Auction as AuctionEntity,
  AuctionLot as AuctionLotEntity,
} from "@/domain/entities/auction";
import type { MachineryItem } from "@/domain/entities/machinery-item";
import { MachineryItem as MachineryItemEntity } from "@/domain/entities/machinery-item";
import type { MachineryCategoryCode } from "@/domain/enums/machinery-category";
import type { AuctionEventStatusCode } from "@/domain/enums/auction-event-status";
import type { ContentImage } from "@/domain/entities/content-image";

/**
 * Mappers BD → dominio (único punto que conoce las columnas reales).
 * La inversa (dominio → fila) vive acá también, para que los adaptadores
 * no mezclen SQL con entidades.
 */

export interface PropertyRow {
  id: string;
  slug: string;
  name: string;
  status_code: string;
  type_code: string;
  price: string | number | null;
  currency: string | null;
  hectares: string | number;
  department: string;
  locality: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  access_notes: string | null;
  description: string | null;
  is_featured: boolean;
  main_image_path: string | null;
  main_image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  images?: PropertyImageRow[];
  features?: FeatureRow[];
}

export interface PropertyImageRow {
  id: string;
  storage_path: string;
  url: string;
  alt_text: string;
  sort_order: number;
  is_main: boolean;
}

export interface FeatureRow {
  feature_code: string;
  value: string;
}

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function mapImages(rows: PropertyImageRow[] | undefined): PropertyImage[] {
  return (rows ?? [])
    .map((r) => ({
      id: r.id,
      storagePath: r.storage_path,
      url: r.url,
      altText: r.alt_text,
      sortOrder: r.sort_order,
      isMain: r.is_main,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mapFeatures(rows: FeatureRow[] | undefined): FeatureValue[] {
  return (rows ?? [])
    .filter((r): r is FeatureRow & { feature_code: FeatureCode } => isFeatureCode(r.feature_code))
    .map((r) => ({ code: r.feature_code, value: r.value }));
}

export function mapLocation(row: PropertyRow): PropertyLocation {
  return {
    department: row.department,
    locality: row.locality,
    latitude: row.latitude === null ? null : toNumber(row.latitude),
    longitude: row.longitude === null ? null : toNumber(row.longitude),
    accessNotes: row.access_notes,
  };
}

export function mapProperty(row: PropertyRow): Property {
  return PropertyEntity.create({
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status_code as PropertyStatusCode,
    type: row.type_code as PropertyTypeCode,
    price: row.price === null ? null : Price.fromStored(toNumber(row.price), row.currency ?? "USD"),
    hectares: Hectares.fromStored(toNumber(row.hectares)),
    location: mapLocation(row),
    description: row.description,
    isFeatured: row.is_featured,
    images: mapImages(row.images),
    features: mapFeatures(row.features),
    publishedAt: row.published_at ? toDate(row.published_at) : null,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  });
}

/** Fila de escritura (dominio → columnas). */
export interface PropertyWriteRow {
  slug: string;
  name: string;
  status_id: number;
  type_id: number;
  price: number | null;
  currency: string;
  hectares: number;
  department: string;
  locality: string | null;
  latitude: number | null;
  longitude: number | null;
  access_notes: string | null;
  description: string | null;
  is_featured: boolean;
  published_at: string | null;
}

// ── Remates ────────────────────────────────────────────────────────────────

export interface AuctionRow {
  id: string;
  slug: string;
  title: string;
  status_code: string;
  event_status: string;
  scheduled_at: string;
  location: string | null;
  auctioneer: string | null;
  minimum_bid: string | number | null;
  currency: string | null;
  description: string | null;
  is_featured: boolean;
  main_image_path: string | null;
  main_image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  auction_images?: PropertyImageRow[];
  auction_lots?: AuctionLotRow[];
}

export interface AuctionLotRow {
  id: string;
  auction_id: string;
  lot_number: number;
  title: string | null;
  description: string | null;
  minimum_bid: string | number | null;
  sort_order: number;
}

export function mapContentImages(rows: PropertyImageRow[] | undefined): ContentImage[] {
  return mapImages(rows);
}

function mapAuctionLots(
  rows: AuctionLotRow[] | undefined,
  auctionId: string,
  currency: string,
): AuctionLot[] {
  return (rows ?? [])
    .map((r) => {
      const props: AuctionLotProps = {
        id: r.id,
        auctionId,
        lotNumber: r.lot_number,
        title: r.title,
        description: r.description,
        minimumBid:
          r.minimum_bid === null ? null : Price.fromStored(toNumber(r.minimum_bid), currency),
        sortOrder: r.sort_order,
      };
      return AuctionLotEntity.create(props);
    })
    .sort((a, b) => a.lotNumber - b.lotNumber);
}

export function mapAuction(row: AuctionRow): Auction {
  const currency = row.currency ?? "USD";
  return AuctionEntity.create({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status_code as PropertyStatusCode,
    eventStatus: row.event_status as AuctionEventStatusCode,
    scheduledAt: toDate(row.scheduled_at),
    location: row.location,
    auctioneer: row.auctioneer,
    minimumBid:
      row.minimum_bid === null ? null : Price.fromStored(toNumber(row.minimum_bid), currency),
    currency,
    description: row.description,
    isFeatured: row.is_featured,
    images: mapContentImages(row.auction_images),
    lots: mapAuctionLots(row.auction_lots, row.id, currency),
    publishedAt: row.published_at ? toDate(row.published_at) : null,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  });
}

// ── Maquinaria ─────────────────────────────────────────────────────────────

export interface MachineryRow {
  id: string;
  slug: string;
  title: string;
  status_code: string;
  category_code: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  hours_used: number | null;
  price: string | number | null;
  currency: string | null;
  department: string;
  locality: string | null;
  description: string | null;
  is_featured: boolean;
  main_image_path: string | null;
  main_image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  machinery_images?: PropertyImageRow[];
}

export function mapMachineryItem(row: MachineryRow): MachineryItem {
  return MachineryItemEntity.create({
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category_code as MachineryCategoryCode,
    brand: row.brand,
    model: row.model,
    year: row.year,
    hoursUsed: row.hours_used,
    price: row.price === null ? null : Price.fromStored(toNumber(row.price), row.currency ?? "USD"),
    currency: row.currency ?? "USD",
    department: row.department,
    locality: row.locality,
    description: row.description,
    status: row.status_code as PropertyStatusCode,
    isFeatured: row.is_featured,
    images: mapContentImages(row.machinery_images),
    publishedAt: row.published_at ? toDate(row.published_at) : null,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  });
}
