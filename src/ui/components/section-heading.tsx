import type { ReactNode } from "react";

export interface SectionHeadingProps {
  /** Etiqueta editorial pequeña sobre el título. */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Acción alineada a la derecha (desktop). */
  action?: ReactNode;
  /** Tono: fondos oscuros usan texto claro. */
  tone?: "dark" | "light";
  className?: string;
}

/** Titular de sección: etiqueta + título serif + descripción opcional. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  tone = "light",
  className = "",
}: SectionHeadingProps) {
  const titleTone = tone === "dark" ? "text-crema-50" : "text-monte-950";
  const descTone = tone === "dark" ? "text-salvia-300" : "text-gris-calido-600";

  return (
    <div
      className={`mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between ${className}`}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className={`etiqueta mb-3 ${tone === "dark" ? "text-salvia" : ""}`}>{eyebrow}</p>
        ) : null}
        <h2 className={`text-titulo ${titleTone}`}>{title}</h2>
        {description ? (
          <p className={`mt-3 text-base leading-relaxed ${descTone}`}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
