import type { AuctionEventStatusCode } from "@/domain/enums/auction-event-status";

/**
 * Reglas de publicación de remates (PLAN §11).
 * Fuente de verdad en el dominio; la BD puede reforzarlas con CHECK.
 */
export type AuctionPublishBlocker =
  | "missing_title"
  | "missing_slug"
  | "invalid_scheduled_at"
  | "canceled_event"
  | "missing_location"
  | "missing_auctioneer";

export interface AuctionPublishInput {
  title: string;
  slug: string;
  scheduledAt: Date;
  eventStatus: AuctionEventStatusCode;
  location: string | null;
  auctioneer: string | null;
  hasMainImage: boolean;
}

export function canPublishAuction(input: AuctionPublishInput): AuctionPublishBlocker[] {
  const blockers: AuctionPublishBlocker[] = [];

  if (input.title.trim().length === 0) blockers.push("missing_title");
  if (input.slug.trim().length === 0) blockers.push("missing_slug");
  if (!Number.isFinite(input.scheduledAt.getTime())) blockers.push("invalid_scheduled_at");
  if (input.eventStatus !== "proximo") blockers.push("canceled_event");
  if (!input.location?.trim()) blockers.push("missing_location");
  if (!input.auctioneer?.trim()) blockers.push("missing_auctioneer");

  return blockers;
}
