import type { Metadata } from "next";
import { container } from "@/platform/container";
import { presentMachineryCard } from "@/adapters/presentation/machinery-presenter";
import {
  MACHINERY_CATEGORY_CODES,
  MACHINERY_CATEGORY_LABELS,
} from "@/domain/enums/machinery-category";
import { URUGUAY_DEPARTMENTS } from "@/domain/enums/department";
import { CardGrid, CatalogEmpty } from "@/ui/features/catalog/catalog-grid";
import { CatalogBar, type CatalogField } from "@/ui/features/catalog/catalog-bar";
import { MachineryCard } from "@/ui/features/catalog/machinery-card";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface Props {
  searchParams: SearchParams;
}

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { categoria, depto } = await parseParams(searchParams);
  let title = "Maquinaria a la venta";
  if (categoria) title = MACHINERY_CATEGORY_LABELS[categoria];
  if (depto) title = `${title} en ${depto}`;

  return {
    title,
    description:
      "Tractores, cosechadoras, sembradoras y más maquinaria agrícola a la venta en Uruguay. Filtros por categoría, marca y departamento.",
    alternates: { canonical: "/maquinaria" },
  };
}

async function parseParams(searchParams: SearchParams) {
  const values = await searchParams;
  const categoria = first(values.categoria);
  const marca = first(values.marca);
  const depto = first(values.depto);
  const orden = first(values.orden);
  const page = Number.parseInt(first(values.page), 10);

  const sort: "recientes" | "precio_asc" | "precio_desc" =
    orden === "precio_asc" || orden === "precio_desc" ? orden : "recientes";

  return {
    categoria: MACHINERY_CATEGORY_CODES.includes(
      categoria as (typeof MACHINERY_CATEGORY_CODES)[number],
    )
      ? (categoria as (typeof MACHINERY_CATEGORY_CODES)[number])
      : null,
    marca: marca || null,
    depto: depto || null,
    orden: sort,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export default async function MachineryPage({ searchParams }: Props) {
  const { categoria, marca, depto, orden, page } = await parseParams(searchParams);

  let result: Awaited<ReturnType<typeof container.useCases.searchMachinery>> | null = null;
  let failure = false;
  try {
    result = await container.useCases.searchMachinery({
      category: categoria,
      query: marca ?? undefined,
      department: depto,
      sort: orden,
      page,
      pageSize: 12,
    });
  } catch {
    failure = true;
  }

  const items = result ? result.items.map(presentMachineryCard) : [];
  const count = result?.total ?? 0;

  const fields: CatalogField[] = [
    { key: "marca", label: "Buscar por marca o modelo", placeholder: "Buscar por marca o modelo…" },
    {
      key: "categoria",
      label: "Todas las categorías",
      options: MACHINERY_CATEGORY_CODES.map((code) => ({
        value: code,
        label: MACHINERY_CATEGORY_LABELS[code],
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
    if (marca) next.set("marca", marca);
    if (categoria) next.set("categoria", categoria);
    if (depto) next.set("depto", depto);
    next.set("page", String(n));
    return `/maquinaria?${next.toString()}`;
  };

  return (
    <div className="bg-crema pt-24 md:pt-28">
      <div className="contenedor pb-20">
        <header className="mb-8">
          <p className="etiqueta">Maquinaria</p>
          <h1 className="text-titulo mt-2">
            {categoria ? MACHINERY_CATEGORY_LABELS[categoria] : "Maquinaria a la venta"}
            {depto ? <> en {depto}</> : null}
          </h1>
          <p className="text-gris-calido-600 mt-3 max-w-2xl">
            Máquinas y equipos en condiciones reales de uso, con datos verificados: año, horas y
            precio.
          </p>
        </header>

        <div className="mb-8">
          <CatalogBar fields={fields} countLabel={count === 1 ? "1 aviso" : `${count} avisos`} />
        </div>

        {failure ? (
          <div className="rounded-mas border-arena bg-crema-50 border border-dashed px-6 py-16 text-center">
            <p className="font-display text-monte-950 text-xl">La maquinaria no está disponible</p>
            <p className="text-gris-calido-600 mt-2 text-sm">
              Revisá la configuración de Supabase en <code>.env</code>.
            </p>
          </div>
        ) : items.length > 0 ? (
          <>
            <CardGrid>
              {items.map((item) => (
                <MachineryCard key={item.href} item={item} />
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
            kind="machinery"
            title="No hay maquinaria con esos filtros"
            hint="Probá cambiar categoría, marca o departamento."
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
