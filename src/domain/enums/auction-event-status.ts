/**
 * Estado del evento "remate" (PLAN §11 `auctions.event_status`).
 * Es distinto del ciclo de publicación (`PropertyStatusCode`): un remate
 * publicado puede ser `proximo`, `realizado` o `cancelado`.
 */
export const AUCTION_EVENT_STATUSES = ["proximo", "realizado", "cancelado"] as const;

export type AuctionEventStatusCode = (typeof AUCTION_EVENT_STATUSES)[number];

export function isAuctionEventStatusCode(value: string): value is AuctionEventStatusCode {
  return (AUCTION_EVENT_STATUSES as readonly string[]).includes(value);
}

export const AUCTION_EVENT_STATUS_LABELS: Record<AuctionEventStatusCode, string> = {
  proximo: "Próximo",
  realizado: "Realizado",
  cancelado: "Cancelado",
};
