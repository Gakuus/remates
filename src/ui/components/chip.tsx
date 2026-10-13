import type { ReactNode } from "react";

export interface ChipProps {
  children: ReactNode;
  /** Muestra el botón de eliminar (filtro activo). */
  onRemove?: () => void;
  /** Renderiza como botón para aplicar un filtro/atajo rápido. */
  onClick?: () => void;
  className?: string;
}

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm " +
  "transition-colors duration-200";

const tone = "border-arena bg-crema-50 text-tinta-suave hover:border-salvia hover:bg-salvia-100";

/**
 * Chip de filtros / accesos rápidos. Con `onRemove` se vuelve removible
 * (× individual, docs/PLAN.md §7).
 */
export function Chip({ children, onRemove, onClick, className = "" }: ChipProps) {
  const Element = onClick ? "button" : "span";

  return (
    <Element
      className={`${base} ${tone} ${className}`}
      {...(onClick ? { type: "button" as const, onClick } : {})}
    >
      <span>{children}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label="Quitar filtro"
          onClick={onRemove}
          className="text-gris-calido hover:bg-arena/40 hover:text-tinta -mr-1 ml-0.5 grid size-5 place-items-center rounded-full"
        >
          <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
            <path
              d="M3 3l6 6M9 3l-6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </Element>
  );
}
