"use client";

import { useState } from "react";
import {
  inquiryFormSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/application/dtos/inquiry-schema";
import { INQUIRY_LIMITS } from "@/domain/entities/inquiry";
import type { InquirySubject } from "@/domain/entities/inquiry";
import { formatUyPhone, UY_PHONE_MAX_LENGTH } from "@/application/dtos/uy-phone";
import { Input, Textarea } from "@/ui/components/field";
import { IconArrowRight, IconCheck } from "@/ui/icons";

type Status = "idle" | "sending" | "success";

interface InquiryFormProps {
  /** Contenido consultado (campo/remate/maquinaria); `id: null` para generales. */
  subject: InquirySubject;
  /** Título del bloque. */
  heading: string;
  /** Texto de apoyo opcional. */
  intro?: string;
  /** Mensaje pre-cargado (PLAN §8.7). */
  defaultMessage?: string;
  ctaLabel?: string;
}

const EMPTY = { name: "", email: "", phone: "", message: "", website: "" };

/**
 * Formulario de consulta (PLAN §8.7): validación Zod en cliente para UX,
 * y siempre en servidor vía POST /api/inquiries (fuente de verdad).
 */
export function InquiryForm({
  subject,
  heading,
  intro,
  defaultMessage = "",
  ctaLabel = "Enviar consulta",
}: InquiryFormProps) {
  const [values, setValues] = useState({ ...EMPTY, message: defaultMessage });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  const setField =
    (field: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = field === "phone" ? formatUyPhone(event.target.value) : event.target.value;
      setValues((v) => ({ ...v, [field]: value }));
      setErrors((e) => ({ ...e, [field]: undefined }));
    };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = inquiryFormSchema.safeParse({ ...values, subject });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data: unknown = await response.json().catch(() => null);

      if (response.ok) {
        setStatus("success");
        return;
      }

      setStatus("idle");
      const payload = (data ?? {}) as {
        error?: string;
        fieldErrors?: FieldErrors;
        retryAfterSeconds?: number;
      };

      if (response.status === 422 && payload.fieldErrors) {
        setErrors(payload.fieldErrors);
      } else if (response.status === 422 && payload.error === "invalid_subject") {
        setFormError(
          "Ups, ese aviso ya no está disponible (fue retirado o vendido). Probá con otro de la lista.",
        );
      } else if (response.status === 429) {
        const minutes = Math.max(1, Math.ceil((payload.retryAfterSeconds ?? 60) / 60));
        setFormError(`Hiciste varias consultas seguidas. Probá de nuevo en ${minutes} min.`);
      } else {
        setFormError("No pudimos enviar la consulta. Probá de nuevo en unos minutos.");
      }
    } catch {
      setStatus("idle");
      setFormError("No pudimos enviar la consulta. Revisá tu conexión y probá de nuevo.");
    }
  }

  if (status === "success") {
    return (
      <div
        className="rounded-mas border-monte/30 bg-salvia-100 border p-6"
        role="status"
        aria-live="polite"
      >
        <p className="font-display text-monte-950 flex items-center gap-2 text-xl">
          <IconCheck size={20} className="text-monte" aria-hidden="true" />
          Recibimos tu consulta
        </p>
        <p className="text-tinta-suave mt-2 max-w-prose leading-relaxed">
          Te respondemos a la brevedad con toda la información que necesitás. Si preferís
          adelantarte, escribinos por WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h2 className="font-display text-monte-950 text-2xl">{heading}</h2>
        {intro ? <p className="text-gris-calido-600 mt-2 max-w-prose">{intro}</p> : null}
      </div>

      {formError ? (
        <p role="alert" className="rounded-suave bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Nombre"
          name="name"
          required
          autoComplete="name"
          maxLength={INQUIRY_LIMITS.nameMax}
          value={values.name}
          onChange={setField("name")}
          error={errors.name}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={INQUIRY_LIMITS.emailMax}
          value={values.email}
          onChange={setField("email")}
          error={errors.email}
        />
      </div>

      <Input
        label="Teléfono (opcional)"
        name="phone"
        type="tel"
        autoComplete="tel"
        inputMode="numeric"
        maxLength={UY_PHONE_MAX_LENGTH}
        placeholder="099 123 456"
        hint="Formato uruguayo: 099 123 456"
        value={values.phone}
        onChange={setField("phone")}
        error={errors.phone}
      />

      <Textarea
        label="Mensaje"
        name="message"
        required
        maxLength={INQUIRY_LIMITS.messageMax}
        value={values.message}
        onChange={setField("message")}
        error={errors.message}
        placeholder="Contanos qué te interesa..."
      />

      {/* Honeypot anti-bot (PLAN §15): oculto, los bots lo completan. */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website">No completar este campo</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={setField("website")}
        />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-suave bg-monte text-crema-50 hover:bg-monte-600 inline-flex h-12 w-full items-center justify-center gap-2 px-6 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === "sending" ? "Enviando..." : ctaLabel}
        {status === "sending" ? null : <IconArrowRight size={16} aria-hidden="true" />}
      </button>
    </form>
  );
}
