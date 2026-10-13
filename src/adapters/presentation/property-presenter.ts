import type { Property } from "@/domain/entities/property";
import { PROPERTY_TYPE_LABELS } from "@/domain/enums/property-type";
import { departmentSlug } from "@/domain/value-objects/slug";
import { featureIsTrue } from "@/domain/entities/property-image";
import type { FeatureCode } from "@/domain/enums/feature-code";

/**
 * View model de tarjeta (PLAN §6, §16 adapters/presentation).
 * La UI nunca lee entidades de dominio crudas: este presenter traduce
 * a formato de presentación (strings ya formateados).
 */
export interface PropertyCardModel {
  href: string;
  name: string;
  department: string;
  locality: string;
  locationLabel: string;
  priceLabel: string | null;
  hectaresLabel: string;
  typeLabel: string;
  image: { url: string; alt: string } | null;
  photoCount: number;
  statusLabel: string | null;
  statusTone: "highlight" | "neutral" | null;
  highlights: Array<{ code: FeatureCode; icon: HighlightIcon }>;
}

export type HighlightIcon = "house" | "water" | "route" | "forest" | "barn" | "power";

const HIGHLIGHTS: Array<{ code: FeatureCode; icon: HighlightIcon }> = [
  { code: "casa", icon: "house" },
  { code: "agua", icon: "water" },
  { code: "acceso_ruta", icon: "route" },
  { code: "monte", icon: "forest" },
  { code: "galpon", icon: "barn" },
  { code: "electricidad", icon: "power" },
];

export function presentPropertyCard(property: Property): PropertyCardModel {
  const main = property.mainImage;
  const locality = property.location.locality ?? "";

  const highlights = HIGHLIGHTS.filter(({ code }) =>
    property.features.some((f) => f.code === code && (featureIsTrue(f) || f.value !== "false")),
  ).slice(0, 4);

  const status = statusPresentation(property.status, property.isFeatured);

  return {
    href: `/campos/${departmentSlug(property.location.department)}/${property.slug}`,
    name: property.name,
    department: property.location.department,
    locality,
    locationLabel: locality
      ? `${property.location.department} · ${locality}`
      : property.location.department,
    priceLabel: property.price?.format() ?? "A consultar",
    hectaresLabel: `${property.hectares.format()} ha`,
    typeLabel: PROPERTY_TYPE_LABELS[property.type],
    image: main ? { url: main.url, alt: main.altText || property.name } : null,
    photoCount: property.images.length,
    statusLabel: status.label,
    statusTone: status.tone,
    highlights,
  };
}

function statusPresentation(
  status: Property["status"],
  isFeatured: boolean,
): { label: string | null; tone: "highlight" | "neutral" | null } {
  if (status === "vendido") return { label: "Vendido", tone: "neutral" };
  if (status === "retirado") return { label: "Retirado", tone: "neutral" };
  if (isFeatured) return { label: "Destacado", tone: "highlight" };
  return { label: null, tone: null };
}
