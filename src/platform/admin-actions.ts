"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { parseCreatePayload, parseLots } from "@/infrastructure/admin/content";
import { contentImageFromUpload, isTrustedStoragePath } from "@/infrastructure/admin/image-upload";
import { removeContentImage } from "@/domain/entities/content-image";
import { isContentKind } from "@/application/dtos/admin-content";
import { isPropertyStatusCode } from "@/domain/enums/property-status";
import { adminSessionCookieName, verifyAdminSessionToken } from "@/infrastructure/admin/session";
import { container } from "@/platform/container";

export interface AdminActionState {
  ok: boolean;
  error?: string;
  message?: string;
}

async function requireAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(adminSessionCookieName())?.value);
}

/**
 * Acciones del panel (PLAN Sprint 10). Se ejecutan en el mismo bundle que las
 * páginas `/admin`, así el estado en memoria (modo sin BD) queda consistente.
 * Toda mutación re-valida la sesión en el servidor.
 */

export async function createContent(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await requireAuth())) return { ok: false, error: "No autorizado." };

  const body: Record<string, unknown> = { action: "create" };
  formData.forEach((value, key) => {
    body[key] = typeof value === "string" ? value : String(value);
  });

  const parsed = parseCreatePayload(body);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const id = container.system.ids.newId();
  const { input } = parsed;

  if (input.kind === "campos") {
    const result = await container.useCases.createProperty({
      id,
      name: input.name,
      department: input.department,
      locality: input.locality,
      type: input.type as "agricola" | "ganadero" | "mixto",
      hectares: input.hectares,
      price: input.price,
      description: input.description,
      slug: input.slug,
    });
    if (!result.ok) return { ok: false, error: "Datos inválidos (slug)." };
  } else if (input.kind === "remates") {
    const result = await container.useCases.createAuction({
      id,
      title: input.title,
      scheduledAt: input.scheduledAt,
      eventStatus: (input.eventStatus ?? "proximo") as "proximo" | "realizado" | "cancelado",
      location: input.location,
      auctioneer: input.auctioneer,
      minimumBid: input.minimumBid,
      currency: input.currency,
      description: input.description,
      slug: input.slug,
      lots: (parseLots(input.lots) ?? []).map((lot) => ({
        id: container.system.ids.newId(),
        lotNumber: lot.lotNumber,
        title: lot.title ?? null,
        minimumBid: null,
      })),
    });
    if (!result.ok) {
      return {
        ok: false,
        error:
          result.error === "invalid_scheduled_at" ? "Fecha o hora inválida." : "Datos inválidos.",
      };
    }
  } else {
    const result = await container.useCases.createMachinery({
      id,
      title: input.title,
      category: input.category as
        | "tractor"
        | "cosechadora"
        | "sembradora"
        | "pulverizadora"
        | "camion"
        | "acoplado"
        | "herramientas"
        | "repuestos"
        | "otro",
      brand: input.brand,
      model: input.model,
      year: input.year,
      hoursUsed: input.hoursUsed,
      price: input.price,
      currency: input.currency,
      department: input.department,
      locality: input.locality,
      description: input.description,
      slug: input.slug,
    });
    if (!result.ok) return { ok: false, error: "Datos inválidos." };
  }

  revalidatePath("/admin", "layout");
  return { ok: true, message: "Aviso creado como borrador. Publicalo desde la lista." };
}

