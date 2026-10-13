import {
  inquiryFormSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/application/dtos/inquiry-schema";
import type { SubmitInquiry } from "@/application/use-cases/submit-inquiry";
import type { InquirySubject, InquiryValidationError } from "@/domain/entities/inquiry";
import type { RateLimiter } from "@/infrastructure/rate-limit";

/**
 * Controlador HTTP de la consulta de contacto (PLAN §8.7, §15).
 * Tres defensas antes de tocar el dominio: honeypot, rate limiting y
 * validación con Zod. No conoce Next: recibe body + IP y devuelve
 * status + body, así se testea sin framework.
 */
export interface InquiryControllerDeps {
  submit: SubmitInquiry;
  limiter: RateLimiter;
  newId: () => string;
  /** Verifica que el aviso consultado siga existiendo (si se indica uno). */
  subjectExists?: (subject: InquirySubject) => Promise<boolean>;
}

export interface InquiryRequest {
  body: unknown;
  ip: string;
}

export interface InquiryResponse {
  status: 201 | 400 | 422 | 429 | 500;
  body:
    | { ok: true }
    | { ok: false; error: string; fieldErrors?: FieldErrors; retryAfterSeconds?: number };
}

const DOMAIN_TO_FIELD: Record<InquiryValidationError, keyof FieldErrors> = {
  invalid_name: "name",
  invalid_email: "email",
  invalid_phone: "phone",
  invalid_message: "message",
  invalid_subject: "message",
};

export function createInquiryController({
  submit,
  limiter,
  newId,
  subjectExists,
}: InquiryControllerDeps) {
  return async ({ body, ip }: InquiryRequest): Promise<InquiryResponse> => {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return { status: 400, body: { ok: false, error: "invalid_body" } };
    }

    const raw = body as Record<string, unknown>;

    // Honeypot: los bots llenan el campo oculto. Se responde como si
    // hubiera salido bien para no delatar la trampa.
    const honeypot = typeof raw.website === "string" ? raw.website.trim() : "";
    if (honeypot.length > 0) return { status: 201, body: { ok: true } };

    const limit = limiter.check(ip);
    if (!limit.allowed) {
      return {
        status: 429,
        body: {
          ok: false,
          error: "rate_limited",
          retryAfterSeconds: limit.retryAfterSeconds,
        },
      };
    }

    const parsed = inquiryFormSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        status: 422,
        body: {
          ok: false,
          error: "validation",
          fieldErrors: toFieldErrors(parsed.error),
        },
      };
    }

    // Si la consulta apunta a un aviso, ese aviso debe seguir existiendo.
    // Evita el error opaco de la FK y le da al visitante una razón clara
    // cuando la ficha quedó abierta de un aviso ya borrado o reemplazado.
    const subject: InquirySubject = {
      type: parsed.data.subject.type,
      id: parsed.data.subject.id ?? null,
    };
    if (subject.id && subjectExists) {
      const exists = await subjectExists(subject);
      if (!exists) {
        return {
          status: 422,
          body: { ok: false, error: "invalid_subject" },
        };
      }
    }

    try {
      const result = await submit({
        id: newId(),
        subject,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || undefined,
        message: parsed.data.message,
      });

      if (!result.ok) {
        return {
          status: 422,
          body: {
            ok: false,
            error: result.error,
            fieldErrors: { [DOMAIN_TO_FIELD[result.error]]: "Revisá este campo" },
          },
        };
      }

      return { status: 201, body: { ok: true } };
    } catch (error) {
      // Nunca filtrar detalles de infraestructura al cliente; sí al servidor.
      console.error("[inquiries] falló el guardado:", error);
      return { status: 500, body: { ok: false, error: "server_error" } };
    }
  };
}
