import type { InquiryRepository } from "@/application/ports/inquiry-repository";
import type { InquiryStatus } from "@/domain/entities/inquiry";

export type UpdateInquiryStatusResult =
  { ok: true } | { ok: false; error: "invalid_status" | "not_found" };

export type UpdateInquiryStatus = (
  id: string,
  status: unknown,
) => Promise<UpdateInquiryStatusResult>;

const VALID_STATUSES: ReadonlySet<string> = new Set(["nuevo", "respondido", "archivado"]);

/**
 * Cambiar el estado de una consulta desde el panel admin (PLAN §2, §8).
 * Valida la transición en el dominio; el único que pasa aquí es el admin.
 */
export function createUpdateInquiryStatus(repo: InquiryRepository): UpdateInquiryStatus {
  return async (id, status) => {
    if (typeof id !== "string" || id.length === 0) {
      return { ok: false, error: "invalid_status" };
    }
    if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
      return { ok: false, error: "invalid_status" };
    }

    const updated = await repo.updateInquiryStatus(id, status as InquiryStatus);
    if (!updated) return { ok: false, error: "not_found" };
    return { ok: true };
  };
}
