"use client";

import { useActionState, useRef, useState } from "react";

import type { ContentKind } from "@/application/dtos/admin-content";
import { attachContentImage, type AdminActionState } from "@/platform/admin-actions";
import { Button } from "@/ui/components/button";
import { RemoveImageButton } from "@/ui/features/admin/content-actions";
import type { AdminContentPhoto } from "@/ui/features/admin/content-list";
import { IconCheck, IconPhotos } from "@/ui/icons";

const INITIAL_STATE: AdminActionState = { ok: false };

interface ContentImageUploadProps {
  kind: ContentKind;
  id: string;
  /** Fotos adjuntadas al aviso (miniaturas con botón de quitar). */
  photos: AdminContentPhoto[];
  /** Título del aviso (sirve de texto alternativo). */
  name: string;
}

/**
 * Sube una foto desde la lista del panel (PLAN Sprint 10).
 *
 * Paso 1: escribe el archivo vía `POST /api/admin/images/upload` (validación
 * server-side de tipo/tamaño/firma; no toca el estado del catálogo).
 * Paso 2: adjunta la imagen al aviso con la server action `attachContentImage`
 * (mismo bundle que las páginas `/admin`, consistencia en modo sin BD).
 */
export function ContentImageUpload({ kind, id, photos, name }: ContentImageUploadProps) {
  const [state, formAction, pending] = useActionState(attachContentImage, INITIAL_STATE);
  const [uploading, setUploading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    setClientError(null);
    if (!file) return;
    if (file.size <= 0) {
      setClientError("Elegí una imagen.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setClientError("La imagen supera los 8 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      setClientError("Solo JPG, PNG, WEBP o AVIF.");
      return;
    }

    const uploadBody = new FormData();
    uploadBody.set("kind", kind);
    uploadBody.set("id", id);
    uploadBody.set("image", file);

    setUploading(true);
    try {
      const response = await fetch("/api/admin/images/upload", {
        method: "POST",
        body: uploadBody,
      });
      const data = (await response.json().catch(() => null)) as {
        uploaded?: { path?: string; publicUrl?: string };
      } | null;
      if (!response.ok || !data?.uploaded?.path || !data.uploaded.publicUrl) {
        const message =
          typeof data === "object" && data && "error" in data
            ? String((data as { error: string }).error)
            : "No se pudo subir la imagen.";
        setClientError(message);
        return;
      }

      const attachBody = new FormData();
      attachBody.set("kind", kind);
      attachBody.set("id", id);
      attachBody.set("storagePath", data.uploaded.path);
      attachBody.set("url", data.uploaded.publicUrl);
      formAction(attachBody);
    } catch {
      setClientError("No se pudo conectar. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || pending;
  const error = clientError ?? (state.ok === false && state.error ? state.error : null);
  const hasAnyPhoto = photos.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        aria-label="Elegir foto"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <Button
        type="button"
        variant={hasAnyPhoto ? "secondary" : "primary"}
        size="sm"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
      >
        {busy ? (
          "Subiendo…"
        ) : (
          <>
            <IconPhotos size={15} aria-hidden="true" />
            {hasAnyPhoto ? "Otra foto" : "Subir foto"}
          </>
        )}
      </Button>

      {photos.length > 0 ? (
        <div className="flex items-center gap-2">
          {photos.map((photo) => (
            <span key={photo.id} className="relative inline-flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={name}
                width={48}
                height={36}
                className="rounded-suave border-arena h-9 w-12 border object-cover"
              />
              <RemoveImageButton kind={kind} id={id} imageId={photo.id} />
            </span>
          ))}
        </div>
      ) : null}

      {error ? (
        <span className="text-xs text-red-700" role="alert">
          {error}
        </span>
      ) : null}

      {state.ok ? (
        <span className="text-monte-700 flex items-center gap-1 text-xs font-medium" role="status">
          <IconCheck size={12} aria-hidden="true" />
          Foto agregada
        </span>
      ) : null}
    </div>
  );
}
