import type { Metadata } from "next";
import Link from "next/link";
import { container } from "@/platform/container";
import { presentPropertyCard } from "@/adapters/presentation/property-presenter";
import { presentAuctionCard } from "@/adapters/presentation/auction-presenter";
import { presentMachineryCard } from "@/adapters/presentation/machinery-presenter";
import { URUGUAY_DEPARTMENTS } from "@/domain/enums/department";
import { departmentSlug } from "@/domain/value-objects/slug";
import { HeroSearch } from "@/ui/features/home/hero-search";
import { PropertyGrid } from "@/ui/features/catalog/property-grid";
import { CardGrid } from "@/ui/features/catalog/catalog-grid";
import { AuctionCard } from "@/ui/features/catalog/auction-card";
import { MachineryCard } from "@/ui/features/catalog/machinery-card";
import { Section } from "@/ui/components/section";
import { SectionHeading } from "@/ui/components/section-heading";
import { IconArrowRight } from "@/ui/icons";
import { siteName } from "@/infrastructure/config/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${siteName} — Campos y terrenos rurales a la venta`,
  description:
    "Campos y terrenos rurales a la venta en Uruguay: destacados, recién publicados y búsqueda por departamento, tipo y superficie.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: `${siteName} — Campos y terrenos rurales a la venta`,
    description:
      "Propiedades rurales seleccionadas: ubicación, superficie y precio, con fotografía a la altura.",
  },
};

const DEPARTMENT_COUNTS_PLACEHOLDER = 0;

async function getHomeData() {
  try {
    const [featured, recent, summary, upcomingAuctions, recentMachinery] = await Promise.all([
      container.useCases.getFeaturedProperties(3),
      container.useCases.getRecentProperties(6),
      container.useCases.getCatalogSummary(),
      container.useCases.getUpcomingAuctions(3),
      container.useCases.getRecentMachinery(3),
    ]);
    return { featured, recent, summary, upcomingAuctions, recentMachinery, failure: false };
  } catch {
    return {
      featured: [],
      recent: [],
      summary: { total: 0, byDepartment: [] },
      upcomingAuctions: [],
      recentMachinery: [],
      failure: true,
    };
  }
}

