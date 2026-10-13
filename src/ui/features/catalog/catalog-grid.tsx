import type { ReactNode } from "react";
import { IconGavel, IconWrench } from "@/ui/icons";

/** Grilla de tarjetas compartida (campos, remates, maquinaria). */
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

/** Estado vacío para listados sin resultados. */
export function CatalogEmpty({
  kind,
  title,
  hint,
}: {
  kind: "auctions" | "machinery";
  title: string;
  hint?: string;
}) {
  const Icon = kind === "auctions" ? IconGavel : IconWrench;
  return (
    <div className="rounded-mas border-arena bg-crema-50 border border-dashed px-6 py-16 text-center">
      <Icon size={28} className="text-gris-calido-300 mx-auto" aria-hidden="true" />
      <p className="font-display text-monte-950 mt-4 text-xl">{title}</p>
      <p className="text-gris-calido-600 mt-2 text-sm">
        {hint ?? "Volvé a verlo más tarde: estamos agregando novedades."}
      </p>
    </div>
  );
}
