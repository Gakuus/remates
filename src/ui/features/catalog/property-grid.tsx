import { PropertyCard } from "@/ui/features/catalog/property-card";
import type { PropertyCardModel } from "@/adapters/presentation/property-presenter";

export function PropertyGrid({ items }: { items: PropertyCardModel[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-mas border-arena bg-crema-50 border border-dashed px-6 py-16 text-center">
        <p className="font-display text-monte-950 text-xl">
          No encontramos campos con esos filtros
        </p>
        <p className="text-gris-calido-600 mt-2 text-sm">
          Probá ampliar el rango de precio o de superficie.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <PropertyCard key={item.href} property={item} />
      ))}
    </div>
  );
}
