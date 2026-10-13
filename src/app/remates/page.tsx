import type { Metadata } from "next";
import { container } from "@/platform/container";
import { presentAuctionCard } from "@/adapters/presentation/auction-presenter";
import {
  AUCTION_EVENT_STATUSES,
  AUCTION_EVENT_STATUS_LABELS,
} from "@/domain/enums/auction-event-status";
import { URUGUAY_DEPARTMENTS } from "@/domain/enums/department";
import { CardGrid, CatalogEmpty } from "@/ui/features/catalog/catalog-grid";
import { CatalogBar, type CatalogField } from "@/ui/features/catalog/catalog-bar";
import { AuctionCard } from "@/ui/features/catalog/auction-card";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface Props {
  searchParams: SearchParams;
}

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { estado, depto } = await parseParams(searchParams);
  let title = "Remates próximos";
  if (estado) title = AUCTION_EVENT_STATUS_LABELS[estado];
  if (depto) title = `${title} en ${depto}`;

  return {
    title,
    description:
      "Remates ganaderos y rurales en Uruguay: fecha y hora, lugar, rematador y base mínima por lote. Agendate los próximos en el campo uruguayo.",
    alternates: { canonical: "/remates" },
  };
}

async function parseParams(searchParams: SearchParams): Promise<{
  estado: (typeof AUCTION_EVENT_STATUSES)[number] | null;
  depto: string | null;
  orden: "proximos" | "recientes";
  page: number;
}> {
  const values = await searchParams;
  const estado = first(values.estado);
  const depto = first(values.depto);
  const orden = first(values.orden);
  const page = Number.parseInt(first(values.page), 10);

  return {
    estado: AUCTION_EVENT_STATUSES.includes(estado as (typeof AUCTION_EVENT_STATUSES)[number])
      ? (estado as (typeof AUCTION_EVENT_STATUSES)[number])
      : null,
    depto: depto || null,
    orden: orden === "recientes" ? "recientes" : "proximos",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export default async function AuctionsPage({ searchParams }: Props) {
  const { estado, depto, orden, page } = await parseParams(searchParams);

  let result: Awaited<ReturnType<typeof container.useCases.searchAuctions>> | null = null;
  let failure = false;
  try {
    result = await container.useCases.searchAuctions({
      eventStatus: estado,
      department: depto,
      sort: orden,
      page,
      pageSize: 12,
    });
  } catch {
    failure = true;
  }

  const items = result ? result.items.map(presentAuctionCard) : [];
  const count = result?.total ?? 0;

  const fields: CatalogField[] = [
    {
      key: "estado",
      label: "Todos los estados",
      options: AUCTION_EVENT_STATUSES.map((code) => ({
        value: code,
        label: AUCTION_EVENT_STATUS_LABELS[code],
      })),
    },
    {
      key: "depto",
      label: "Todos los departamentos",
      options: URUGUAY_DEPARTMENTS.map((d) => ({ value: d, label: d })),
    },
  ];

  const pageHref = (n: number) => {
    const next = new URLSearchParams();
    if (estado) next.set("estado", estado);
    if (depto) next.set("depto", depto);
    next.set("page", String(n));
    return `/remates?${next.toString()}`;
  };

  return (
    <div className="bg-crema pt-24 md:pt-28">
      <div className="contenedor pb-20">
        <header className="mb-8">
          <p className="etiqueta">Remates</p>
          <h1 className="text-titulo mt-2">
            {estado ? AUCTION_EVENT_STATUS_LABELS[estado] : "Remates próximos"}
            {depto ? <> en {depto}</> : null}
          </h1>
          <p className="text-gris-calido-600 mt-3 max-w-2xl">
            Fecha y hora, lugar, rematador y base mínima por lote. Seguí el calendario del campo.
          </p>
        </header>

        <div className="mb-8">
          <CatalogBar fields={fields} countLabel={count === 1 ? "1 remate" : `${count} remates`} />
        </div>

        {failure ? (
          <div className="rounded-mas border-arena bg-crema-50 border border-dashed px-6 py-16 text-center">
            <p className="font-display text-monte-950 text-xl">El calendario no está disponible</p>
            <p className="text-gris-calido-600 mt-2 text-sm">
              Revisá la configuración de la base de datos (<code>DATABASE_URL</code>).
            </p>
          </div>
        ) : items.length > 0 ? (
          <>
            <CardGrid>
              {items.map((auction) => (
                <AuctionCard key={auction.href} auction={auction} />
              ))}
            </CardGrid>
            {result && result.total > result.pageSize ? (
              <Pagination
                page={page}
                pageSize={result.pageSize}
                total={result.total}
                href={pageHref}
              />
            ) : null}
          </>
        ) : (
          <CatalogEmpty
            kind="auctions"
            title="No hay remates con esos filtros"
            hint="Probá cambiar el estado o el departamento."
          />
        )}
      </div>
    </div>
  );
}

function Pagination({
  page,
  pageSize,
  total,
  href,
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (n: number) => string;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  return (
    <nav aria-label="Paginación" className="mt-10 flex items-center justify-center gap-2">
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <a
          key={n}
          href={href(n)}
          aria-current={n === page ? "page" : undefined}
          className={`tabular rounded-suave grid size-10 place-items-center text-sm transition-colors ${
            n === page
              ? "bg-monte text-crema-50"
              : "border-arena text-tinta-suave hover:bg-salvia-100 border"
          }`}
        >
          {n}
        </a>
      ))}
    </nav>
  );
}
