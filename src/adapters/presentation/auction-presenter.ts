import type { Auction } from "@/domain/entities/auction";
import { AUCTION_EVENT_STATUS_LABELS } from "@/domain/enums/auction-event-status";

/** Formato es-UY: "sáb 15 nov · 15:00". Usado en tarjetas y fichas. */
export function formatAuctionDate(date: Date, withWeekday = false): string {
  const label = new Intl.DateTimeFormat("es-UY", {
    weekday: withWeekday ? "short" : undefined,
    day: "numeric",
    month: "short",
  }).format(date);
  const time = new Intl.DateTimeFormat("es-UY", { hour: "2-digit", minute: "2-digit" }).format(
    date,
  );
  return `${label} · ${time}`;
}

export interface AuctionCardModel {
  href: string;
  title: string;
  eventLabel: string | null;
  eventTone: "highlight" | "neutral" | null;
  scheduledAt: string;
  scheduledAtIso: string;
  isUpcoming: boolean;
  location: string | null;
  auctioneer: string | null;
  minimumBidLabel: string | null;
  image: { url: string; alt: string } | null;
  photoCount: number;
}

/** View model de tarjeta de remate (PLAN Sprint 9). */
export function presentAuctionCard(auction: Auction): AuctionCardModel {
  const main = auction.mainImage;
  const evento = eventPresentation(auction);
  return {
    href: `/remates/${auction.slug}`,
    title: auction.title,
    eventLabel: evento.label,
    eventTone: evento.tone,
    scheduledAt: formatAuctionDate(auction.scheduledAt),
    scheduledAtIso: auction.scheduledAt.toISOString(),
    isUpcoming: auction.isUpcoming,
    location: auction.location,
    auctioneer: auction.auctioneer,
    minimumBidLabel: auction.minimumBid?.format() ?? null,
    image: main ? { url: main.url, alt: main.altText || auction.title } : null,
    photoCount: auction.images.length,
  };
}

function eventPresentation(auction: Auction): {
  label: string | null;
  tone: "highlight" | "neutral" | null;
} {
  if (auction.eventStatus !== "proximo") {
    return { label: AUCTION_EVENT_STATUS_LABELS[auction.eventStatus], tone: "neutral" };
  }
  if (auction.isFeatured) return { label: "Destacado", tone: "highlight" };
  return { label: null, tone: null };
}

export interface AuctionDetailModel extends AuctionCardModel {
  id: string;
  breadcrumb: Array<{ href: string; label: string }>;
  statusLabel: string;
  eventStatusLabel: string;
  minimumBidLabel: string | null;
  locationLine: string | null;
  auctioneerLine: string | null;
  description: string | null;
  gallery: Array<{ url: string; alt: string }>;
  lots: Array<{ lotNumber: number; title: string | null; minimumBidLabel: string | null }>;
}

/** View model de la ficha del remate. */
export function presentAuctionDetail(auction: Auction): AuctionDetailModel {
  const card = presentAuctionCard(auction);
  const location = auction.location?.trim() ?? null;
  const auctioneer = auction.auctioneer?.trim() ?? null;
  return {
    ...card,
    id: auction.id,
    breadcrumb: [
      { href: "/", label: "Inicio" },
      { href: "/remates", label: "Remates" },
      { href: card.href, label: auction.title },
    ],
    statusLabel: auction.isPublished ? "Publicado" : "No publicado",
    eventStatusLabel: AUCTION_EVENT_STATUS_LABELS[auction.eventStatus],
    minimumBidLabel: auction.minimumBid?.format() ?? null,
    locationLine: location,
    auctioneerLine: auctioneer,
    description: auction.description,
    gallery: auction.images.map((image) => ({
      url: image.url,
      alt: image.altText || auction.title,
    })),
    lots: auction.lots.map((lot) => ({
      lotNumber: lot.lotNumber,
      title: lot.title,
      minimumBidLabel: lot.minimumBid?.format() ?? null,
    })),
  };
}
