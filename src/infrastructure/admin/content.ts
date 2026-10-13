import { z } from "zod";

import { isAuctionEventStatusCode } from "@/domain/enums/auction-event-status";
import { isUruguayDepartment } from "@/domain/enums/department";
import { isMachineryCategoryCode } from "@/domain/enums/machinery-category";
import { isPropertyTypeCode } from "@/domain/enums/property-type";

export { CONTENT_KINDS, isContentKind, type ContentKind } from "@/application/dtos/admin-content";
import { isContentKind } from "@/application/dtos/admin-content";

const optional = z
  .union([z.string().trim().min(1), z.null(), z.literal("")])
  .optional()
  .transform((value) => (typeof value === "string" && value.length === 0 ? null : value));

const optionalNumber = z
  .union([z.number(), z.string().trim(), z.null()])
  .optional()
  .transform((value) => {
    if (value === null || value === "") return null;
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : null;
  });

const optionalSlug = optional.transform((value) => (value ? String(value) : undefined));

export type CreatePayload =
  | {
      kind: "campos";
      name: string;
      department: string;
      locality?: string | null;
      type: string;
      hectares: number;
      price?: number | null;
      description?: string | null;
      slug?: string;
    }
  | {
      kind: "remates";
      title: string;
      scheduledAt: string;
      eventStatus?: string | null;
      location?: string | null;
      auctioneer?: string | null;
      minimumBid?: number | null;
      currency?: string;
      description?: string | null;
      slug?: string;
      lots?: unknown;
    }
  | {
      kind: "maquinaria";
      title: string;
      category: string;
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
    };

/** Traduce el payload del formulario a un error legible + campos. */
export function parseCreatePayload(
  body: Record<string, unknown>,
): { ok: true; input: CreatePayload } | { ok: false; error: string } {
  const kind = body.kind;
  if (!isContentKind(kind)) return { ok: false, error: "Tipo de contenido inválido." };

  if (kind === "campos") {
    const name = z.string().trim().min(1, "El nombre es obligatorio.").safeParse(body.name);
    const department = z
      .string()
      .refine(isUruguayDepartment, "Departamento inválido.")
      .safeParse(body.department);
    const type = z
      .string()
      .refine(isPropertyTypeCode, "Tipo de campo inválido.")
      .safeParse(body.type);
    const hectares = optionalNumber.parse(body.hectares);
    if (
      !name.success ||
      !department.success ||
      !type.success ||
      hectares === null ||
      hectares <= 0
    ) {
      return {
        ok: false,
        error:
          name.error?.issues[0]?.message ??
          department.error?.issues[0]?.message ??
          type.error?.issues[0]?.message ??
          "La superficie debe ser un número mayor a cero.",
      };
    }
    const price = optionalNumber.parse(body.price);
    if (price !== null && price < 0)
      return { ok: false, error: "El precio no puede ser negativo." };
    return {
      ok: true,
      input: {
        kind: "campos",
        name: name.data,
        department: department.data,
        locality: optional.parse(body.locality) ?? null,
        type: type.data,
        hectares,
        price,
        description: optional.parse(body.description),
        slug: optionalSlug.parse(body.slug),
      },
    };
  }

  if (kind === "remates") {
    const title = z.string().trim().min(1, "El título es obligatorio.").safeParse(body.title);
    const scheduledAt = z
      .string()
      .refine((value) => Number.isFinite(new Date(value).getTime()), "Fecha o hora inválida.")
      .safeParse(body.scheduledAt);
    const rawEventStatus = body.eventStatus;
    const eventStatus =
      rawEventStatus === null || rawEventStatus === "" || rawEventStatus === undefined
        ? "proximo"
        : rawEventStatus;
    const validEventStatus =
      typeof eventStatus === "string" && isAuctionEventStatusCode(eventStatus);
    if (!title.success || !scheduledAt.success || !validEventStatus) {
      return {
        ok: false,
        error:
          title.error?.issues[0]?.message ??
          scheduledAt.error?.issues[0]?.message ??
          "Estado del evento inválido.",
      };
    }
    const minimumBid = optionalNumber.parse(body.minimumBid);
    if (minimumBid !== null && minimumBid < 0) {
      return { ok: false, error: "La base no puede ser negativa." };
    }

    const lots = parseLots(body.lots);

    return {
      ok: true,
      input: {
        kind: "remates",
        title: title.data,
        scheduledAt: new Date(scheduledAt.data).toISOString(),
        eventStatus,
        location: optional.parse(body.location),
        auctioneer: optional.parse(body.auctioneer),
        minimumBid,
        currency: optional.parse(body.currency) ?? "USD",
        description: optional.parse(body.description),
        slug: optionalSlug.parse(body.slug),
        lots,
      },
    };
  }

  const title = z.string().trim().min(1, "El título es obligatorio.").safeParse(body.title);
  const category = z
    .string()
    .refine(isMachineryCategoryCode, "Categoría inválida.")
    .safeParse(body.category);
  const department = z
    .string()
    .refine(isUruguayDepartment, "Departamento inválido.")
    .safeParse(body.department);
  const year = optionalNumber.parse(body.year);
  if (!title.success || !category.success || !department.success) {
    return {
      ok: false,
      error:
        title.error?.issues[0]?.message ??
        category.error?.issues[0]?.message ??
        department.error?.issues[0]?.message ??
        "Datos inválidos.",
    };
  }
  const hoursUsed = optionalNumber.parse(body.hoursUsed);
  const price = optionalNumber.parse(body.price);
  if (hoursUsed !== null && hoursUsed < 0) {
    return { ok: false, error: "Las horas no pueden ser negativas." };
  }
  if (price !== null && price < 0) return { ok: false, error: "El precio no puede ser negativo." };

  return {
    ok: true,
    input: {
      kind: "maquinaria",
      title: title.data,
      category: category.data,
      brand: optional.parse(body.brand),
      model: optional.parse(body.model),
      year,
      hoursUsed,
      price,
      currency: optional.parse(body.currency) ?? "USD",
      department: department.data,
      locality: optional.parse(body.locality),
      description: optional.parse(body.description),
      slug: optionalSlug.parse(body.slug),
    },
  };
}

/**
 * Lotes de un remate a partir de líneas de texto del admin:
 * `Número | Título | Base` (una por línea). Devuelve `undefined` si no va nada.
 */
export function parseLots(value: unknown): CreateLots | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const lots: CreateLots = [];
  for (const raw of value.split("\n")) {
    const line = raw.trim();
    if (line.length === 0) continue;
    const [numberPart, ...rest] = line.split("|");
    const lotNumber = Number(numberPart?.trim());
    const title = rest.join("|").trim() || undefined;
    if (!Number.isFinite(lotNumber)) continue;
    lots.push({
      lotNumber,
      title,
    });
  }
  return lots.length > 0 ? lots : undefined;
}

type CreateLots = Array<{ lotNumber: number; title?: string }>;
