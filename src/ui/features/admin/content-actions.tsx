"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ContentKind } from "@/application/dtos/admin-content";
import { changeStatus, deleteContent, deleteContentImage } from "@/platform/admin-actions";
import { Button } from "@/ui/components/button";
import { IconX } from "@/ui/icons";

interface ActionProps {
  kind: ContentKind;
  id: string;
  className?: string;
}

export function StatusActionButton({
  kind,
  id,
  status,
  label,
  tone,
  className = "",
}: ActionProps & { status: string; label: string; tone: "primary" | "secondary" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await changeStatus(kind, id, status);
    if (!result.ok) setError(result.error ?? "No se pudo guardar el cambio.");
    else router.refresh();
    setPending(false);
  }

  return (
    <span className={className}>
      {error ? <span className="mr-2 text-xs text-red-700">{error}</span> : null}
      <Button variant={tone} size="sm" onClick={handleClick} disabled={pending}>
        {pending ? "Guardando…" : label}
      </Button>
    </span>
  );
}

export function DeleteActionButton({ kind, id }: ActionProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm("¿Eliminar este aviso? No se puede deshacer.")) return;
    setPending(true);
    setError(null);
    const result = await deleteContent(kind, id);
    if (!result.ok) setError(result.error ?? "No se pudo eliminar.");
    else router.refresh();
    setPending(false);
  }

  return (
    <span>
      {error ? <span className="mr-2 text-xs text-red-700">{error}</span> : null}
      <Button variant="ghost" size="sm" onClick={handleClick} disabled={pending}>
        {pending ? "Eliminando…" : "Eliminar"}
      </Button>
    </span>
  );
}

interface RemoveImageButtonProps {
  kind: ContentKind;
  id: string;
  imageId: string;
}

/** Cruz de quitar una foto individual desde la miniatura del panel. */
export function RemoveImageButton({ kind, id, imageId }: RemoveImageButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm("¿Quitar esta foto?")) return;
    setPending(true);
    setError(null);
    const result = await deleteContentImage(kind, id, imageId);
    if (!result.ok) setError(result.error ?? "No se pudo quitar la foto.");
    else router.refresh();
    setPending(false);
  }

  return (
    <span>
      {error ? (
        <span
          className="bg-blanco-roto absolute top-full left-0 z-10 mt-1 w-44 px-1 text-xs text-red-700"
          role="alert"
        >
          {error}
        </span>
      ) : null}
      <button
        type="button"
        aria-label="Quitar foto"
        title="Quitar foto"
        disabled={pending}
        onClick={handleClick}
        className="bg-blanco-roto ring-arena-400 grid h-5 w-5 place-items-center rounded-full text-red-700 shadow-sm ring-1 hover:bg-red-50 disabled:opacity-50"
      >
        <IconX size={12} aria-hidden="true" />
      </button>
    </span>
  );
}
