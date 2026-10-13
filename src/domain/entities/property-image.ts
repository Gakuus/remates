import type { ContentImage } from "@/domain/entities/content-image";
import type { FeatureCode } from "@/domain/enums/feature-code";

/** Fotografía de una propiedad (PLAN §2, §11 `property_images`). */
export type PropertyImage = ContentImage;

/**
 * Valor de una característica (EAV acotado, PLAN §11).
 * `value` es "true"/"false" para booleanos o un texto corto ("manantial").
 */
export interface FeatureValue {
  code: FeatureCode;
  value: string;
}

export function featureIsTrue(feature: FeatureValue): boolean {
  return feature.value === "true";
}
