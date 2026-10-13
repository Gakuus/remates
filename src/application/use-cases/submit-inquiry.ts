import type {
  InquiryRepository,
  InquirySubmitter,
  SubmitInquiryInput,
} from "@/application/ports/inquiry-repository";
import type { InquiryResult } from "@/domain/entities/inquiry";
import { createInquiry } from "@/domain/entities/inquiry";

export type SubmitInquiry = (input: SubmitInquiryInput) => Promise<InquiryResult>;

/**
 * Recibir consultas (PLAN §2, §8).
 * Valida en el dominio y delega la persistencia en el puerto.
 */
export function createSubmitInquiry(repo: InquiryRepository): SubmitInquiry {
  return async (input) => {
    const result = createInquiry(input);
    if (!result.ok) return result;
    await repo.save(result.value);
    return result;
  };
}

/** Variante cuando ya hay un submitter inyectado (adapters/http). */
export function wrapSubmitInquiry(submitter: InquirySubmitter): SubmitInquiry {
  return (input) => submitter.submit(input);
}