export async function changeStatus(
  kind: string,
  id: string,
  status: string,
): Promise<AdminActionState> {
  if (!(await requireAuth())) return { ok: false, error: "No autorizado." };
  if (!isContentKind(kind) || !isPropertyStatusCode(status) || typeof id !== "string") {
    return { ok: false, error: "Parámetros inválidos." };
  }

  if (kind === "campos") {
    const property = await container.repos.property.findById(id);
    if (!property) return { ok: false, error: "No encontrado." };
    const result = await container.useCases.changePropertyStatus(property, status);
    if (!result.ok) {
      return {
        ok: false,
        error:
          "No se puede publicar: faltan datos obligatorios (nombre, superficie, precio o foto).",
      };
    }
  } else if (kind === "remates") {
    const auction = await container.repos.auction.findById(id);
    if (!auction) return { ok: false, error: "No encontrado." };
    const result = await container.useCases.changeAuctionStatus(auction, status);
    if (!result.ok) {
      return { ok: false, error: "No se puede publicar: faltan datos o la fecha es inválida." };
    }
  } else {
    const item = await container.repos.machinery.findById(id);
    if (!item) return { ok: false, error: "No encontrado." };
    const result = await container.useCases.changeMachineryStatus(item, status);
    if (!result.ok) {
      return { ok: false, error: "No se puede publicar: faltan datos obligatorios." };
    }
  }

  revalidatePath("/admin", "layout");
  return { ok: true, message: "Estado actualizado." };
}

export async function deleteContent(kind: string, id: string): Promise<AdminActionState> {
  if (!(await requireAuth())) return { ok: false, error: "No autorizado." };
  if (!isContentKind(kind) || typeof id !== "string") {
    return { ok: false, error: "Parámetros inválidos." };
  }

  const deleted =
    kind === "campos"
      ? await container.repos.property.deleteById(id)
      : kind === "remates"
        ? await container.repos.auction.deleteById(id)
        : await container.repos.machinery.deleteById(id);

  if (!deleted) return { ok: false, error: "No encontrado." };

  revalidatePath("/admin", "layout");
  return { ok: true, message: "Aviso eliminado." };
}

/**
 * Estado de una consulta del formulario de contacto (panel admin).
 * Cambios: nuevo → respondido / archivado (y vuelta atrás si hace falta).
 */
export async function changeInquiryStatus(id: string, status: string): Promise<AdminActionState> {
  if (!(await requireAuth())) return { ok: false, error: "No autorizado." };

  const result = await container.useCases.updateInquiryStatus(id, status);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error === "not_found" ? "No encontrada." : "Estado inválido.",
    };
  }

  revalidatePath("/admin", "layout");
  return { ok: true, message: "Estado actualizado." };
}

/**
 * Adjunta al aviso una imagen ya subida (la subida física la hizo
 * `POST /api/admin/images/upload`, que NO toca el estado en memoria).
 *
 * Corre como server action para mutar el estado en el mismo bundle que la
 * página `/admin` (consistencia en modo sin BD) y re-valida la sesión.
 * El `storagePath` se re-valida: debe pertenecer exactamente a este kind e
 * id y terminar en extensión permitida; el nombre y ruta no vienen libres
 * del cliente por más que pasen por el form.
 */
