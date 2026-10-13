import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { container } from "@/platform/container";
import { presentPropertyCard } from "@/adapters/presentation/property-presenter";
import { URUGUAY_DEPARTMENTS } from "@/domain/enums/department";
import { departmentSlug } from "@/domain/value-objects/slug";
import { PROPERTY_TYPE_LABELS } from "@/domain/enums/property-type";
import { PropertyGrid } from "@/ui/features/catalog/property-grid";
import { JsonLd } from "@/ui/components/json-ld";
import { breadcrumbJsonLd } from "@/adapters/presentation/seo-presenter";
import { siteUrl } from "@/infrastructure/config/env";
import { IconArrowRight } from "@/ui/icons";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ depto: string }>;
}

function findDepartment(slug: string): string | null {
  return URUGUAY_DEPARTMENTS.find((d) => departmentSlug(d) === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { depto } = await params;
  const department = findDepartment(depto);
  if (!department) return { title: "Departamento no encontrado" };

  return {
    title: `Campos en ${department} — venta de terrenos rurales`,
    description: `Campos y terrenos rurales a la venta en ${department}: superficie, precio y características de cada propiedad publicada.`,
    alternates: { canonical: `/departamentos/${depto}` },
    openGraph: {
      title: `Campos en ${department}`,
      description: `Terrenos rurales a la venta en ${department}, Uruguay.`,
    },
  };
}

/** Página por departamento (PLAN §10 SEO, Sprint 6). */
export default async function DepartmentPage({ params }: Props) {
  const { depto } = await params;
  const department = findDepartment(depto);
  if (!department) notFound();

  const breadcrumb = [
    { label: "Inicio", href: "/" },
    { label: "Departamentos", href: "/departamentos" },
    { label: department, href: `/departamentos/${depto}` },
  ];

  let items: ReturnType<typeof presentPropertyCard>[] = [];
  let total = 0;
  try {
    const result = await container.useCases.searchProperties({
      department,
      page: 1,
      pageSize: 24,
      sort: "recientes",
    });
    items = result.items.map(presentPropertyCard);
    total = result.total;
  } catch {
    // BD no disponible: se muestra el estado vacío con enlace al catálogo.
  }

  return (
    <div className="bg-crema pt-24 md:pt-28">
      <JsonLd data={breadcrumbJsonLd(breadcrumb, siteUrl)} />
      <div className="contenedor py-12 md:py-16">
        <nav aria-label="Migas de pan" className="text-gris-calido-600 mb-6 text-sm">
          <ol className="flex flex-wrap items-center gap-x-2">
            {breadcrumb.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {index === breadcrumb.length - 1 ? (
                  <span aria-current="page" className="text-monte">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="hover:text-monte transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <p className="etiqueta">Departamentos</p>
        <h1 className="text-titulo text-monte-950 mt-3">Campos en {department}</h1>
        <p className="text-gris-calido-600 mt-4 max-w-2xl leading-relaxed">
          {total > 0
            ? `${total} ${total === 1 ? "propiedad publicada" : "propiedades publicadas"} en ${department}. Filtrá por superficie, tipo y precio dentro del catálogo.`
            : `Por el momento no hay propiedades publicadas en ${department}. Mirá el catálogo completo o dejános tus datos para que te avisemos.`}
        </p>

        <div className="mt-10">
          <PropertyGrid items={items} />
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={`/campos?depto=${encodeURIComponent(department)}`}
            className="bg-monte text-crema-50 hover:bg-monte-600 rounded-suave inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-semibold transition-colors"
          >
            Ver {department} con filtros
            <IconArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/contacto"
            className="border-monte/30 text-monte hover:bg-salvia-100 rounded-suave inline-flex h-11 items-center justify-center border px-5 text-sm font-medium transition-colors"
          >
            Recibir novedades de la zona
          </Link>
        </div>

        <div className="border-arena mt-12 flex flex-wrap gap-3 border-t pt-6">
          {Object.entries(PROPERTY_TYPE_LABELS).map(([code, label]) => (
            <Link
              key={code}
              href={`/campos?depto=${encodeURIComponent(department)}&tipo=${code}`}
              className="border-arena text-gris-calido-600 hover:border-salvia hover:text-monte rounded-full border px-4 py-1.5 text-sm transition-colors"
            >
              {label} en {department}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
