import type { Property } from "@/domain/entities/property";
import type { Auction } from "@/domain/entities/auction";
import type { MachineryItem } from "@/domain/entities/machinery-item";
import { PROPERTY_TYPE_LABELS } from "@/domain/enums/property-type";
import { MACHINERY_CATEGORY_LABELS } from "@/domain/enums/machinery-category";

/** Tipos mínimos de schema.org que usamos (PLAN §10). */
export type JsonLd = Record<string, unknown>;

export function organizationJsonLd(input: { siteName: string; url: string }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.siteName,
    url: input.url,
    logo: `${input.url}/icon.svg`,
    areaServed: "UY",
  };
}

export function breadcrumbJsonLd(
  items: Array<{ label: string; href: string }>,
  url: string,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${url}${item.href}`,
    })),
  };
}

/**
 * Ficha de propiedad para buscadores (PLAN §10: `RealEstateListing`).
 * Solo expone lo público: nunca datos de contacto internos.
 */
export function propertyJsonLd(property: Property, canonicalUrl: string): JsonLd {
  const location = property.location;
  const listing: JsonLd = {
    "@context": "https://schema.org",
    "@type": ["RealEstateListing", "Product"],
    name: property.name,
    url: canonicalUrl,
    description: property.description?.slice(0, 500) ?? undefined,
    datePosted: property.publishedAt?.toISOString(),
    image: property.images.map((image) => image.url),
    category: PROPERTY_TYPE_LABELS[property.type],
    address: {
      "@type": "PostalAddress",
      addressLocality: location.locality ?? undefined,
      addressRegion: location.department,
      addressCountry: "UY",
    },
    floorSize: {
      "@type": "QuantitativeValue",
      value: property.hectares.value,
      unitText: "ha",
    },
  };

  if (location.latitude !== null && location.longitude !== null) {
    listing.geo = {
      "@type": "GeoCoordinates",
      latitude: location.latitude,
      longitude: location.longitude,
    };
  }

  if (property.price) {
    listing.offers = {
      "@type": "Offer",
      price: property.price.value,
      priceCurrency: property.price.currency,
      availability: "https://schema.org/InStock",
    };
  }

  return listing;
}

/** Remate como evento (PLAN Sprint 9, schema.org `Event`). */
export function auctionJsonLd(auction: Auction, canonicalUrl: string): JsonLd {
  const event: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: auction.title,
    url: canonicalUrl,
    description: auction.description?.slice(0, 500) ?? undefined,
    startDate: auction.scheduledAt.toISOString(),
    image: auction.images.map((image) => image.url),
    eventStatus:
      auction.eventStatus === "cancelado"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };

  if (auction.location) {
    event.location = {
      "@type": "Place",
      name: auction.location,
      address: { "@type": "PostalAddress", addressCountry: "UY" },
    };
  }

  if (auction.minimumBid) {
    event.offers = {
      "@type": "Offer",
      price: auction.minimumBid.value,
      priceCurrency: auction.minimumBid.currency,
      availability: "https://schema.org/InStock",
    };
  }

  return event;
}

/** Aviso de maquinaria (PLAN Sprint 9, schema.org `Product`). */
export function machineryJsonLd(item: MachineryItem, canonicalUrl: string): JsonLd {
  const schema: JsonLd = {
    "@context": "https://schema.org",
    "@type": ["Product", "Vehicle"],
    name: item.lineup,
    url: canonicalUrl,
    description: item.description?.slice(0, 500) ?? undefined,
    image: item.images.map((image) => image.url),
    category: MACHINERY_CATEGORY_LABELS[item.category],
    brand: item.brand ? { "@type": "Brand", name: item.brand } : undefined,
    model: item.model ?? undefined,
    productionDate: item.year ? String(item.year) : undefined,
    additionalProperty: item.hoursUsed
      ? [
          {
            "@type": "PropertyValue",
            name: "Horas de uso",
            value: item.hoursUsed,
          },
        ]
      : undefined,
  };

  if (item.price) {
    schema.offers = {
      "@type": "Offer",
      price: item.price.value,
      priceCurrency: item.price.currency,
      availability: "https://schema.org/InStock",
    };
  }

  return schema;
}
