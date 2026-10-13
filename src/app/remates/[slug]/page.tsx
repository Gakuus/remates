import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { container } from "@/platform/container";
import { presentAuctionDetail } from "@/adapters/presentation/auction-presenter";
import { AuctionDetailView } from "@/ui/features/auction/auction-detail-view";
import { JsonLd } from "@/ui/components/json-ld";
import { auctionJsonLd, breadcrumbJsonLd } from "@/adapters/presentation/seo-presenter";
import { siteUrl } from "@/infrastructure/config/env";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getAuction(slug: string) {
  return container.useCases.getAuctionBySlug(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const auction = await getAuction(slug).catch(() => null);
  if (!auction) return { title: "Remate no encontrado" };

  const detail = presentAuctionDetail(auction);
  const description =
    detail.description?.slice(0, 155) ??
    `Remate ${detail.eventStatusLabel} · ${detail.scheduledAt}${detail.locationLine ? ` en ${detail.locationLine}` : ""}.`;

  return {
    title: `${auction.title} — Remates`,
    description,
    alternates: { canonical: detail.href },
    openGraph: {
      title: auction.title,
      description,
      type: "website",
      url: detail.href,
      images: auction.mainImage ? [{ url: auction.mainImage.url }] : undefined,
    },
  };
}

export default async function AuctionPage({ params }: Props) {
  const { slug } = await params;
  const auction = await getAuction(slug);

  if (!auction) notFound();

  const fullUrl = `${siteUrl}${presentAuctionDetail(auction).href}`;
  const detail = presentAuctionDetail(auction);

  return (
    <div className="bg-crema pt-24 md:pt-28">
      <JsonLd data={auctionJsonLd(auction, fullUrl)} />
      <JsonLd data={breadcrumbJsonLd(detail.breadcrumb, siteUrl)} />
      <AuctionDetailView auction={detail} />
    </div>
  );
}
