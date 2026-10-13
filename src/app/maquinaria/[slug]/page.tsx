import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { container } from "@/platform/container";
import { presentMachineryDetail } from "@/adapters/presentation/machinery-presenter";
import { MachineryDetailView } from "@/ui/features/machinery/machinery-detail-view";
import { JsonLd } from "@/ui/components/json-ld";
import { machineryJsonLd, breadcrumbJsonLd } from "@/adapters/presentation/seo-presenter";
import { siteUrl } from "@/infrastructure/config/env";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getMachinery(slug: string) {
  return container.useCases.getMachineryBySlug(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getMachinery(slug).catch(() => null);
  if (!item) return { title: "Aviso no encontrado" };

  const detail = presentMachineryDetail(item);
  const description =
    detail.description?.slice(0, 155) ??
    `${detail.lineup} · ${detail.categoryLabel}${detail.yearLabel ? ` ${detail.yearLabel}` : ""} · ${detail.locationLabel}.`;

  return {
    title: `${item.title} — Maquinaria`,
    description,
    alternates: { canonical: detail.href },
    openGraph: {
      title: item.title,
      description,
      type: "website",
      url: detail.href,
      images: item.mainImage ? [{ url: item.mainImage.url }] : undefined,
    },
  };
}

export default async function MachineryPage({ params }: Props) {
  const { slug } = await params;
  const item = await getMachinery(slug);

  if (!item) notFound();

  const fullUrl = `${siteUrl}${presentMachineryDetail(item).href}`;
  const detail = presentMachineryDetail(item);

  return (
    <div className="bg-crema pt-24 md:pt-28">
      <JsonLd data={machineryJsonLd(item, fullUrl)} />
      <JsonLd data={breadcrumbJsonLd(detail.breadcrumb, siteUrl)} />
      <MachineryDetailView item={detail} />
    </div>
  );
}
