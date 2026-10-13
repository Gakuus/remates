import type { ContentKind } from "@/application/dtos/admin-content";
import type { PropertyStatusCode } from "@/domain/enums/property-status";
import { PROPERTY_STATUS_LABELS } from "@/domain/enums/property-status";
import { Badge } from "@/ui/components/badge";
import { DeleteActionButton, StatusActionButton } from "@/ui/features/admin/content-actions";
import { ContentImageUpload } from "@/ui/features/admin/image-upload";

export interface AdminContentPhoto {
  id: string;
  url: string;
}

export interface AdminContentRow {
  id: string;
  title: string;
  status: PropertyStatusCode;
  meta: string[];
  /** Fotos adjuntadas al aviso, para mostrarlas con su botón de quitar. */
  photos: AdminContentPhoto[];
}

interface AdminContentListProps {
  kind: ContentKind;
  rows: AdminContentRow[];
}

/** Listado del panel: filas con estado, metadatos y acciones. */
export function AdminContentList({ kind, rows }: AdminContentListProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-mas border-arena bg-blanco-roto text-tinta-suave border p-6 text-center text-sm">
        Todavía no hay avisos cargados. Usá el formulario para crear el primero.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const published = row.status === "publicado";
        return (
          <li
            key={row.id}
            className="rounded-mas border-arena bg-blanco-roto flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-tinta font-medium">{row.title}</h3>
                <Badge tone={published ? "accent" : "neutral"}>
                  {PROPERTY_STATUS_LABELS[row.status]}
                </Badge>
              </div>
              {row.meta.length > 0 ? (
                <p className="text-gris-calido-600 mt-1 truncate text-sm">{row.meta.join(" · ")}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-2">
                <StatusActionButton
                  kind={kind}
                  id={row.id}
                  status={published ? "retirado" : "publicado"}
                  label={published ? "Despublicar" : "Publicar"}
                  tone={published ? "secondary" : "primary"}
                />
                <DeleteActionButton kind={kind} id={row.id} />
              </div>
              <ContentImageUpload kind={kind} id={row.id} name={row.title} photos={row.photos} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
