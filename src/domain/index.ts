/**
 * Dominio — núcleo puro del sistema (docs/PLAN.md §2).
 * Cero dependencias externas: ni React, ni Next, ni base de datos.
 */

// Enums / catálogos
export * from "@/domain/enums/property-type";
export * from "@/domain/enums/property-status";
export * from "@/domain/enums/feature-code";
export * from "@/domain/enums/department";
export * from "@/domain/enums/auction-event-status";
export * from "@/domain/enums/machinery-category";

// Value objects
export * from "@/domain/value-objects/hectares";
export * from "@/domain/value-objects/price";
export * from "@/domain/value-objects/slug";
export * from "@/domain/value-objects/coordinates";

// Entidades
export * from "@/domain/entities/content-image";
export * from "@/domain/entities/property-image";
export * from "@/domain/entities/property";
export * from "@/domain/entities/auction";
export * from "@/domain/entities/machinery-item";
export * from "@/domain/entities/inquiry";

// Reglas
export * from "@/domain/rules/publish-rules";
export * from "@/domain/rules/auction-rules";
export * from "@/domain/rules/machinery-rules";