export async function attachContentImage(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await requireAuth())) return { ok: false, error: "No autorizado." };

  const kind = formData.get("kind");
  const id = formData.get("id");
  const storagePath = formData.get("storagePath");
  if (!isContentKind(kind) || typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Parámetros inválidos." };
  }
  if (typeof storagePath !== "string") {
    return { ok: false, error: "Imagen inválida." };
  }
  if (!isTrustedStoragePath(kind, id, storagePath)) {
    return { ok: false, error: "Imagen inválida." };
  }

  // La URL NO viene del cliente: se deriva del storagePath ya validado, así
  // no se puede inyectar una URL externa en las fichas públicas (H7).
  const url = container.storage.images.getPublicUrl(storagePath);
  const imageId = container.system.ids.newId();

  let updated: unknown = null;
  let title = "Aviso";

  if (kind === "campos") {
    const property = await container.repos.property.findById(id);
    if (!property) return { ok: false, error: "No encontrado." };
    title = property.name;
    const image = contentImageFromUpload({
      id: imageId,
      uploaded: { path: storagePath, publicUrl: url },
      altText: title,
      sortOrder: property.images.length + 1,
      isMain: property.images.length === 0,
    });
    updated = await container.repos.property.update(
      property.withImages([...property.images, image]),
    );
  } else if (kind === "remates") {
    const auction = await container.repos.auction.findById(id);
    if (!auction) return { ok: false, error: "No encontrado." };
    title = auction.title;
    const image = contentImageFromUpload({
      id: imageId,
      uploaded: { path: storagePath, publicUrl: url },
      altText: title,
      sortOrder: auction.images.length + 1,
      isMain: auction.images.length === 0,
    });
    updated = await container.repos.auction.update(auction.withImages([...auction.images, image]));
  } else {
    const item = await container.repos.machinery.findById(id);
    if (!item) return { ok: false, error: "No encontrado." };
    title = item.title;
    const image = contentImageFromUpload({
      id: imageId,
      uploaded: { path: storagePath, publicUrl: url },
      altText: title,
      sortOrder: item.images.length + 1,
      isMain: item.images.length === 0,
    });
    updated = await container.repos.machinery.update(item.withImages([...item.images, image]));
  }

  if (updated === null) return { ok: false, error: "No se pudo guardar." };

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  revalidatePath(`/${kind}`);
  return { ok: true, message: "Foto agregada." };
}

/**
 * Quita una foto del aviso y borra el archivo físico del storage.
 * La última foto de un aviso publicado no se puede quitar (un aviso público
 * necesita al menos una foto, regla de dominio `canPublish`).
 */
export async function deleteContentImage(
  kind: string,
  id: string,
  imageId: string,
): Promise<AdminActionState> {
  if (!(await requireAuth())) return { ok: false, error: "No autorizado." };
  if (!isContentKind(kind) || typeof id !== "string" || typeof imageId !== "string") {
    return { ok: false, error: "Parámetros inválidos." };
  }

  let storagePath: string | null = null;

  if (kind === "campos") {
    const property = await container.repos.property.findById(id);
    if (!property) return { ok: false, error: "No encontrado." };
    const image = property.images.find((candidate) => candidate.id === imageId);
    if (!image) return { ok: false, error: "Foto no encontrada." };

    const next = property.withImages(removeContentImage(property.images, imageId));
    if (property.status === "publicado" && !next.canPublish()) {
      return { ok: false, error: "No se puede eliminar la única foto de un aviso publicado." };
    }
    storagePath = image.storagePath;
    await container.repos.property.update(next);
  } else if (kind === "remates") {
    const auction = await container.repos.auction.findById(id);
    if (!auction) return { ok: false, error: "No encontrado." };
    const image = auction.images.find((candidate) => candidate.id === imageId);
    if (!image) return { ok: false, error: "Foto no encontrada." };

    const next = auction.withImages(removeContentImage(auction.images, imageId));
    if (auction.status === "publicado" && !next.canPublish()) {
      return { ok: false, error: "No se puede eliminar la única foto de un aviso publicado." };
    }
    storagePath = image.storagePath;
    await container.repos.auction.update(next);
  } else {
    const item = await container.repos.machinery.findById(id);
    if (!item) return { ok: false, error: "No encontrado." };
    const image = item.images.find((candidate) => candidate.id === imageId);
    if (!image) return { ok: false, error: "Foto no encontrada." };

    const next = item.withImages(removeContentImage(item.images, imageId));
    if (item.status === "publicado" && !next.canPublish()) {
      return { ok: false, error: "No se puede eliminar la única foto de un aviso publicado." };
    }
    storagePath = image.storagePath;
    await container.repos.machinery.update(next);
  }

  if (storagePath) {
    try {
      await container.storage.images.remove([storagePath]);
    } catch {
      console.error(`[admin] no se pudo borrar el archivo ${storagePath} del storage`);
    }
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  revalidatePath(`/${kind}`);
  return { ok: true, message: "Foto eliminada." };
}
