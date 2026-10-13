import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/ui/components/badge";
import type { MachineryCardModel } from "@/adapters/presentation/machinery-presenter";
import { IconArrowRight, IconClock, IconPhotos, IconPin, IconWrench } from "@/ui/icons";

/**
 * Tarjeta de maquinaria (PLAN Sprint 9): categoría, línea (marca/modelo),
 * año, horas y precio, con CTA a la ficha.
 */
export function MachineryCard({ item }: { item: MachineryCardModel }) {
  return (
    <article className="group rounded-mas border-arena/60 bg-crema-50 shadow-tarjeta hover:shadow-tarjeta-hover overflow-hidden border transition-shadow duration-300">
      <Link href={item.href} className="block focus-visible:outline-offset-4">
        <div className="bg-beige relative aspect-[4/3] overflow-hidden">
          {item.image ? (
            <Image
              src={item.image.url}
              alt={item.image.alt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="text-gris-calido-300 grid size-full place-items-center">
              <IconWrench size={32} />
            </div>
          )}

          <div className="absolute top-3 left-3 flex gap-2">
            <Badge tone="accent">{item.categoryLabel}</Badge>
            {item.statusLabel ? (
              <Badge tone={item.statusTone === "highlight" ? "highlight" : "neutral"}>
                {item.statusLabel}
              </Badge>
            ) : null}
          </div>

          {item.photoCount > 1 ? (
            <span className="bg-monte-950/70 text-crema-50 absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium">
              <IconPhotos size={13} />
              {item.photoCount}
            </span>
          ) : null}
        </div>

        <div className="p-5">
          <h3 className="font-display text-monte-950 text-lg leading-snug">{item.title}</h3>

          <p className="text-gris-calido-600 mt-1 text-sm">{item.locationLabel}</p>

          <div className="text-tinta-suave mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {item.yearLabel ? <span className="tabular">{item.yearLabel}</span> : null}
            {item.yearLabel && item.hoursLabel ? <span className="text-arena-400">·</span> : null}
            {item.hoursLabel ? (
              <span className="tabular inline-flex items-center gap-1">
                <IconClock size={13} aria-hidden="true" />
                {item.hoursLabel}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <IconPin size={13} aria-hidden="true" />
              {item.locationLabel}
            </span>
          </div>

          <p className="tabular text-precio text-monte mt-2 font-medium">
            {item.priceLabel ?? "A consultar"}
          </p>

          <span className="text-oliva-600 group-hover:text-monte mt-4 inline-flex items-center gap-1.5 text-sm font-medium transition-colors">
            Ver maquinaria
            <IconArrowRight size={15} />
          </span>
        </div>
      </Link>
    </article>
  );
}
