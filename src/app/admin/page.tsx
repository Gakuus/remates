import Link from "next/link";

import { container } from "@/platform/container";
import { Badge } from "@/ui/components/badge";
import { IconChevronRight, IconGavel, IconHouse, IconMail, IconWrench } from "@/ui/icons";

interface SectionCount {
  total: number;
  published: number;
}

async function countSections(): Promise<{
  campos: SectionCount | null;
  remates: SectionCount | null;
  maquinaria: SectionCount | null;
  consultas: SectionCount | null;
}> {
  try {
    const campos = await container.useCases.searchProperties({
      page: 1,
      pageSize: 1,
      sort: "recientes",
    });
    const rematesProximos = await container.useCases.searchAuctions({
      page: 1,
      pageSize: 1,
      sort: "proximos",
    });
    const rematesRealizados = await container.useCases.searchAuctions({
      page: 1,
      pageSize: 1,
      eventStatus: "realizado",
    });
    const rematesCancelados = await container.useCases.searchAuctions({
      page: 1,
      pageSize: 1,
      eventStatus: "cancelado",
    });
    const maquinaria = await container.useCases.searchMachinery({
      page: 1,
      pageSize: 1,
      sort: "recientes",
    });
    const consultas = await container.useCases.listInquiries();
    return {
      campos: { total: campos.total, published: campos.total },
      remates: {
        total: rematesProximos.total + rematesRealizados.total + rematesCancelados.total,
        published: rematesProximos.total,
      },
      maquinaria: { total: maquinaria.total, published: maquinaria.total },
      consultas: {
        total: consultas.length,
        published: consultas.filter((c) => c.status === "nuevo").length,
      },
    };
  } catch {
    return { campos: null, remates: null, maquinaria: null, consultas: null };
  }
}

const SECTIONS = [
  {
    key: "campos" as const,
    title: "Campos",
    description: "Propiedades rurales en venta.",
    icon: IconHouse,
    href: "/admin/campos",
  },
  {
    key: "remates" as const,
    title: "Remates",
    description: "Agenda de remates ganaderos y rurales.",
    icon: IconGavel,
    href: "/admin/remates",
  },
  {
    key: "maquinaria" as const,
    title: "Maquinaria",
    description: "Equipos y maquinaria publicada.",
    icon: IconWrench,
    href: "/admin/maquinaria",
  },
  {
    key: "consultas" as const,
    title: "Consultas",
    description: "Mensajes de contacto de los visitantes.",
    icon: IconMail,
    href: "/admin/consultas",
  },
];

export default async function AdminDashboardPage() {
  const summary = await countSections();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-monte-950 text-3xl">Resumen del contenido</h1>
        <p className="text-tinta-suave mt-2 max-w-prose">
          Estado del catálogo publicado en el sitio, según lo que ve el visitante.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ key, title, description, icon: Icon, href }) => {
          const data = summary[key];
          return (
            <Link
              key={key}
              href={href}
              className="group rounded-mas border-arena bg-blanco-roto hover:border-oliva/60 border p-5 transition-colors hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-suave bg-salvia-100 text-monte p-2.5">
                  <Icon size={22} aria-hidden="true" />
                </div>
                <Badge tone={data === null ? "neutral" : data.published > 0 ? "accent" : "neutral"}>
                  {data === null
                    ? "sin datos"
                    : key === "consultas"
                      ? `${data.published} sin responder`
                      : `${data.published} publicados`}
                </Badge>
              </div>
              <h2 className="font-display text-monte-950 mt-4 text-xl">{title}</h2>
              <p className="text-tinta-suave mt-1 text-sm">{description}</p>
              <dl className="border-arena mt-4 border-t pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-tinta-suave">Total cargado</dt>
                  <dd className="tabular text-tinta font-medium">
                    {data === null ? "—" : data.total}
                  </dd>
                </div>
              </dl>
              <p className="text-oliva-700 group-hover:text-monte mt-3 inline-flex items-center gap-1 text-sm font-medium">
                Gestionar
                <IconChevronRight size={14} aria-hidden="true" />
              </p>
            </Link>
          );
        })}
      </div>

      <p className="text-gris-calido max-w-prose text-sm leading-relaxed">
        La gestión del contenido (crear, editar, publicar y subir fotos) de campos, remates y
        maquinaria se habilita desde aquí. Mientras no haya base de datos real, los datos viven en
        memoria durante la vida del proceso.
      </p>
    </div>
  );
}
