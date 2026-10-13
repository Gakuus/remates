import Link from "next/link";
import { Badge } from "@/ui/components/badge";
import { IconCalendar, IconClock, IconGavel, IconPin, IconTag, IconUser } from "@/ui/icons";
import { PropertyGallery } from "@/ui/features/property/gallery";
import { InquiryForm } from "@/ui/features/property/inquiry-form";
import { suggestedInquiryMessage } from "@/application/dtos/inquiry-schema";
import type { AuctionDetailModel } from "@/adapters/presentation/auction-presenter";

/** Ficha del remate (PLAN Sprint 9): datos del evento + lotes + consulta. */
export function AuctionDetailView({ auction }: { auction: AuctionDetailModel }) {
  const hasDescription = Boolean(auction.description && auction.description.trim().length > 0);

  return (
    <div className="pb-24 md:pb-0">
      <div className="contenedor py-8 md:py-12">
        {/* Migas de pan */}
        <nav aria-label="Migas de pan" className="text-gris-calido-600 mb-6 text-sm">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {auction.breadcrumb.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {index === auction.breadcrumb.length - 1 ? (
                  <span aria-current="page" className="text-monte">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="hover:text-monte transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <PropertyGallery images={auction.gallery} name={auction.title} />

        <header className="mt-8 md:mt-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="accent">Remate</Badge>
            <Badge tone="neutral">{auction.eventStatusLabel}</Badge>
            {auction.isUpcoming ? <Badge tone="highlight">Próximo</Badge> : null}
          </div>

          <h1 className="text-titulo text-monte-950 max-w-3xl">{auction.title}</h1>

          <div className="border-arena mt-6 border-y py-5">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <IconCalendar size={20} className="text-oliva mt-0.5" aria-hidden="true" />
                <div>
                  <dt className="etiqueta">Fecha y hora</dt>
                  <dd className="font-display text-monte mt-0.5 text-xl font-semibold">
                    <time dateTime={auction.scheduledAtIso}>{auction.scheduledAt}</time>
                  </dd>
                </div>
              </div>

              {auction.minimumBidLabel ? (
                <div className="flex items-start gap-3">
                  <IconTag size={20} className="text-oliva mt-0.5" aria-hidden="true" />
                  <div>
                    <dt className="etiqueta">Base mínima</dt>
                    <dd className="tabular font-display text-monte mt-0.5 text-xl font-semibold">
                      {auction.minimumBidLabel}
                    </dd>
                  </div>
                </div>
              ) : null}

              {auction.locationLine ? (
                <div className="flex items-start gap-3">
                  <IconPin size={20} className="text-oliva mt-0.5" aria-hidden="true" />
                  <div>
                    <dt className="etiqueta">Lugar</dt>
                    <dd className="text-tinta mt-0.5 font-medium">
                      {auction.locationLine} · Uruguay
                    </dd>
                  </div>
                </div>
              ) : null}

              {auction.auctioneerLine ? (
                <div className="flex items-start gap-3">
                  <IconUser size={20} className="text-oliva mt-0.5" aria-hidden="true" />
                  <div>
                    <dt className="etiqueta">Rematador</dt>
                    <dd className="text-tinta mt-0.5 font-medium">{auction.auctioneerLine}</dd>
                  </div>
                </div>
              ) : null}
            </dl>
          </div>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {hasDescription ? (
              <section aria-labelledby="remate-descripcion" className="mb-12">
                <h2 id="remate-descripcion" className="font-display text-monte-950 mb-4 text-2xl">
                  Detalles del remate
                </h2>
                <p className="text-tinta-suave max-w-[68ch] text-lg leading-8 whitespace-pre-line">
                  {auction.description}
                </p>
              </section>
            ) : null}

            {auction.lots.length > 0 ? (
              <section aria-labelledby="remate-lotes" className="mb-12">
                <h2 id="remate-lotes" className="font-display text-monte-950 mb-5 text-2xl">
                  Lotes del remate
                </h2>
                <ol className="space-y-3">
                  {auction.lots.map((lot) => (
                    <li
                      key={lot.lotNumber}
                      className="rounded-mas border-arena bg-crema-50 flex flex-wrap items-center gap-x-4 gap-y-1 border p-5"
                    >
                      <IconGavel size={18} className="text-oliva shrink-0" aria-hidden="true" />
                      <span className="tabular text-gris-calido-600 text-sm">
                        Lote {lot.lotNumber}
                      </span>
                      <span className="text-tinta min-w-0 flex-1 font-medium">
                        {lot.title ?? `Lote ${lot.lotNumber}`}
                      </span>
                      {lot.minimumBidLabel ? (
                        <span className="tabular text-monte text-sm font-semibold">
                          {lot.minimumBidLabel}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-mas border-arena bg-crema-50 border p-6 shadow-none">
              <p className="etiqueta">Próximo remate</p>
              <p className="font-display text-monte text-2xl font-semibold">
                {auction.eventStatusLabel} · {auction.scheduledAt}
              </p>

              <dl className="border-arena mt-5 space-y-3 border-t pt-5 text-sm">
                {auction.locationLine ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-gris-calido-600">Lugar</dt>
                    <dd className="text-tinta text-right font-medium">{auction.locationLine}</dd>
                  </div>
                ) : null}
                {auction.auctioneerLine ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-gris-calido-600">Rematador</dt>
                    <dd className="text-tinta text-right font-medium">{auction.auctioneerLine}</dd>
                  </div>
                ) : null}
                {auction.minimumBidLabel ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-gris-calido-600">Base</dt>
                    <dd className="tabular text-monte font-semibold">{auction.minimumBidLabel}</dd>
                  </div>
                ) : null}
                <div className="text-gris-calido-600 flex items-center gap-2">
                  <IconClock size={15} aria-hidden="true" />
                  Próximo evento en el calendario
                </div>
              </dl>

              <a
                href="#consulta"
                className="rounded-suave bg-monte text-crema-50 hover:bg-monte-600 mt-6 inline-flex h-12 w-full items-center justify-center gap-2 px-6 text-sm font-semibold transition-colors"
              >
                Consultar por este remate
              </a>

              <p className="text-gris-calido-600 mt-4 text-center text-xs">
                Respondemos consultas sobre {auction.title} dentro de las 24 h hábiles.
              </p>
            </div>
          </aside>
        </div>

        <section
          id="consulta"
          aria-label="Consulta sobre este remate"
          className="border-arena mt-14 border-t pt-10"
        >
          <div className="rounded-mas border-arena bg-crema-50 border p-6 md:p-8">
            <InquiryForm
              subject={{ type: "auction", id: auction.id }}
              heading="Consultar por este remate"
              intro="Dejanos tus datos y te pasamos la planilla de lotes, las bases y el martillero a cargo."
              defaultMessage={suggestedInquiryMessage(
                auction.title,
                auction.locationLine ?? "Uruguay",
              )}
              ctaLabel="Enviar consulta"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
