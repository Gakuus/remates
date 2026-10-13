import type { PropertyStatusCode } from "@/domain/enums/property-status";
import type { MachineryCategoryCode } from "@/domain/enums/machinery-category";
import type { Price } from "@/domain/value-objects/price";
import type { ContentImage } from "@/domain/entities/content-image";
import { canPublishMachinery, type MachineryPublishBlocker } from "@/domain/rules/machinery-rules";

export interface MachineryItemProps {
  id: string;
  slug: string;
  title: string;
  category: MachineryCategoryCode;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  hoursUsed?: number | null;
  price?: Price | null;
  currency: string;
  department: string;
  locality?: string | null;
  description?: string | null;
  status: PropertyStatusCode;
  isFeatured: boolean;
  images: ContentImage[];
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entidad Maquinaria (PLAN §11 `machinery`).
 * Usa el mismo ciclo de estado que campos y remates.
 */
export class MachineryItem {
  private constructor(private readonly props: MachineryItemProps) {}

  static create(props: MachineryItemProps): MachineryItem {
    return new MachineryItem(props);
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
  get category(): MachineryCategoryCode {
    return this.props.category;
  }
  get brand(): string | null {
    return this.props.brand ?? null;
  }
  get model(): string | null {
    return this.props.model ?? null;
  }
  get year(): number | null {
    return this.props.year ?? null;
  }
  get hoursUsed(): number | null {
    return this.props.hoursUsed ?? null;
  }
  get price(): Price | null {
    return this.props.price ?? null;
  }
  get currency(): string {
    return this.props.currency;
  }
  get department(): string {
    return this.props.department;
  }
  get locality(): string | null {
    return this.props.locality ?? null;
  }
  get description(): string | null {
    return this.props.description ?? null;
  }
  get status(): PropertyStatusCode {
    return this.props.status;
  }
  get isFeatured(): boolean {
    return this.props.isFeatured;
  }
  get images(): readonly ContentImage[] {
    return this.props.images;
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

  get mainImage(): ContentImage | null {
    return this.props.images.find((i) => i.isMain) ?? this.props.images[0] ?? null;
  }

  get isPublished(): boolean {
    return this.props.status === "publicado";
  }

  /** "Marca Modelo" o el título si no hay marca/modelo (para tarjetas). */
  get lineup(): string {
    const bits = [this.props.brand, this.props.model].filter((value): value is string =>
      Boolean(value),
    );
    return bits.length > 0 ? bits.join(" ") : this.props.title;
  }

  publishBlockers(): MachineryPublishBlocker[] {
    return canPublishMachinery({
      title: this.props.title,
      slug: this.props.slug,
      category: this.props.category,
      department: this.props.department,
      price: this.props.price ?? null,
      hasMainImage: this.mainImage !== null,
    });
  }

  canPublish(): boolean {
    return this.publishBlockers().length === 0;
  }

  withStatus(status: PropertyStatusCode): MachineryItem {
    return new MachineryItem({
      ...this.props,
      status,
      publishedAt:
        status === "publicado" ? (this.props.publishedAt ?? new Date()) : this.props.publishedAt,
      updatedAt: new Date(),
    });
  }

  withFeatured(isFeatured: boolean): MachineryItem {
    return new MachineryItem({ ...this.props, isFeatured, updatedAt: new Date() });
  }

  /** Devuelve una copia con las imágenes reemplazadas (inmutable). */
  withImages(images: ContentImage[]): MachineryItem {
    return new MachineryItem({ ...this.props, images, updatedAt: new Date() });
  }
}
