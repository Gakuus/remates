import { z } from "zod";
import { INQUIRY_LIMITS } from "@/domain/entities/inquiry";
import { isUyPhoneValid } from "@/application/dtos/uy-phone";

/**
 * Esquema compartido cliente/servidor de la consulta de contacto
 * (PLAN §8.7, §15 "Validación de formularios"): en cliente da UX, en el
 * servidor es la fuente de verdad.
 *
 * `website` es el honeypot: debe quedar vacío. Si se llena, es un bot.
 * `subject` es el contenido consultado (campo/remate/maquinaria); para
 * consultas generales se envía `{ type, id: null }`.
 */
export const inquiryFormSchema = z.object({
  subject: z.object({
    type: z.enum(["property", "auction", "machinery"]),
    id: z.string().uuid().nullish(),
  }),
  name: z.string().trim().min(1, "Ingresá tu nombre").max(INQUIRY_LIMITS.nameMax),
  email: z.email("Ingresá un email válido").max(INQUIRY_LIMITS.emailMax),
  phone: z
    .string()
    .trim()
    .max(INQUIRY_LIMITS.phoneMax, "Teléfono demasiado largo")
    .refine((value) => isUyPhoneValid(value), "Usá el formato uruguayo: 099 123 456")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(INQUIRY_LIMITS.messageMin, "Contanos un poco más (mínimo 10 caracteres)")
    .max(INQUIRY_LIMITS.messageMax, "El mensaje es demasiado largo"),
  website: z.string().optional(),
});

export type InquiryFormValues = z.infer<typeof inquiryFormSchema>;

/** Errores por campo, listos para renderizar en el formulario. */
export type FieldErrors = Partial<Record<"name" | "email" | "phone" | "message", string>>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key === "name" || key === "email" || key === "phone" || key === "message") {
      errors[key] ??= issue.message;
    }
  }
  return errors;
}

/** Plantilla sugerida del mensaje (PLAN §8.7). */
export function suggestedInquiryMessage(propertyName: string, locationLabel: string): string {
  return `Hola, me interesa ${propertyName} (${locationLabel}).`;
}
