import type { ReactNode } from "react";

export interface SectionProps {
  children: ReactNode;
  /** Tono de fondo de la sección. */
  tone?: "crema" | "beige" | "monte";
  /** Ancho del contenido: contenedor estándar o ancho completo. */
  width?: "container" | "full";
  className?: string;
  /** Elemento HTML raíz (section, article...). */
  as?: "section" | "div" | "article";
}

const tones = {
  crema: "bg-crema",
  beige: "bg-beige-200",
  monte: "bg-monte text-crema-50",
} as const;

const widths = {
  container: "contenedor",
  full: "",
} as const;

/**
 * Bloque de sección con ritmo editorial: espaciado vertical generoso,
 * fondo controlado y contenedor estándar.
 */
export function Section({
  children,
  tone = "crema",
  width = "container",
  className = "",
  as = "section",
}: SectionProps) {
  const Element = as;

  return (
    <Element className={`${tones[tone]} ${widths[width]} py-16 md:py-24 ${className}`}>
      {children}
    </Element>
  );
}
