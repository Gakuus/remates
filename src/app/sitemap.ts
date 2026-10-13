import type { MetadataRoute } from "next";
import { container } from "@/platform/container";
import { siteUrl } from "@/infrastructure/config/env";
import { URUGUAY_DEPARTMENTS } from "@/domain/enums/department";
import { departmentSlug } from "@/domain/value-objects/slug";

type ChangeFrequency = MetadataRoute.Sitemap[number]["changeFrequency"];

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: ChangeFrequency }> = [
  { path: "/", priority: 1, changeFrequency: "monthly" },
  { path: "/campos", priority: 0.9, changeFrequency: "daily" },
  { path: "/remates", priority: 0.9, changeFrequency: "daily" },
  { path: "/maquinaria", priority: 0.9, changeFrequency: "daily" },
  { path: "/departamentos", priority: 0.8, changeFrequency: "weekly" },
  { path: "/publicar", priority: 0.7, changeFrequency: "yearly" },
  { path: "/nosotros", priority: 0.5, changeFrequency: "yearly" },
  { path: "/contacto", priority: 0.6, changeFrequency: "yearly" },
];

/**
 * Sitemap (PLAN §10 SEO, Sprint 6): rutas estáticas + páginas por
 * departamento + fichas publicadas. Si la BD no responde, degrada a las
 * rutas estáticas en lugar de romper el sitemap completo.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const statics: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const departments: MetadataRoute.Sitemap = URUGUAY_DEPARTMENTS.map((department) => ({
    url: `${siteUrl}/departamentos/${departmentSlug(department)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  let properties: MetadataRoute.Sitemap = [];
  try {
    const result = await container.useCases.searchProperties({
      page: 1,
      pageSize: 100,
      sort: "recientes",
    });
    properties = result.items.map((property) => ({
      url: `${siteUrl}/campos/${departmentSlug(property.location.department)}/${property.slug}`,
      lastModified: property.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // BD no disponible: el sitemap sigue siendo válido con las rutas base.
  }

  let auctions: MetadataRoute.Sitemap = [];
  try {
    const result = await container.useCases.searchAuctions({ page: 1, pageSize: 100 });
    auctions = result.items.map((auction) => ({
      url: `${siteUrl}/remates/${auction.slug}`,
      lastModified: auction.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // Degrada a rutas base.
  }

  let machinery: MetadataRoute.Sitemap = [];
  try {
    const result = await container.useCases.searchMachinery({ page: 1, pageSize: 100 });
    machinery = result.items.map((item) => ({
      url: `${siteUrl}/maquinaria/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // Degrada a rutas base.
  }

  return [...statics, ...departments, ...properties, ...auctions, ...machinery];
}
