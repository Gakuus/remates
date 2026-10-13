export type InquiryStatus = "nuevo" | "respondido" | "archivado";
export type InquirySource = "web" | "whatsapp";

/** Tipo de contenido al que apunta la consulta (PLAN §11). */
export type InquirySubjectType = "property" | "auction" | "machinery";

export interface InquirySubject {
  type: InquirySubjectType;
  id: string | null;
}

export interface InquiryProps {
  id: string;
  subject: InquirySubject;
  name: string;
  phone?: string | null;
  email: string;
  message: string;
  status: InquiryStatus;
  source: InquirySource;
  createdAt: Date;
}

/** Entrada de `createInquiry`: con valores por defecto para status/source/createdAt. */
export type CreateInquiryInput = Omit<InquiryProps, "status" | "source" | "createdAt"> &
  Partial<Pick<InquiryProps, "status" | "source" | "createdAt">>;

/** Límites del formulario de contacto (PLAN §15). */
export const INQUIRY_LIMITS = {
  nameMax: 120,
  emailMax: 254,
  phoneMax: 40,
  messageMin: 10,
  messageMax: 2000,
} as const;

export type InquiryValidationError =
  "invalid_name" | "invalid_email" | "invalid_phone" | "invalid_message" | "invalid_subject";

export type InquiryResult =
  { ok: true; value: InquiryProps } | { ok: false; error: InquiryValidationError };

/**
 * Consulta de contacto (PLAN §2, §11 `inquiries`).
 * Sujeto polimórfico: un campo, un remate o una maquinaria. Validación
 * estricta antes de persistir.
 */
export function createInquiry(props: CreateInquiryInput): InquiryResult {
  const name = props.name.trim();
  const email = props.email.trim().toLowerCase();
  const message = props.message.trim();
  const phone = props.phone?.trim() ?? null;

  if (name.length === 0 || name.length > INQUIRY_LIMITS.nameMax) {
    return { ok: false, error: "invalid_name" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > INQUIRY_LIMITS.emailMax) {
    return { ok: false, error: "invalid_email" };
  }
  if (phone !== null && phone.length > INQUIRY_LIMITS.phoneMax) {
    return { ok: false, error: "invalid_phone" };
  }
  if (message.length < INQUIRY_LIMITS.messageMin || message.length > INQUIRY_LIMITS.messageMax) {
    return { ok: false, error: "invalid_message" };
  }
  if (
    props.subject.type !== "property" &&
    props.subject.type !== "auction" &&
    props.subject.type !== "machinery"
  ) {
    return { ok: false, error: "invalid_subject" };
  }

  return {
    ok: true,
    value: {
      id: props.id,
      subject: props.subject,
      name,
      phone,
      email,
      message,
      status: props.status ?? "nuevo",
      source: props.source ?? "web",
      createdAt: props.createdAt ?? new Date(),
    },
  };
}
