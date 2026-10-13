import type { PropertyStatusCode } from "@/domain/enums/property-status";
import type { PropertyTypeCode } from "@/domain/enums/property-type";
import type { FeatureValue, PropertyImage } from "@/domain/entities/property-image";
import { Hectares } from "@/domain/value-objects/hectares";
import { Price } from "@/domain/value-objects/price";
import { canPublish, type PublishBlocker } from "@/domain/rules/publish-rules";

export interface PropertyLocation {
  department: string;
  locality?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accessNotes?: string | null;
}

export interface PropertyProps {
  id: string;
  slug: string;
  name: string;
  status: PropertyStatusCode;
  type: PropertyTypeCode;
  price: Price | null;
  hectares: Hectares;
  location: PropertyLocation;
  description?: string | null;
  isFeatured: boolean;
  images: PropertyImage[];
  features: FeatureValue[];
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entidad Campo (PLAN §2, §11 `properties`).
 * Contiene estado y comportamiento; la persistencia es responsabilidad
 * de los adaptadores.
 */
export class Property {
  private constructor(private readonly props: PropertyProps) {}

  static create(props: PropertyProps): Property {
    return new Property(props);
  }

  get id(): string {
    return this.props.id;
  }
  get slug(): string {
    return this.props.slug;
  }
  get name(): string {
    return this.props.name;
  }
  get status(): PropertyStatusCode {
    return this.props.status;
  }
  get type(): PropertyTypeCode {
    return this.props.type;
  }
  get price(): Price | null {
    return this.props.price;
  }
  get hectares(): Hectares {
    return this.props.hectares;
  }
  get location(): PropertyLocation {
    return this.props.location;
  }
  get description(): string | null {
    return this.props.description ?? null;
  }
  get isFeatured(): boolean {
    return this.props.isFeatured;
  }
  get images(): readonly PropertyImage[] {
    return this.props.images;
  }
  get features(): readonly FeatureValue[] {
    return this.props.features;
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
  get mainImage(): PropertyImage | null {
    return this.props.images.find((i) => i.isMain) ?? this.props.images[0] ?? null;
  }

  get isPublished(): boolean {
    return this.props.status === "publicado";
  }

  /** Motivos por los que no puede publicarse (PLAN §11 obligatoriedad). */
  publishBlockers(): PublishBlocker[] {
    return canPublish({
      name: this.props.name,
      slug: this.props.slug,
      type: this.props.type,
      department: this.props.location.department,
      hectares: this.props.hectares.value,
      price: this.props.price,
      hasMainImage: this.mainImage !== null,
    });
  }

  canPublish(): boolean {
    return this.publishBlockers().length === 0;
  }

  /** Devuelve una copia con estado nuevo (el dominio es inmutable). */
  withStatus(status: PropertyStatusCode): Property {
    return new Property({
      ...this.props,
      status,
      publishedAt:
        status === "publicado" ? (this.props.publishedAt ?? new Date()) : this.props.publishedAt,
      updatedAt: new Date(),
    });
  }

  withFeatured(isFeatured: boolean): Property {
    return new Property({ ...this.props, isFeatured, updatedAt: new Date() });
  }

  /** Devuelve una copia con las imágenes reemplazadas (inmutable). */
  withImages(images: PropertyImage[]): Property {
    return new Property({ ...this.props, images, updatedAt: new Date() });
  }
}
