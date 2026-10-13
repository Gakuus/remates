import type { Metadata } from "next";
import Link from "next/link";
import { container } from "@/platform/container";
import { URUGUAY_DEPARTMENTS } from "@/domain/enums/department";
import { departmentSlug } from "@/domain/value-objects/slug";
import { IconArrowRight } from "@/ui/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Departamentos",
  description: "Explorá campos y terrenos rurales a la venta en los 19 departamentos del Uruguay.",
  alternates: { canonical: "/departamentos" },
};

async function getCounts(): Promise<Map<string, number>> {
  try {
    const summary = await container.useCases.getCatalogSummary();
    return new Map(summary.byDepartment.map((row) => [row.department, row.count]));
  } catch {
    return new Map();
  }
}

/** Índice de páginas por departamento (PLAN §10, Sprint 6). */
export default async function DepartmentsPage() {
  const counts = await getCounts();
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-crema pt-24 md:pt-28">
      <div className="contenedor py-12 md:py-16">
        <p className="etiqueta">Zonas</p>
        <h1 className="text-titulo text-monte-950 mt-3">Campos por departamento</h1>
        <p className="text-gris-calido-600 mt-4 max-w-xl leading-relaxed">
          {total > 0
            ? `${total} ${total === 1 ? "campo publicado" : "campos publicados"} en todo el país. Elegí un departamento para ver el catálogo de la zona.`
            : "Elegí un departamento para ver el catálogo de la zona."}
        </p>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {URUGUAY_DEPARTMENTS.map((department) => {
            const count = counts.get(department);
            return (
              <li key={department}>
                <Link
                  href={`/departamentos/${departmentSlug(department)}`}
                  className="border-arena bg-crema-50 hover:border-salvia hover:bg-salvia-100 rounded-suave flex items-center justify-between gap-2 border px-4 py-3.5 transition-colors"
                >
                  <span className="text-tinta text-sm font-medium">{department}</span>
                  <span className="tabular text-gris-calido text-xs">
                    {count ? `${count} ${count === 1 ? "campo" : "campos"}` : "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href="/campos"
          className="text-monte hover:text-monte-600 mt-10 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          Ver todo el catálogo
          <IconArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
