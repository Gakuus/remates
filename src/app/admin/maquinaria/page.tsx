import { MACHINERY_CATEGORY_LABELS } from "@/domain/enums/machinery-category";
import { PROPERTY_STATUS_CODES } from "@/domain/enums/property-status";
import { container } from "@/platform/container";
import { CreateContentForm } from "@/ui/features/admin/create-content-form";
import { AdminContentList } from "@/ui/features/admin/content-list";

export const metadata = { title: "Maquinaria · Administración" };

export default async function AdminMaquinariaPage() {
  const result = await container.useCases.searchMachinery({
    statuses: [...PROPERTY_STATUS_CODES],
    sort: "recientes",
    page: 1,
    pageSize: 100,
  });

  const rows = result.items.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    meta: [
      MACHINERY_CATEGORY_LABELS[item.category],
      item.department,
      [item.brand, item.model].filter(Boolean).join(" ") || undefined,
      item.year ? String(item.year) : undefined,
      item.price?.format() ?? "Consultar",
    ].filter((value): value is string => Boolean(value)),
    photos: item.images.map((image) => ({ id: image.id, url: image.url })),
  }));

  return (
    <div>
      <h1 className="font-display text-monte-950 text-3xl">Maquinaria</h1>
      <p className="text-tinta-suave mt-2 max-w-prose">
        Equipos y maquinaria en venta. Se crean como borrador y se publican por separado.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[22rem_1fr]">
        <section className="rounded-mas border-arena bg-blanco-roto h-fit border p-5">
          <CreateContentForm kind="maquinaria" />
        </section>
        <section>
          <h2 className="font-display text-monte-950 mb-3 text-xl">
            Avisos cargados ({rows.length})
          </h2>
          <AdminContentList kind="maquinaria" rows={rows} />
        </section>
      </div>
    </div>
  );
}
