/**
 * Sanitización de términos de búsqueda para los filtros `.or()` de Supabase.
 *
 * PostgREST arma `.or()` como un string con sintaxis propia
 * (`col.ilike.val,otracol.ilike.val`) en la que `,` separa predicados y `.`
 * el operador; `(`, `)`, `*`, `:`, `"` también tienen significado. Un
 * término de búsqueda del usuario no puede incluir esos caracteres o
 * inyectaría condiciones extra en el filtro (p. ej.
 * `q=x,name.eq.CampoPrivado`). Se reemplazan todos los caracteres
 * reservados del DSL por un espacio.
 */
const POSTGREST_RESERVED = /[,.;:<>="'()*[\]{}!|&$#@?%_]/g;

export function safePostgrestTerm(raw: string): string {
  return raw.replace(POSTGREST_RESERVED, " ");
}
