import type { PropertyStatusCode } from "@/domain/enums/property-status";
import type { AuctionEventStatusCode } from "@/domain/enums/auction-event-status";
import type { Price } from "@/domain/value-objects/price";
import type { ContentImage } from "@/domain/entities/content-image";
import { canPublishAuction, type AuctionPublishBlocker } from "@/domain/rules/auction-rules";

export interface AuctionLotProps {
  id: string;
  auctionId: string;
  lotNumber: number;
  title?: string | null;
  description?: string | null;
  minimumBid?: Price | null;
  sortOrder: number;
}

/** Lote de un remate (PLAN §11 `auction_lots`). */
export class AuctionLot {
  private constructor(private readonly props: AuctionLotProps) {}

  static create(props: AuctionLotProps): AuctionLot {
    return new AuctionLot(props);
  }

  get id(): string {
    return this.props.id;
  }
  get auctionId(): string {
    return this.props.auctionId;
  }
  get lotNumber(): number {
    return this.props.lotNumber;
  }
  get title(): string | null {
    return this.props.title ?? null;
  }
  get description(): string | null {
    return this.props.description ?? null;
  }
  get minimumBid(): Price | null {
    return this.props.minimumBid ?? null;
  }
}

export interface AuctionProps {
  id: string;
  slug: string;
  title: string;
  status: PropertyStatusCode;
  eventStatus: AuctionEventStatusCode;
  scheduledAt: Date;
  location?: string | null;
  auctioneer?: string | null;
  minimumBid?: Price | null;
  currency: string;
  description?: string | null;
  isFeatured: boolean;
  images: ContentImage[];
  lots: AuctionLot[];
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entidad Remate (PLAN §11 `auctions`).
 * El estado de publicación usa `property_statuses`; el estado del evento
 * (`proximo`/`realizado`/`cancelado`) es un eje independiente.
 */
export class Auction {
  private constructor(private readonly props: AuctionProps) {}

  static create(props: AuctionProps): Auction {
    return new Auction(props);
  }

  get id(): string {
    return this.props.id;
  }
  get slug(): string {
    return this.props.slug;
  }
  get title(): string {
    return this.props.title;
  }
  get status(): PropertyStatusCode {
    return this.props.status;
  }
  get eventStatus(): AuctionEventStatusCode {
    return this.props.eventStatus;
  }
  get scheduledAt(): Date {
    return this.props.scheduledAt;
  }
  get location(): string | null {
    return this.props.location ?? null;
  }
  get auctioneer(): string | null {
    return this.props.auctioneer ?? null;
  }
  get minimumBid(): Price | null {
    return this.props.minimumBid ?? null;
  }
  get currency(): string {
    return this.props.currency;
  }
  get description(): string | null {
    return this.props.description ?? null;
  }
  get isFeatured(): boolean {
    return this.props.isFeatured;
  }
  get images(): readonly ContentImage[] {
    return this.props.images;
  }
  get lots(): readonly AuctionLot[] {
    return this.props.lots;
  }
  get publishedAt(): Date | null {
    return this.props.publishedAt ?? null;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Imagen principal (o la primera, como fallback de display). */
  get mainImage(): ContentImage | null {
    return this.props.images.find((i) => i.isMain) ?? this.props.images[0] ?? null;
  }

  get isPublished(): boolean {
    return this.props.status === "publicado";
  }

  get isUpcoming(): boolean {
    return this.props.eventStatus === "proximo";
  }

  /** Motivos por los que no puede publicarse (PLAN §11). */
  publishBlockers(): AuctionPublishBlocker[] {
    return canPublishAuction({
      title: this.props.title,
      slug: this.props.slug,
      scheduledAt: this.props.scheduledAt,
      eventStatus: this.props.eventStatus,
      location: this.props.location ?? null,
      auctioneer: this.props.auctioneer ?? null,
      hasMainImage: this.mainImage !== null,
    });
  }

  canPublish(): boolean {
    return this.publishBlockers().length === 0;
  }

  withStatus(status: PropertyStatusCode): Auction {
    return new Auction({
      ...this.props,
      status,
      publishedAt:
        status === "publicado" ? (this.props.publishedAt ?? new Date()) : this.props.publishedAt,
      updatedAt: new Date(),
    });
  }

  withEventStatus(eventStatus: AuctionEventStatusCode): Auction {
    return new Auction({ ...this.props, eventStatus, updatedAt: new Date() });
  }

  withFeatured(isFeatured: boolean): Auction {
    return new Auction({ ...this.props, isFeatured, updatedAt: new Date() });
  }

  /** Devuelve una copia con las imágenes reemplazadas (inmutable). */
  withImages(images: ContentImage[]): Auction {
    return new Auction({ ...this.props, images, updatedAt: new Date() });
  }
}
