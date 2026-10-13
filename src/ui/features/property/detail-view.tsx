import Link from "next/link";
import type { PropertyDetailModel } from "@/adapters/presentation/property-detail-presenter";
import { Badge } from "@/ui/components/badge";
import { IconArea, IconArrowRight, IconCheck, IconPin } from "@/ui/icons";
import { PropertyGallery } from "./gallery";
import { InquiryForm } from "./inquiry-form";
import { suggestedInquiryMessage } from "@/application/dtos/inquiry-schema";
import type { HighlightIcon } from "@/adapters/presentation/property-presenter";

const ICONS: Record<HighlightIcon, typeof IconPin> = {
  house: IconPin,
  water: IconPin,
  route: IconPin,
  forest: IconPin,
  barn: IconPin,
  power: IconPin,
};

function FeatureIcon({ icon }: { icon: HighlightIcon }) {
  const Glyph = ICONS[icon];
  return <Glyph size={18} className="text-oliva" />;
}

interface DetailViewProps {
  property: PropertyDetailModel;
}

/**
 * Ficha de la propiedad (PLAN §8): landing page con el orden editorial
 * Galería → Información principal → Características → Descripción →
 * Información productiva → Ubicación → Contacto.
 */
export function PropertyDetailView({ property }: DetailViewProps) {
  const hasDescription = Boolean(property.description && property.description.trim().length > 0);

  return (
    <div className="pb-24 md:pb-0">
      <div className="contenedor py-8 md:py-12">
        {/* Migas de pan */}
        <nav aria-label="Migas de pan" className="text-gris-calido-600 mb-6 text-sm">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {property.breadcrumb.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {index === property.breadcrumb.length - 1 ? (
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

        {/* 8.1 Galería */}
        <PropertyGallery images={property.gallery} name={property.name} />

        {/* 8.2 Información principal */}
        <header className="mt-8 md:mt-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{property.typeLabel}</Badge>
            <Badge tone="neutral">{property.statusLabel}</Badge>
            {property.isFeatured ? <Badge tone="highlight">Destacado</Badge> : null}
          </div>

          <h1 className="text-titulo text-monte-950 max-w-3xl">{property.name}</h1>

          <p className="text-gris-calido-600 mt-3 flex items-center gap-2">
            <IconPin size={18} className="text-oliva" aria-hidden="true" />
            {property.locationLabel} · Uruguay
          </p>

          <div className="border-arena mt-6 flex flex-wrap items-end gap-x-8 gap-y-4 border-y py-5">
            <div>
              <p className="etiqueta">Precio</p>
              <p className="font-display text-monte text-3xl font-semibold md:text-4xl">
                {property.priceLabel}
              </p>
            </div>
            <div>
              <p className="etiqueta">Superficie</p>
              <p className="text-tinta tabular flex items-center gap-2 text-xl font-semibold">
                <IconArea size={18} className="text-oliva" aria-hidden="true" />
                {property.hectaresLabel}
              </p>
            </div>
          </div>
        </header>

        {/* Cuerpo: contenido + tarjeta de contacto */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {/* 8.4 Descripción */}
            {hasDescription ? (
              <section aria-labelledby="descripcion" className="mb-12">
                <h2 id="descripcion" className="font-display text-monte-950 mb-4 text-2xl">
                  Descripción
                </h2>
                <p className="text-tinta-suave max-w-[68ch] text-lg leading-8 whitespace-pre-line">
                  {property.description}
                </p>
              </section>
            ) : null}

            {/* 8.3 Características */}
            <section aria-labelledby="caracteristicas" className="mb-12">
              <h2 id="caracteristicas" className="font-display text-monte-950 mb-5 text-2xl">
                Características
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {property.featureGroups.map((group) => (
                  <div
                    key={group.title}
                    className="rounded-mas border-arena bg-crema-50 border p-5"
                  >
                    <h3 className="text-oliva-600 mb-4 text-sm font-semibold tracking-wide uppercase">
                      {group.title}
                    </h3>
                    <ul className="space-y-3">
                      {group.items.map((item) => (
                        <li key={item.label} className="text-tinta flex items-start gap-3">
                          <span className="bg-salvia-100 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                            {item.icon ? (
                              <FeatureIcon icon={item.icon} />
                            ) : (
                              <IconCheck size={16} className="text-monte" aria-hidden="true" />
                            )}
                          </span>
                          <span>
                            <span className="text-gris-calido-600">{item.label}: </span>
                            <span className="font-medium">{item.value}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* 8.5 Información productiva (solo si existe) */}
            {property.productiveInfo.length > 0 ? (
              <section aria-labelledby="productiva" className="mb-12">
                <h2 id="productiva" className="font-display text-monte-950 mb-5 text-2xl">
                  Información productiva
                </h2>
                <dl className="rounded-mas border-arena bg-arena grid gap-px overflow-hidden border sm:grid-cols-2">
                  {property.productiveInfo.map((entry) => (
                    <div key={entry.label} className="bg-crema-50 p-5">
                      <dt className="text-gris-calido-600 text-sm">{entry.label}</dt>
                      <dd className="text-tinta mt-1 font-medium">{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {/* 8.6 Ubicación */}
            <section aria-labelledby="ubicacion">
              <h2 id="ubicacion" className="font-display text-monte-950 mb-5 text-2xl">
                Ubicación y accesos
              </h2>
              <div className="rounded-mas border-arena bg-beige-200 border p-6">
                <p className="text-monte-950 flex items-center gap-2 font-medium">
                  <IconPin size={18} className="text-oliva" aria-hidden="true" />
                  {property.locationLabel} · Uruguay
                </p>
                {property.location.accessNotes ? (
                  <p className="text-tinta-suave mt-3 max-w-[68ch] leading-7">
                    {property.location.accessNotes}
                  </p>
                ) : null}
                {property.location.mapUrl ? (
                  <a
                    href={property.location.mapUrl}
                    className="text-monte mt-4 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Ver en el mapa
                    <IconArrowRight size={16} aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </section>
          </div>

          {/* Tarjeta de contacto (aside sticky en desktop) */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-mas border-arena bg-crema-50 border p-6 shadow-none">
              <p className="etiqueta">Precio</p>
              <p className="font-display text-monte text-3xl font-semibold">
                {property.priceLabel}
              </p>

              <dl className="border-arena mt-5 space-y-3 border-t pt-5 text-sm">
                {property.quickFacts.map((fact) => (
                  <div key={fact.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-gris-calido-600">{fact.label}</dt>
                    <dd className="text-tinta tabular font-medium">{fact.value}</dd>
                  </div>
                ))}
              </dl>

              <a
                href="#consulta"
                className="rounded-suave bg-monte text-crema-50 hover:bg-monte-600 mt-6 inline-flex h-12 w-full items-center justify-center gap-2 px-6 text-sm font-semibold transition-colors"
              >
                Consultar por este campo
                <IconArrowRight size={16} aria-hidden="true" />
              </a>

              {property.whatsappUrl ? (
                <a
                  href={property.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-monte/30 text-monte hover:bg-salvia-100 rounded-suave mt-3 inline-flex h-11 w-full items-center justify-center gap-2 border px-6 text-sm font-medium transition-colors"
                >
                  Escribir por WhatsApp
                </a>
              ) : null}

              <p className="text-gris-calido-600 mt-4 text-center text-xs">
                Respondemos consultas sobre {property.name} dentro de las 24 h hábiles.
              </p>
            </div>
          </aside>
        </div>

        {/* 8.7 Contacto */}
        <section
          id="consulta"
          aria-label="Consulta sobre este campo"
          className="border-arena mt-14 border-t pt-10"
        >
          <div className="rounded-mas border-arena bg-crema-50 border p-6 md:p-8">
            <InquiryForm
              subject={{ type: "property", id: property.id }}
              heading="Consultar por este campo"
              intro="Dejanos tus datos y te enviamos la información completa: título, planilla, fotos adicionales y coordinamos una visita."
              defaultMessage={suggestedInquiryMessage(property.name, property.locationLabel)}
              ctaLabel="Enviar consulta"
            />
          </div>
        </section>
      </div>

      {/* CTA sticky en mobile (PLAN §8.2) */}
      <div className="border-arena bg-blanco-roto/95 fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-gris-calido-600 truncate text-xs">{property.locationLabel}</p>
            <p className="font-display text-monte truncate text-lg font-semibold">
              {property.priceLabel}
            </p>
          </div>
          <a
            href="#consulta"
            className="rounded-suave bg-monte text-crema-50 hover:bg-monte-600 inline-flex h-11 shrink-0 items-center justify-center px-5 text-sm font-semibold transition-colors"
          >
            Consultar por este campo
          </a>
        </div>
      </div>
    </div>
  );
}
