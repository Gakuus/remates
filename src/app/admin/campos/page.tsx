import { PROPERTY_STATUS_CODES } from "@/domain/enums/property-status";
import { PROPERTY_TYPE_LABELS } from "@/domain/enums/property-type";
import { container } from "@/platform/container";
import { CreateContentForm } from "@/ui/features/admin/create-content-form";
import { AdminContentList } from "@/ui/features/admin/content-list";

export const metadata = { title: "Campos · Administración" };

export default async function AdminCamposPage() {
  const result = await container.useCases.searchProperties({
    statuses: [...PROPERTY_STATUS_CODES],
    sort: "recientes",
    page: 1,
    pageSize: 100,
  });

  const rows = result.items.map((property) => ({
    id: property.id,
    title: property.name,
    status: property.status,
    meta: [
      PROPERTY_TYPE_LABELS[property.type],
      [property.location.department, property.location.locality].filter(Boolean).join(" / "),
      property.price?.format() ?? "Consultar",
    ],
    photos: property.images.map((image) => ({ id: image.id, url: image.url })),
  }));

  return (
    <div>
      <h1 className="font-display text-monte-950 text-3xl">Campos</h1>
      <p className="text-tinta-suave mt-2 max-w-prose">
        Alta y publicación de propiedades rurales. Todo se crea como borrador; recién al publicar se
        vuelve visible en el catálogo.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[22rem_1fr]">
        <section className="rounded-mas border-arena bg-blanco-roto h-fit border p-5">
          <CreateContentForm kind="campos" />
        </section>
        <section>
          <h2 className="font-display text-monte-950 mb-3 text-xl">Cargados ({rows.length})</h2>
          <AdminContentList kind="campos" rows={rows} />
        </section>
      </div>
    </div>
  );
}
