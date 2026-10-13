import type { PropertyRepository } from "@/application/ports/property-repository";
import type { PropertyStatusCode } from "@/domain/enums/property-status";
import type { PropertyTypeCode } from "@/domain/enums/property-type";
import type { PropertyImage } from "@/domain/entities/property-image";
import { Property } from "@/domain/entities/property";
import { Hectares } from "@/domain/value-objects/hectares";
import { Price } from "@/domain/value-objects/price";
import { createSlug } from "@/domain/value-objects/slug";

export interface CreatePropertyInput {
  id: string;
  name: string;
  department: string;
  locality?: string | null;
  type: PropertyTypeCode;
  hectares: number;
  price?: number | null;
  description?: string | null;
  /** Slug explícito opcional; si falta se deriva del nombre. */
  slug?: string;
  images?: PropertyImage[];
}

export type CreatePropertyResult =
  | { ok: true; property: Property }
  | {
      ok: false;
      error: "invalid_slug" | "invalid_hectares" | "invalid_price";
    };

/**
 * Crear campo (PLAN §2). Alta inicial como borrador: publicar es un paso
 * separado con sus propias reglas (`ChangePropertyStatus`).
 */
export function createCreateProperty(
  repo: PropertyRepository,
  clock: { now(): Date },
): (input: CreatePropertyInput) => Promise<CreatePropertyResult> {
  return async (input) => {
    const slug = createSlug(input.slug ?? input.name);
    if (!slug.ok) return { ok: false, error: "invalid_slug" };

    const hectares = Hectares.create(input.hectares);
    if (!hectares.ok) return { ok: false, error: "invalid_hectares" };

    let price: Price | null = null;
    if (input.price !== null && input.price !== undefined) {
      const created = Price.create(input.price);
      if (!created.ok) return { ok: false, error: "invalid_price" };
      price = created.value;
    }

    const now = clock.now();

    const property = Property.create({
      id: input.id,
      slug: slug.value,
      name: input.name.trim(),
      status: "borrador" satisfies PropertyStatusCode,
      type: input.type,
      price,
      hectares: hectares.value,
      location: {
        department: input.department,
        locality: input.locality ?? null,
        latitude: null,
        longitude: null,
        accessNotes: null,
      },
      description: input.description ?? null,
      isFeatured: false,
      images: input.images ?? [],
      features: [],
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await repo.create(property);
    return { ok: true, property: saved };
  };
}
