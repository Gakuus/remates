import type { Metadata } from "next";
import { container } from "@/platform/container";
import { parseCatalogParams } from "@/adapters/http/search-params";
import { presentPropertyCard } from "@/adapters/presentation/property-presenter";
import { URUGUAY_DEPARTMENTS } from "@/domain/enums/department";
import { PROPERTY_TYPE_LABELS, PROPERTY_TYPE_CODES } from "@/domain/enums/property-type";
import { CatalogToolbar } from "@/ui/features/catalog/catalog-controls";
import { PropertyGrid } from "@/ui/features/catalog/property-grid";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface Props {
  searchParams: SearchParams;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { raw } = parseCatalogParams(await searchParams);
  const bits = ["Campos a la venta"];
  if (raw.depto) bits.push(`en ${raw.depto}`);
  if (raw.tipo) bits.push(`tipo ${raw.tipo}`);
  if (raw.haMin) bits.push(`desde ${raw.haMin} ha`);

  return {
    title: bits.join(" · "),
    description:
      "Explorá campos y terrenos rurales a la venta en Uruguay. Filtros por departamento, tipo, superficie y precio.",
    alternates: { canonical: "/campos" },
  };
}

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const { criteria, raw } = parseCatalogParams(params);

  let result: Awaited<ReturnType<typeof container.useCases.searchProperties>> | null = null;
  let failure = false;

  try {
    result = await container.useCases.searchProperties(criteria);
  } catch {
    failure = true;
  }

  const toolbarData = {
    departments: URUGUAY_DEPARTMENTS.map((d) => ({ value: d, label: d })),
    types: PROPERTY_TYPE_CODES.map((code) => ({
      value: code,
      label: PROPERTY_TYPE_LABELS[code],
    })),
    resultCount: result?.total ?? 0,
    sort: raw.orden,
  };

  const items = result ? result.items.map(presentPropertyCard) : [];

  return (
    <div className="bg-crema pt-24 md:pt-28">
      <div className="contenedor pb-20">
        <header className="mb-8">
          <p className="etiqueta">Catálogo</p>
          <h1 className="text-titulo mt-2">
            {raw.depto ? `Campos en ${raw.depto}` : "Campos a la venta"}
          </h1>
          <p className="text-gris-calido-600 mt-3 max-w-2xl">
            Propiedades rurales seleccionadas en todo el territorio uruguayo.
          </p>
        </header>

        <CatalogToolbar data={toolbarData} />

        <div className="mt-6">
          {failure ? (
            <div className="rounded-mas border-arena bg-crema-50 border border-dashed px-6 py-16 text-center">
              <p className="font-display text-monte-950 text-xl">El catálogo no está disponible</p>
              <p className="text-gris-calido-600 mt-2 text-sm">
                Revisá la configuración de la base de datos (<code>DATABASE_URL</code>).
              </p>
            </div>
          ) : (
            <PropertyGrid items={items} />
          )}

          {!failure && result && result.total > result.pageSize ? (
            <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  return (
    <nav aria-label="Paginación" className="mt-10 flex items-center justify-center gap-2">
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <a
          key={n}
          href={`/campos?page=${n}`}
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