export default async function HomePage() {
  const { featured, recent, summary, upcomingAuctions, recentMachinery, failure } =
    await getHomeData();

  const departmentsWithCounts = new Map(
    summary.byDepartment.map((row) => [row.department, row.count]),
  );

  return (
    <>
      {/* ── Hero (PLAN §4) ─────────────────────────────────────────────── */}
      <section className="bg-monte-950 relative isolate flex min-h-[92svh] flex-col justify-end overflow-hidden">
        {/* TODO Sprint 3+: fotografía rural de gran tamaño vía next/image.
            Mientras no hay asset, el fondo sólido mantiene la jerarquía. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_100%_at_20%_10%,#3d5e4d_0%,#223529_45%,#1b2a23_100%)]"
        />
        <div aria-hidden="true" className="bg-monte-950/35 absolute inset-0 -z-10" />

        <div className="contenedor pt-36 pb-14 md:pt-44 md:pb-20">
          <p className="etiqueta text-salvia">Campos y terrenos rurales · Uruguay</p>

          <h1 className="text-display text-crema-50 mt-4 max-w-3xl">
            El campo uruguayo, publicado con criterio.
          </h1>

          <p className="text-salvia-300 mt-5 max-w-xl text-lg leading-relaxed md:text-xl">
            Propiedades rurales seleccionadas: ubicación, superficie y precio, con fotografía a la
            altura.
          </p>

          <HeroSearch />
        </div>
      </section>

      {/* ── Campos destacados ─────────────────────────────────────────── */}
      <Section tone="crema">
        <SectionHeading
          eyebrow="Selección"
          title="Campos destacados"
          description="Propiedades que consideramos destacadas por su ubicación, superficie o estado."
          action={
            <Link
              href="/campos?orden=recientes"
              className="text-oliva-600 hover:text-monte inline-flex items-center gap-1.5 text-sm font-medium"
            >
              Ver todos
              <IconArrowRight size={15} />
            </Link>
          }
        />

        {failure ? (
          <Unavailable />
        ) : featured.length > 0 ? (
          <PropertyGrid items={featured.map(presentPropertyCard)} />
        ) : (
          <EmptyState label="Aún no hay campos destacados." />
        )}
      </Section>

      {/* ── Recientemente publicados ──────────────────────────────────── */}
      <Section tone="beige">
        <SectionHeading
          eyebrow="Novedades"
          title="Recientemente publicados"
          description="Las últimas incorporaciones al catálogo."
          action={
            <Link
              href="/campos?orden=recientes"
              className="text-oliva-600 hover:text-monte inline-flex items-center gap-1.5 text-sm font-medium"
            >
              Ver todos
              <IconArrowRight size={15} />
            </Link>
          }
        />

        {failure ? (
          <Unavailable />
        ) : recent.length > 0 ? (
          <PropertyGrid items={recent.map(presentPropertyCard)} />
        ) : (
          <EmptyState label="Todavía no hay campos publicados." />
        )}
      </Section>

      {/* ── Próximos remates ─────────────────────────────────────────── */}
      <Section tone="crema">
        <SectionHeading
          eyebrow="Agenda"
          title="Próximos remates"
          description="Remates ganaderos y rurales por venir: fecha, lugar, rematador y base."
          action={
            <Link
              href="/remates"
              className="text-oliva-600 hover:text-monte inline-flex items-center gap-1.5 text-sm font-medium"
            >
              Ver todos
              <IconArrowRight size={15} />
            </Link>
          }
        />

        {failure ? (
          <Unavailable />
        ) : upcomingAuctions.length > 0 ? (
          <CardGrid>
            {upcomingAuctions.map((auction) => (
              <AuctionCard key={auction.slug} auction={presentAuctionCard(auction)} />
            ))}
          </CardGrid>
        ) : (
          <EmptyState label="Todavía no hay remates en agenda." />
        )}
      </Section>

      {/* ── Maquinaria reciente ──────────────────────────────────────── */}
      <Section tone="beige">
        <SectionHeading
          eyebrow="Equipamiento"
          title="Maquinaria reciente"
          description="Tractores, cosechadoras y equipos publicados con datos de uso reales."
          action={
            <Link
              href="/maquinaria"
              className="text-oliva-600 hover:text-monte inline-flex items-center gap-1.5 text-sm font-medium"
            >
              Ver todos
              <IconArrowRight size={15} />
            </Link>
          }
        />

        {failure ? (
          <Unavailable />
        ) : recentMachinery.length > 0 ? (
          <CardGrid>
            {recentMachinery.map((item) => (
              <MachineryCard key={item.slug} item={presentMachineryCard(item)} />
            ))}
          </CardGrid>
        ) : (
          <EmptyState label="Todavía no hay maquinaria publicada." />
        )}
      </Section>

      {/* ── Zonas / departamentos ─────────────────────────────────────── */}
      <Section tone="crema">
        <SectionHeading
          eyebrow="Zonas"
          title="Explorá por departamento"
          description="Cada departamento con su cantidad de campos disponibles."
        />

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {URUGUAY_DEPARTMENTS.map((department) => {
            const count = departmentsWithCounts.get(department) ?? DEPARTMENT_COUNTS_PLACEHOLDER;
            return (
              <li key={department}>
                <Link
                  href={`/departamentos/${departmentSlug(department)}`}
                  className="rounded-suave border-arena bg-crema-50 hover:border-salvia hover:bg-salvia-100 flex items-center justify-between gap-2 border px-4 py-3.5 transition-colors"
                >
                  <span className="text-tinta text-sm font-medium">{department}</span>
                  <span className="tabular text-gris-calido text-xs">
                    {count > 0 ? `${count} ${count === 1 ? "campo" : "campos"}` : "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* ── Presentación de la empresa ────────────────────────────────── */}
      <Section tone="monte">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="etiqueta text-salvia">La empresa</p>
            <h2 className="text-titulo text-crema-50 mt-3">
              Una marca especializada en campos uruguayos
            </h2>
            <p className="text-salvia-300 mt-5 leading-relaxed">
              Trabajamos exclusivamente con propiedades rurales: conocemos el territorio, los tipos
              de suelo, las mejoras y lo que hace que un campo valga la pena. Cada publicación se
              presenta con fotografía, ubicación y datos verificados.
            </p>
            <div className="mt-7">
              <Link
                href="/nosotros"
                className="text-crema-50 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
              >
                Conocé más sobre nosotros
                <IconArrowRight size={15} />
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4">
            {[
              { value: `${summary.total || "—"}`, label: "Campos publicados" },
              { value: `${URUGUAY_DEPARTMENTS.length}`, label: "Departamentos" },
              { value: "USD", label: "Moneda de publicación" },
              { value: "100%", label: "Enfocados en el campo" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-mas border-crema-50/15 bg-crema-50/5 border p-5"
              >
                <dt className="text-salvia text-xs tracking-widest uppercase">{stat.label}</dt>
                <dd className="tabular font-display text-crema-50 mt-1.5 text-3xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <Section tone="beige">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-titulo">¿Buscás un campo o querés publicar uno?</h2>
          <p className="text-gris-calido-600 mt-4">
            Escribinos y te respondemos con las opciones disponibles o con el proceso de
            publicación.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/contacto"
              className="rounded-suave bg-monte text-crema-50 hover:bg-monte-600 inline-flex h-12 items-center justify-center px-7 text-base font-medium transition-colors"
            >
              Consultar por un campo
            </Link>
            <Link
              href="/publicar"
              className="rounded-suave border-monte/30 text-monte hover:border-monte/60 hover:bg-salvia-100 inline-flex h-12 items-center justify-center border px-7 text-base font-medium transition-colors"
            >
              Publicá tu campo
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}

function Unavailable() {
  return (
    <div className="rounded-mas border-arena bg-crema-50 border border-dashed px-6 py-12 text-center">
      <p className="font-display text-monte-950 text-lg">Contenido en carga</p>
      <p className="text-gris-calido-600 mt-1.5 text-sm">
        Revisá la configuración de la base de datos (<code>DATABASE_URL</code>) para ver los campos.
      </p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-mas border-arena bg-crema-50 border border-dashed px-6 py-12 text-center">
      <p className="text-gris-calido-600 text-sm">{label}</p>
      <div className="mt-4">
        <Link
          href="/campos"
          className="rounded-suave border-monte/30 text-monte hover:bg-salvia-100 inline-flex h-9 items-center justify-center border px-4 text-sm font-medium transition-colors"
        >
          Explorar el catálogo
        </Link>
      </div>
    </div>
  );
}
