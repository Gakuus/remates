/**
 * Slug SEO-friendly de una propiedad: /campos/{departamento}/{slug}
 * (PLAN §13). Sin acentos ni caracteres especiales.
 */
export type SlugError = { ok: false; reason: "empty" | "too_long" };
export type SlugResult = { ok: true; value: string } | SlugError;

const MAX_LENGTH = 80;

/** Normaliza texto arbitrario a slug: "Estancia La Esperanza" → "estancia-la-esperanza". */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function createSlug(input: string): SlugResult {
  const slug = slugify(input);
  if (slug.length === 0) return { ok: false, reason: "empty" };
  if (slug.length > MAX_LENGTH) return { ok: false, reason: "too_long" };
  return { ok: true, value: slug };
}

/** Slug de departamento para URLs: "Treinta y Tres" → "treinta-y-tres". */
export function departmentSlug(department: string): string {
  return slugify(department);
}
