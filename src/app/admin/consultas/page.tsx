import Link from "next/link";

import type { InquiryProps, InquiryStatus } from "@/domain/entities/inquiry";
import { container } from "@/platform/container";
import { Badge } from "@/ui/components/badge";
import { InquiryStatusButton } from "@/ui/features/admin/inquiry-actions";

export const metadata = { title: "Consultas · Administración" };

const dateTime = new Intl.DateTimeFormat("es-UY", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type EstadoTab = "todas" | InquiryStatus;

const TABS: Array<{ key: EstadoTab; label: string }> = [
  { key: "todas", label: "Todas" },
  { key: "nuevo", label: "Nuevas" },
  { key: "respondido", label: "Respondidas" },
  { key: "archivado", label: "Archivadas" },
];

const STATUS_LABELS: Record<InquiryStatus, string> = {
  nuevo: "Nueva",
  respondido: "Respondida",
  archivado: "Archivada",
};

const SUBJECT_LABELS: Record<string, string> = {
  property: "Campo",
  auction: "Remate",
  machinery: "Maquinaria",
};

interface SubjectRef {
  title: string;
  href: string;
}

async function resolveSubjects(inquiries: InquiryProps[]): Promise<Map<string, SubjectRef>> {
  const refs = new Map<string, SubjectRef>();
  const propertyIds = new Set<string>();
  const auctionIds = new Set<string>();
  const machineryIds = new Set<string>();

  for (const inquiry of inquiries) {
    const { type, id } = inquiry.subject;
    if (!id) continue;
    if (type === "property") propertyIds.add(id);
    else if (type === "auction") auctionIds.add(id);
    else machineryIds.add(id);
  }

  const properties = await Promise.all(
    [...propertyIds].map((id) => container.repos.property.findById(id)),
  );
  const auctions = await Promise.all(
    [...auctionIds].map((id) => container.repos.auction.findById(id)),
  );
  const machinery = await Promise.all(
    [...machineryIds].map((id) => container.repos.machinery.findById(id)),
  );

  properties.forEach((property) => {
    if (property) refs.set(property.id, { title: property.name, href: "/admin/campos" });
  });
  auctions.forEach((auction) => {
    if (auction) refs.set(auction.id, { title: auction.title, href: "/admin/remates" });
  });
  machinery.forEach((item) => {
    if (item) refs.set(item.id, { title: item.title, href: "/admin/maquinaria" });
  });

  return refs;
}

export default async function AdminConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const activeTab: EstadoTab =
    estado === "nuevo" || estado === "respondido" || estado === "archivado" ? estado : "todas";

  const inquiries = await container.useCases.listInquiries();
  const subjectRefs = await resolveSubjects(inquiries);

  const visible =
    activeTab === "todas" ? inquiries : inquiries.filter((i) => i.status === activeTab);

  const counts = {
    todas: inquiries.length,
    nuevo: inquiries.filter((i) => i.status === "nuevo").length,
    respondido: inquiries.filter((i) => i.status === "respondido").length,
    archivado: inquiries.filter((i) => i.status === "archivado").length,
  };

  return (
    <div>
      <h1 className="font-display text-monte-950 text-3xl">Consultas</h1>
      <p className="text-tinta-suave mt-2 max-w-prose">
        Consultas de contacto recibidas desde las fichas públicas y el formulario de la página
        Contacto. Respondelas por mail o teléfono y marcalas como respondidas para no perder el
        hilo.
      </p>

      <nav className="border-arena mt-6 flex flex-wrap gap-2 border-b pb-3">
        {TABS.map(({ key, label }) => {
          const active = key === activeTab;
          const LinkClass = active
            ? "bg-monte text-crema-50"
            : "text-tinta hover:bg-salvia-100 hover:text-monte";
          return (
            <Link
              key={key}
              href={key === "todas" ? "/admin/consultas" : `/admin/consultas?estado=${key}`}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${LinkClass}`}
            >
              {label} ({counts[key]})
            </Link>
          );
        })}
      </nav>

      {visible.length === 0 ? (
        <div className="rounded-mas border-arena bg-blanco-roto mt-6 border p-8 text-center">
          <p className="text-tinta-suave">
            {activeTab === "todas"
              ? "Todavía no hay consultas. Cuando alguien use el formulario de contacto, aparece acá."
              : `No hay consultas ${STATUS_LABELS[activeTab].toLowerCase()}s.`}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {visible.map((inquiry) => {
            const subject = inquiry.subject.id ? subjectRefs.get(inquiry.subject.id) : null;
            return (
              <li key={inquiry.id} className="rounded-mas border-arena bg-blanco-roto border p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {subject ? (
                      <Link href={subject.href} className="hover:underline">
                        <Badge tone="accent">
                          {SUBJECT_LABELS[inquiry.subject.type]} · {subject.title}
                        </Badge>
                      </Link>
                    ) : (
                      <Badge tone="neutral">Consulta general</Badge>
                    )}
                    <Badge tone={inquiry.status === "nuevo" ? "highlight" : "neutral"}>
                      {STATUS_LABELS[inquiry.status]}
                    </Badge>
                  </div>
                  <time
                    className="text-gris-calido-600 text-sm"
                    dateTime={inquiry.createdAt.toISOString()}
                  >
                    {dateTime.format(inquiry.createdAt)}
                  </time>
                </div>

                <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                  <span className="text-tinta font-semibold">{inquiry.name}</span>
                  <a href={`mailto:${inquiry.email}`} className="text-oliva-700 hover:underline">
                    {inquiry.email}
                  </a>
                  {inquiry.phone ? (
                    <a href={`tel:${inquiry.phone}`} className="text-oliva-700 hover:underline">
                      {inquiry.phone}
                    </a>
                  ) : null}
                </div>

                <p className="text-tinta-suave mt-3 max-w-prose leading-relaxed whitespace-pre-line">
                  {inquiry.message}
                </p>

                <div className="border-arena mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                  {inquiry.status !== "respondido" ? (
                    <InquiryStatusButton
                      id={inquiry.id}
                      status="respondido"
                      label="Marcar respondida"
                      tone="primary"
                    />
                  ) : null}
                  {inquiry.status !== "archivado" ? (
                    <InquiryStatusButton
                      id={inquiry.id}
                      status="archivado"
                      label="Archivar"
                      tone="secondary"
                    />
                  ) : null}
                  {inquiry.status !== "nuevo" ? (
                    <InquiryStatusButton
                      id={inquiry.id}
                      status="nuevo"
                      label="Volver a nueva"
                      tone="ghost"
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
