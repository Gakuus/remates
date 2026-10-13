import type { PropertyRepository } from "@/application/ports/property-repository";
import type { Property } from "@/domain/entities/property";
import type { PropertyStatusCode } from "@/domain/enums/property-status";

export type PropertyOperationResult =
  { ok: true; property: Property } | { ok: false; error: "not_found" | "cannot_publish" };

export type GetPropertyBySlug = (
  slug: string,
  options?: { includeUnpublished?: boolean },
) => Promise<Property | null>;

/** Obtener un campo para su ficha (PLAN §2, §8). */
export function createGetPropertyBySlug(repo: PropertyRepository): GetPropertyBySlug {
  return (slug, options) => repo.findBySlug(slug, options);
}

export type UpdateProperty = (property: Property) => Promise<PropertyOperationResult>;

/** Editar campo (PLAN §2). */
export function createUpdateProperty(repo: PropertyRepository): UpdateProperty {
  return async (property) => {
    const existing = await repo.findById(property.id);
    if (!existing) return { ok: false, error: "not_found" };
    const updated = await repo.update(property);
    return { ok: true, property: updated };
  };
}

export type ChangePropertyStatus = (
  property: Property,
  status: PropertyStatusCode,
) => Promise<PropertyOperationResult>;

/**
 * Publicar / despublicar (PLAN §2).
 * `publicado` exige pasar las reglas de dominio; el resto cambia libremente.
 */
export function createChangePropertyStatus(repo: PropertyRepository): ChangePropertyStatus {
  return async (property, status) => {
    const existing = await repo.findById(property.id);
    if (!existing) return { ok: false, error: "not_found" };

    const next = existing.withStatus(status);

    if (status === "publicado" && !next.canPublish()) {
      return { ok: false, error: "cannot_publish" };
    }

    const saved = await repo.update(next);
    return { ok: true, property: saved };
  };
}
