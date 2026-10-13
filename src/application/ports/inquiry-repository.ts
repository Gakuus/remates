import type {
  InquiryProps,
  InquiryResult,
  InquiryStatus,
  InquirySubject,
} from "@/domain/entities/inquiry";

/**
 * Puerto de persistencia de consultas de contacto (PLAN §2, §8).
 * El rate limiting vive en el adaptador HTTP, no acá.
 */
export interface InquiryRepository {
  save(inquiry: InquiryProps): Promise<void>;
  /** Todas las consultas, de la más reciente a la más antigua (panel admin). */
  listInquiries(): Promise<InquiryProps[]>;
  /** Cambia el estado de una consulta. Devuelve false si no existe. */
  updateInquiryStatus(id: string, status: InquiryStatus): Promise<boolean>;
}

export interface SubmitInquiryInput {
  id: string;
  subject: InquirySubject;
  name: string;
  email: string;
  phone?: string;
  message: string;
}

/**
 * Puerto de envío de consultas: valida con el dominio y delega la
 * persistencia. Implementado por adaptadores/http (Server Action).
 */
export interface InquirySubmitter {
  submit(input: SubmitInquiryInput): Promise<InquiryResult>;
}
