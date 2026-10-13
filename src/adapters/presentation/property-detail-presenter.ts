import type { Property } from "@/domain/entities/property";
import { PROPERTY_TYPE_LABELS } from "@/domain/enums/property-type";
import { PROPERTY_STATUS_LABELS } from "@/domain/enums/property-status";
import { FEATURE_LABELS, type FeatureCode } from "@/domain/enums/feature-code";
import { departmentSlug } from "@/domain/value-objects/slug";
import type { HighlightIcon } from "@/adapters/presentation/property-presenter";

/**
 * View model de la ficha (PLAN §8). La UI recibe strings formateados y
 * bloques ya decididos: nunca consulta el dominio.
 */
export interface PropertyDetailModel {
  id: string;
  href: string;
  breadcrumb: Array<{ label: string; href: string }>;
  name: string;
  locationLabel: string;
  priceLabel: string;
  hectaresLabel: string;
  typeLabel: string;
  statusLabel: string;
  isFeatured: boolean;
  description: string | null;

  gallery: Array<{ url: string; alt: string }>;
  photoCount: number;

  quickFacts: Array<{ label: string; value: string }>;
  featureGroups: Array<{
    title: string;
    items: Array<{ label: string; value: string; icon?: HighlightIcon }>;
  }>;

  productiveInfo: Array<{ label: string; value: string }>;

  location: {
    department: string;
    locality: string | null;
    accessNotes: string | null;
    latitude: number | null;
    longitude: number | null;
    hasCoordinates: boolean;
    mapUrl: string | null;
  };

  whatsappUrl: string | null;
}

const ICON_BY_FEATURE: Partial<Record<FeatureCode, HighlightIcon>> = {
  casa: "house",
  agua: "water",
  acceso_ruta: "route",
  monte: "forest",
  galpon: "barn",
  electricidad: "power",
};

export function presentPropertyDetail(
  property: Property,
  options: { whatsappUrl?: string | null } = {},
): PropertyDetailModel {
  const deptSlug = departmentSlug(property.location.department);
  const locality = property.location.locality;

  const features = new Map(property.features.map((f) => [f.code, f.value]));

  const featureValue = (code: FeatureCode): string | null => {
    const raw = features.get(code);
    if (raw === undefined) return null;
    if (raw === "true") return "Sí";
    if (raw === "false") return "No";
    return raw;
  };

  // ── Bloque de características (PLAN §8.3), agrupado ────────────────────
  const groups: PropertyDetailModel["featureGroups"] = [];

  const surface: PropertyDetailModel["featureGroups"][number]["items"] = [
    { label: "Superficie total", value: `${property.hectares.format()} ha` },
  ];
  const aptitude = featureValue("aptitud");
  if (aptitude) surface.push({ label: "Aptitud", value: aptitude });
  groups.push({ title: "Superficie y aptitud", items: surface });

  const water: typeof surface = [];
  const agua = featureValue("agua");
  const arroyo = featureValue("arroyo_rio");
  if (agua) water.push({ label: "Agua", value: agua, icon: "water" });
  if (arroyo) water.push({ label: "Arroyo / río", value: arroyo, icon: "water" });
  if (water.length > 0) groups.push({ title: "Recursos hídricos", items: water });

  const installs: typeof surface = [];
  for (const code of ["casa", "galpon", "corrales"] as const) {
    const value = featureValue(code);
    if (value) {
      const item: (typeof installs)[number] = { label: FEATURE_LABELS[code], value };
      const icon = ICON_BY_FEATURE[code];
      if (icon) item.icon = icon;
      installs.push(item);
    }
  }
  if (installs.length > 0) groups.push({ title: "Instalaciones", items: installs });

  const infra: typeof surface = [];
  for (const code of ["alambrados", "electricidad", "acceso_ruta", "monte", "mejoras"] as const) {
    const value = featureValue(code);
    if (value) {
      const item: (typeof infra)[number] = { label: FEATURE_LABELS[code], value };
      const icon = ICON_BY_FEATURE[code];
      if (icon) item.icon = icon;
      infra.push(item);
    }
  }
  if (infra.length > 0) groups.push({ title: "Infraestructura", items: infra });

  // ── Información productiva (PLAN §8.5): solo si existe ────────────────
  const productiveInfo: PropertyDetailModel["productiveInfo"] = [];
  for (const [label, code] of [
    ["Tipo de suelo", "tipo_suelo"],
    ["Productividad", "productividad"],
    ["Uso actual", "uso_actual"],
    ["Potencial agrícola", "potencial_agricola"],
    ["Potencial ganadero", "potencial_ganadero"],
    ["Recursos hídricos", "recursos_hidricos"],
  ] as const) {
    const value = features.get(code);
    if (value && value !== "false") productiveInfo.push({ label, value });
  }

  // ── Ubicación: enlace a mapa estático si hay coordenadas (PLAN §8.6) ──
  const latitude = property.location.latitude ?? null;
  const longitude = property.location.longitude ?? null;
  const hasCoordinates = latitude !== null && longitude !== null;
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/#map=15/${latitude}/${longitude}`
    : null;

  return {
    id: property.id,
    href: `/campos/${deptSlug}/${property.slug}`,
    breadcrumb: [
      { label: "Inicio", href: "/" },
      { label: "Campos", href: "/campos" },
      {
        label: property.location.department,
        href: `/campos?depto=${encodeURIComponent(property.location.department)}`,
      },
      ...(locality
        ? [
            {
              label: locality,
              href: `/campos?depto=${encodeURIComponent(property.location.department)}&localidad=${encodeURIComponent(locality)}`,
            },
          ]
        : []),
    ],
    name: property.name,
    locationLabel: locality
      ? `${locality}, ${property.location.department}`
      : property.location.department,
    priceLabel: property.price?.format() ?? "A consultar",
    hectaresLabel: `${property.hectares.format()} ha`,
    typeLabel: PROPERTY_TYPE_LABELS[property.type],
    statusLabel: PROPERTY_STATUS_LABELS[property.status],
    isFeatured: property.isFeatured,
    description: property.description,

    gallery: property.images.map((img) => ({ url: img.url, alt: img.altText || property.name })),
    photoCount: property.images.length,

    quickFacts: [
      { label: "Superficie", value: `${property.hectares.format()} ha` },
      { label: "Tipo", value: PROPERTY_TYPE_LABELS[property.type] },
      { label: "Departamento", value: property.location.department },
      { label: "Precio", value: property.price?.format() ?? "A consultar" },
    ],

    featureGroups: groups,
    productiveInfo,

    location: {
      department: property.location.department,
      locality: locality ?? null,
      accessNotes: property.location.accessNotes ?? null,
      latitude,
      longitude,
      hasCoordinates,
      mapUrl,
    },

    whatsappUrl: options.whatsappUrl ?? null,
  };
}
