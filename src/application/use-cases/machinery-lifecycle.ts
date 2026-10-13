import type { MachineryRepository } from "@/application/ports/machinery-repository";
import type { MachineryItem } from "@/domain/entities/machinery-item";
import { MachineryItem as MachineryEntity } from "@/domain/entities/machinery-item";
import type { MachineryCategoryCode } from "@/domain/enums/machinery-category";
import type { PropertyStatusCode } from "@/domain/enums/property-status";
import { Price } from "@/domain/value-objects/price";
import { createSlug } from "@/domain/value-objects/slug";

export interface CreateMachineryInput {
  id: string;
  title: string;
  category: MachineryCategoryCode;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  hoursUsed?: number | null;
  price?: number | null;
  currency?: string;
  department: string;
  locality?: string | null;
  description?: string | null;
  slug?: string;
}

export type CreateMachineryResult =
  { ok: true; item: MachineryItem } | { ok: false; error: "invalid_slug" | "invalid_price" };

/**
 * Crear aviso de maquinaria (PLAN Sprint 8). Alta inicial como borrador;
 * publicar es un paso separado (`ChangeMachineryStatus`).
 */
export function createCreateMachinery(
  repo: MachineryRepository,
  clock: { now(): Date },
): (input: CreateMachineryInput) => Promise<CreateMachineryResult> {
  return async (input) => {
    const slug = createSlug(input.slug ?? input.title);
    if (!slug.ok) return { ok: false, error: "invalid_slug" };

    let price: Price | null = null;
    if (input.price !== null && input.price !== undefined) {
      const created = Price.create(input.price);
      if (!created.ok) return { ok: false, error: "invalid_price" };
      price = created.value;
    }

    const now = clock.now();

    const item = MachineryEntity.create({
      id: input.id,
      slug: slug.value,
      title: input.title.trim(),
      category: input.category,
      brand: input.brand ?? null,
      model: input.model ?? null,
      year: input.year ?? null,
      hoursUsed: input.hoursUsed ?? null,
      price,
      currency: input.currency ?? "USD",
      department: input.department.trim(),
      locality: input.locality ?? null,
      description: input.description ?? null,
      status: "borrador" satisfies PropertyStatusCode,
      isFeatured: false,
      images: [],
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await repo.create(item);
    return { ok: true, item };
  };
}

export type UpdateMachinery = (item: MachineryItem) => Promise<MachineryItem | null>;

/** Persistir cambios de un aviso existente (PLAN Sprint 8). */
export function createUpdateMachinery(repo: MachineryRepository): UpdateMachinery {
  return async (item) => {
    const existing = await repo.findById(item.id);
    if (!existing) return null;
    return repo.update(item);
  };
}

export type ChangeMachineryStatus = (
  item: MachineryItem,
  status: PropertyStatusCode,
) => Promise<
  { ok: true; item: MachineryItem } | { ok: false; error: "not_found" | "cannot_publish" }
>;

/** Publicar / despublicar un aviso. Publicar exige las reglas de dominio. */
export function createChangeMachineryStatus(repo: MachineryRepository): ChangeMachineryStatus {
  return async (item, status) => {
    const existing = await repo.findById(item.id);
    if (!existing) return { ok: false, error: "not_found" };

    const next = existing.withStatus(status);
    if (status === "publicado" && !next.canPublish()) {
      return { ok: false, error: "cannot_publish" };
    }

    const saved = await repo.update(next);
    return { ok: true, item: saved };
  };
}
