import type { MachineryItem } from "@/domain/entities/machinery-item";
import { MACHINERY_CATEGORY_LABELS } from "@/domain/enums/machinery-category";

function priceOrConsult(item: MachineryItem): string | null {
  return item.price ? item.price.format() : null;
}

export interface MachineryCardModel {
  href: string;
  title: string;
  lineup: string;
  categoryLabel: string;
  statusLabel: string | null;
  statusTone: "highlight" | "neutral" | null;
  locationLabel: string;
  priceLabel: string | null;
  yearLabel: string | null;
  hoursLabel: string | null;
  image: { url: string; alt: string } | null;
  photoCount: number;
}

/** View model de tarjeta de maquinaria (PLAN Sprint 9). */
export function presentMachineryCard(item: MachineryItem): MachineryCardModel {
  const main = item.mainImage;
  const locality = item.locality?.trim() ?? "";
  const status = statusPresentation(item);

  return {
    href: `/maquinaria/${item.slug}`,
    title: item.title,
    lineup: item.lineup,
    categoryLabel: MACHINERY_CATEGORY_LABELS[item.category],
    statusLabel: status.label,
    statusTone: status.tone,
    locationLabel: locality ? `${item.department} · ${locality}` : item.department,
    priceLabel: priceOrConsult(item),
    yearLabel: item.year !== null ? `${item.year}` : null,
    hoursLabel: item.hoursUsed !== null ? `${item.hoursUsed.toLocaleString("es-UY")} hs` : null,
    image: main ? { url: main.url, alt: main.altText || item.title } : null,
    photoCount: item.images.length,
  };
}

function statusPresentation(item: MachineryItem): {
  label: string | null;
  tone: "highlight" | "neutral" | null;
} {
  if (item.status === "vendido") return { label: "Vendido", tone: "neutral" };
  if (item.status === "retirado") return { label: "Retirado", tone: "neutral" };
  if (item.isFeatured) return { label: "Destacado", tone: "highlight" };
  return { label: null, tone: null };
}

export interface MachineryDetailModel extends MachineryCardModel {
  id: string;
  breadcrumb: Array<{ href: string; label: string }>;
  brandModel: string;
  description: string | null;
  gallery: Array<{ url: string; alt: string }>;
  quickFacts: Array<{ label: string; value: string }>;
}

/** View model de la ficha de maquinaria. */
export function presentMachineryDetail(item: MachineryItem): MachineryDetailModel {
  const card = presentMachineryCard(item);

  return {
    ...card,
    id: item.id,
    breadcrumb: [
      { href: "/", label: "Inicio" },
      { href: "/maquinaria", label: "Maquinaria" },
      { href: card.href, label: item.title },
    ],
    brandModel: item.lineup,
    description: item.description,
    gallery: item.images.map((image) => ({ url: image.url, alt: image.altText || item.title })),
    quickFacts: [
      { label: "Categoría", value: card.categoryLabel },
      ...(item.year !== null ? [{ label: "Año", value: `${item.year}` }] : []),
      ...(item.hoursUsed !== null
        ? [{ label: "Horas de uso", value: `${item.hoursUsed.toLocaleString("es-UY")} hs` }]
        : []),
      ...(item.locality
        ? [{ label: "Ubicación", value: `${item.department} · ${item.locality}` }]
        : []),
    ],
  };
}
