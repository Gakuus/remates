import type { InquiryRepository } from "@/application/ports/inquiry-repository";
import type { InquiryProps } from "@/domain/entities/inquiry";

export type ListInquiries = () => Promise<InquiryProps[]>;

/**
 * Listar consultas para el panel admin (PLAN §2, §8).
 * La más reciente primero.
 */
export function createListInquiries(repo: InquiryRepository): ListInquiries {
  return () => repo.listInquiries();
}
