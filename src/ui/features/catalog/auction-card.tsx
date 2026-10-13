import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/ui/components/badge";
import type { AuctionCardModel } from "@/adapters/presentation/auction-presenter";
import {
  IconArrowRight,
  IconCalendar,
  IconGavel,
  IconPhotos,
  IconPin,
  IconTag,
  IconUser,
} from "@/ui/icons";

/**
 * Tarjeta de remate (PLAN Sprint 9): fecha y hora, lugar, rematador y base,
 * con CTA a la ficha. No muestra toda la información.
 */
export function AuctionCard({ auction }: { auction: AuctionCardModel }) {
  return (
    <article className="group rounded-mas border-arena/60 bg-crema-50 shadow-tarjeta hover:shadow-tarjeta-hover overflow-hidden border transition-shadow duration-300">
      <Link href={auction.href} className="block focus-visible:outline-offset-4">
        <div className="bg-beige relative aspect-[4/3] overflow-hidden">
          {auction.image ? (
            <Image
              src={auction.image.url}
              alt={auction.image.alt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="text-gris-calido-300 grid size-full place-items-center">
              <IconGavel size={32} />
            </div>
          )}

          <div className="absolute top-3 left-3 flex gap-2">
            <Badge tone="accent">Remate</Badge>
            {auction.eventLabel ? (
              <Badge tone={auction.eventTone === "highlight" ? "highlight" : "neutral"}>
                {auction.eventLabel}
              </Badge>
            ) : null}
          </div>

          {auction.photoCount > 1 ? (
            <span className="bg-monte-950/70 text-crema-50 absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium">
              <IconPhotos size={13} />
              {auction.photoCount}
            </span>
          ) : null}
        </div>

        <div className="p-5">
          <h3 className="font-display text-monte-950 text-lg leading-snug">{auction.title}</h3>

          <ul className="text-tinta-suave mt-3 space-y-1.5 text-sm">
            <li className="text-monte flex items-center gap-2 font-medium">
              <IconCalendar size={15} className="text-oliva shrink-0" aria-hidden="true" />
              <time dateTime={auction.scheduledAtIso}>{auction.scheduledAt}</time>
            </li>
            {auction.location ? (
              <li className="flex items-center gap-2">
                <IconPin size={15} className="text-gris-calido shrink-0" aria-hidden="true" />
                {auction.location}
              </li>
            ) : null}
            {auction.auctioneer ? (
              <li className="flex items-center gap-2">
                <IconUser size={15} className="text-gris-calido shrink-0" aria-hidden="true" />
                {auction.auctioneer}
              </li>
            ) : null}
          </ul>

          {auction.minimumBidLabel ? (
            <p className="border-arena/50 mt-3 flex items-center gap-2 border-t pt-3 text-sm">
              <IconTag size={14} className="text-oliva" aria-hidden="true" />
              <span className="text-gris-calido-600">Base por lote</span>
              <span className="tabular text-monte ml-auto font-semibold">
                {auction.minimumBidLabel}
              </span>
            </p>
          ) : null}

          <span className="text-oliva-600 group-hover:text-monte mt-4 inline-flex items-center gap-1.5 text-sm font-medium transition-colors">
            Ver remate
            <IconArrowRight size={15} />
          </span>
        </div>
      </Link>
    </article>
  );
}
