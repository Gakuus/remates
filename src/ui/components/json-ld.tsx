import type { ReactNode } from "react";

/**
 * Bloque JSON-LD (PLAN §10 SEO, Sprint 6). Se serializa a JSON y se
 * escapan los `<` para que nadie cierre el script desde un dato guardado.
 */
export function JsonLd({ data }: { data: Record<string, unknown>; children?: ReactNode }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
