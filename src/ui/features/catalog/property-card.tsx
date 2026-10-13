import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/ui/components/badge";
import type { PropertyCardModel, HighlightIcon } from "@/adapters/presentation/property-presenter";
import {
  IconArrowRight,
  IconBarn,
  IconForest,
  IconHouse,
  IconPhotos,
  IconPower,
  IconRoute,
  IconWater,
} from "@/ui/icons";

const ICONS: Record<
  HighlightIcon,
  (props: { size?: number; className?: string }) => React.JSX.Element
> = {
  house: IconHouse,
  water: IconWater,
  route: IconRoute,
  forest: IconForest,
  barn: IconBarn,
  power: IconPower,
};

const ICON_LABELS: Record<HighlightIcon, string> = {
  house: "Casa",
  water: "Agua",
  route: "Acceso por ruta",
  forest: "Monte",
  barn: "Galpón",
  power: "Electricidad",
};

/**
 * Tarjeta de campo (PLAN §6): genera interés y lleva a la ficha.
 * No muestra toda la información.
 */
export function PropertyCard({ property }: { property: PropertyCardModel }) {
  return (
    <article className="group rounded-mas border-arena/60 bg-crema-50 shadow-tarjeta hover:shadow-tarjeta-hover overflow-hidden border transition-shadow duration-300">
      <Link href={property.href} className="block focus-visible:outline-offset-4">
        <div className="bg-beige relative aspect-[4/3] overflow-hidden">
          {property.image ? (
            <Image
              src={property.image.url}
              alt={property.image.alt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="text-gris-calido-300 grid size-full place-items-center">
              <IconPhotos size={32} />
            </div>
          )}

          <div className="absolute top-3 left-3 flex gap-2">
            <Badge tone="accent">{property.typeLabel}</Badge>
            {property.statusLabel ? (
              <Badge tone={property.statusTone === "highlight" ? "highlight" : "neutral"}>
                {property.statusLabel}
              </Badge>
            ) : null}
          </div>

          {property.photoCount > 1 ? (
            <span className="bg-monte-950/70 text-crema-50 absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium">
              <IconPhotos size={13} />
              {property.photoCount}
            </span>
          ) : null}
        </div>

        <div className="p-5">
          <h3 className="font-display text-monte-950 text-lg leading-snug">{property.name}</h3>

          <p className="text-gris-calido-600 mt-1 text-sm">{property.locationLabel}</p>

          <div className="text-tinta-suave mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="tabular font-medium">{property.hectaresLabel}</span>
            <span className="text-arena-400">·</span>
            <span>{property.typeLabel}</span>
          </div>

          <p className="tabular text-precio text-monte mt-2 font-medium">{property.priceLabel}</p>

          {property.highlights.length > 0 ? (
            <ul className="border-arena/50 mt-3 flex flex-wrap gap-2 border-t pt-3">
              {property.highlights.map(({ code, icon }) => {
                const Icon = ICONS[icon];
                return (
                  <li
                    key={code}
                    title={ICON_LABELS[icon]}
                    className="bg-salvia-100 text-oliva-600 grid size-7 place-items-center rounded-full"
                  >
                    <Icon size={15} />
                  </li>
                );
              })}
            </ul>
          ) : null}

          <span className="text-oliva-600 group-hover:text-monte mt-4 inline-flex items-center gap-1.5 text-sm font-medium transition-colors">
            Ver campo
            <IconArrowRight size={15} />
          </span>
        </div>
      </Link>
    </article>
  );
}
