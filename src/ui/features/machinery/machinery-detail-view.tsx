import Link from "next/link";
import type { MachineryDetailModel } from "@/adapters/presentation/machinery-presenter";
import { Badge } from "@/ui/components/badge";
import { IconArrowRight, IconClock, IconPin } from "@/ui/icons";
import { PropertyGallery } from "@/ui/features/property/gallery";
import { InquiryForm } from "@/ui/features/property/inquiry-form";
import { suggestedInquiryMessage } from "@/application/dtos/inquiry-schema";

/** Ficha de maquinaria (PLAN Sprint 9): datos del equipo + consulta. */
export function MachineryDetailView({ item }: { item: MachineryDetailModel }) {
  const hasDescription = Boolean(item.description && item.description.trim().length > 0);

  return (
    <div className="pb-24 md:pb-0">
      <div className="contenedor py-8 md:py-12">
        <nav aria-label="Migas de pan" className="text-gris-calido-600 mb-6 text-sm">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {item.breadcrumb.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {index === item.breadcrumb.length - 1 ? (
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

        <PropertyGallery images={item.gallery} name={item.title} />

        <header className="mt-8 md:mt-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{item.categoryLabel}</Badge>
            <Badge tone="neutral">{item.statusLabel ?? item.lineup}</Badge>
          </div>

          <h1 className="text-titulo text-monte-950 max-w-3xl">{item.title}</h1>

          <p className="text-gris-calido-600 mt-3 flex items-center gap-2">
            <IconPin size={18} className="text-oliva" aria-hidden="true" />
            {item.locationLabel} · Uruguay
          </p>

          <div className="border-arena mt-6 flex flex-wrap items-end gap-x-8 gap-y-4 border-y py-5">
            <div>
              <p className="etiqueta">Precio</p>
              <p className="font-display text-monte text-3xl font-semibold md:text-4xl">
                {item.priceLabel ?? "A consultar"}
              </p>
            </div>
            {item.yearLabel ? (
              <div>
                <p className="etiqueta">Año</p>
                <p className="text-tinta tabular text-xl font-semibold">{item.yearLabel}</p>
              </div>
            ) : null}
            {item.hoursLabel ? (
              <div>
                <p className="etiqueta">Horas de uso</p>
                <p className="text-tinta tabular flex items-center gap-2 text-xl font-semibold">
                  <IconClock size={18} className="text-oliva" aria-hidden="true" />
                  {item.hoursLabel}
                </p>
              </div>
            ) : null}
          </div>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {hasDescription ? (
              <section aria-labelledby="mach-descripcion" className="mb-12">
                <h2 id="mach-descripcion" className="font-display text-monte-950 mb-4 text-2xl">
                  Descripción
                </h2>
                <p className="text-tinta-suave max-w-[68ch] text-lg leading-8 whitespace-pre-line">
                  {item.description}
                </p>
              </section>
            ) : null}

            <section aria-labelledby="mach-datos" className="mb-12">
              <h2 id="mach-datos" className="font-display text-monte-950 mb-5 text-2xl">
                Ficha técnica
              </h2>
              <dl className="rounded-mas border-arena bg-arena grid gap-px overflow-hidden border sm:grid-cols-2">
                {item.quickFacts.map((fact) => (
                  <div key={fact.label} className="bg-crema-50 p-5">
                    <dt className="text-gris-calido-600 text-sm">{fact.label}</dt>
                    <dd className="text-tinta mt-1 font-medium">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-mas border-arena bg-crema-50 border p-6 shadow-none">
              <p className="etiqueta">Precio</p>
              <p className="font-display text-monte text-3xl font-semibold">
                {item.priceLabel ?? "A consultar"}
              </p>

              <dl className="border-arena mt-5 space-y-3 border-t pt-5 text-sm">
                {item.quickFacts.map((fact) => (
                  <div key={fact.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-gris-calido-600">{fact.label}</dt>
                    <dd className="text-tinta tabular text-right font-medium">{fact.value}</dd>
                  </div>
                ))}
              </dl>

              <a
                href="#consulta"
                className="rounded-suave bg-monte text-crema-50 hover:bg-monte-600 mt-6 inline-flex h-12 w-full items-center justify-center gap-2 px-6 text-sm font-semibold transition-colors"
              >
                Consultar por esta máquina
                <IconArrowRight size={16} aria-hidden="true" />
              </a>

              <p className="text-gris-calido-600 mt-4 text-center text-xs">
                Respondemos consultas sobre {item.title} dentro de las 24 h hábiles.
              </p>
            </div>
          </aside>
        </div>

        <section
          id="consulta"
          aria-label="Consulta sobre esta maquinaria"
          className="border-arena mt-14 border-t pt-10"
        >
          <div className="rounded-mas border-arena bg-crema-50 border p-6 md:p-8">
            <InquiryForm
              subject={{ type: "machinery", id: item.id }}
              heading="Consultar por esta maquinaria"
              intro="Dejanos tus datos y te enviamos más fotos, estado de mantenimiento y coordinamos una prueba."
              defaultMessage={suggestedInquiryMessage(item.title, item.locationLabel)}
              ctaLabel="Enviar consulta"
            />
          </div>
        </section>
      </div>

      {/* CTA sticky en mobile */}
      <div className="border-arena bg-blanco-roto/95 fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-gris-calido-600 truncate text-xs">{item.locationLabel}</p>
            <p className="font-display text-monte truncate text-lg font-semibold">
              {item.priceLabel ?? "A consultar"}
            </p>
          </div>
          <a
            href="#consulta"
            className="rounded-suave bg-monte text-crema-50 hover:bg-monte-600 inline-flex h-11 shrink-0 items-center justify-center px-5 text-sm font-semibold transition-colors"
          >
            Consultar por esta máquina
          </a>
        </div>
      </div>
    </div>
  );
}
