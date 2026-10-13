import { AUCTION_EVENT_STATUS_LABELS } from "@/domain/enums/auction-event-status";
import { PROPERTY_STATUS_CODES } from "@/domain/enums/property-status";
import { container } from "@/platform/container";
import { CreateContentForm } from "@/ui/features/admin/create-content-form";
import { AdminContentList } from "@/ui/features/admin/content-list";

export const metadata = { title: "Remates · Administración" };

const dateTime = new Intl.DateTimeFormat("es-UY", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminRematesPage() {
  const result = await container.useCases.searchAuctions({
    statuses: [...PROPERTY_STATUS_CODES],
    sort: "proximos",
    page: 1,
    pageSize: 100,
  });

  const rows = result.items.map((auction) => ({
    id: auction.id,
    title: auction.title,
    status: auction.status,
    meta: [
      AUCTION_EVENT_STATUS_LABELS[auction.eventStatus],
      dateTime.format(auction.scheduledAt),
      auction.location ?? "Sin lugar",
      auction.auctioneer ?? "Sin rematador",
      auction.minimumBid?.format() ?? "Sin base",
    ].filter(Boolean),
    photos: auction.images.map((image) => ({ id: image.id, url: image.url })),
  }));

  return (
    <div>
      <h1 className="font-display text-monte-950 text-3xl">Remates</h1>
      <p className="text-tinta-suave mt-2 max-w-prose">
        Agenda de remates ganaderos y rurales. Se crean como borrador y se publican por separado.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[22rem_1fr]">
        <section className="rounded-mas border-arena bg-blanco-roto h-fit border p-5">
          <CreateContentForm kind="remates" />
        </section>
        <section>
          <h2 className="font-display text-monte-950 mb-3 text-xl">
            Remates cargados ({rows.length})
          </h2>
          <AdminContentList kind="remates" rows={rows} />
        </section>
      </div>
    </div>
  );
}
