"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { changeInquiryStatus } from "@/platform/admin-actions";
import { Button } from "@/ui/components/button";
import type { InquiryStatus } from "@/domain/entities/inquiry";

interface InquiryStatusButtonProps {
  id: string;
  status: InquiryStatus;
  label: string;
  tone: "primary" | "secondary" | "ghost";
}

/**
 * Botón para marcar una consulta como respondida/archivada/nueva
 * desde el panel (PLAN §8.7, "inquiries visibles para admin").
 */
export function InquiryStatusButton({ id, status, label, tone }: InquiryStatusButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await changeInquiryStatus(id, status);
    if (!result.ok) setError(result.error ?? "No se pudo guardar el cambio.");
    else router.refresh();
    setPending(false);
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
      <Button variant={tone} size="sm" onClick={handleClick} disabled={pending}>
        {pending ? "Guardando…" : label}
      </Button>
    </span>
  );
}
