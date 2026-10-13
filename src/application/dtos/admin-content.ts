/**
 * Tipos de contenido gestionados en el panel de administración (PLAN Sprint 10).
 * Vive en application porque lo usan la API, el dominio de la UI del panel.
 */
export const CONTENT_KINDS = ["campos", "remates", "maquinaria"] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number];

export function isContentKind(value: unknown): value is ContentKind {
  return typeof value === "string" && (CONTENT_KINDS as readonly string[]).includes(value);
}
