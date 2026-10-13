import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { container } from "@/platform/container";
import { presentPropertyCard } from "@/adapters/presentation/property-presenter";
import { presentPropertyDetail } from "@/adapters/presentation/property-detail-presenter";
import { suggestedInquiryMessage } from "@/application/dtos/inquiry-schema";
import { departmentSlug, createSlug } from "@/domain/value-objects/slug";
import { PropertyDetailView } from "@/ui/features/property/detail-view";
import { JsonLd } from "@/ui/components/json-ld";
import { breadcrumbJsonLd, propertyJsonLd } from "@/adapters/presentation/seo-presenter";
import { siteUrl } from "@/infrastructure/config/env";
import { PropertyGrid } from "@/ui/features/catalog/property-grid";
import { Section } from "@/ui/components/section";
import { SectionHeading } from "@/ui/components/section-heading";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ depto: string; slug: string }>;
}

async function getProperty(slug: string) {
  const safeSlug = createSlug(slug);
  if (!safeSlug.ok) return null;
  return container.useCases.getPropertyBySlug(safeSlug.value);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug).catch(() => null);
  if (!property) return { title: "Campo no encontrado" };

  const detail = presentPropertyDetail(property);
  const description = detail.description
    ? detail.description.slice(0, 155)
    : `${detail.hectaresLabel} en ${detail.locationLabel}. ${detail.priceLabel}.`;

  return {
    title: `${property.name} — ${detail.hectaresLabel} en ${detail.locationLabel}`,
    description,
    alternates: { canonical: detail.href },
    openGraph: {
      title: property.name,
      description,
      type: "article",
      url: detail.href,
      images: property.mainImage ? [{ url: property.mainImage.url }] : undefined,
    },
  };
}

export default async function PropertyPage({ params }: Props) {
  const { depto, slug } = await params;
  const property = await getProperty(slug);

  if (!property) notFound();

  // URL canónica: el departamento del path debe coincidir con el del campo.
  const canonical = `/campos/${departmentSlug(property.location.department)}/${property.slug}`;
  if (canonical !== `/campos/${depto}/${property.slug}`) redirect(canonical);

  const base = presentPropertyDetail(property);
  // Canal WhatsApp (PLAN §8.7): solo se muestra si está configurado.
  const whatsappUrl = container.channels.whatsapp.buildUrl({
    message: suggestedInquiryMessage(property.name, base.locationLabel),
  });
  const detail = { ...base, whatsappUrl };
  const similar = await container.useCases.getSimilarProperties(property, 3);
  const similarModels = similar.map(presentPropertyCard);

  return (
    <div className="bg-crema pt-24 md:pt-28">
      <JsonLd data={propertyJsonLd(property, `${siteUrl}${detail.href}`)} />
      <JsonLd data={breadcrumbJsonLd(detail.breadcrumb, siteUrl)} />
      <PropertyDetailView property={detail} />

      {similarModels.length > 0 ? (
        <Section tone="beige">
          <SectionHeading
            eyebrow="También te puede interesar"
            title="Campos similares"
            description={`Otras opciones publicadas en ${property.location.department}.`}
            action={
              <a
                href={`/campos?depto=${encodeURIComponent(property.location.department)}`}
                className="text-monte text-sm font-medium underline-offset-4 hover:underline"
              >
                Ver todos en {property.location.department}
              </a>
            }
          />
          <PropertyGrid items={similarModels} />
        </Section>
      ) : null}
    </div>
  );
}
