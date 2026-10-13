/**
 * Códigos de características (EAV acotado, PLAN §11 `property_features`).
 * Es un catálogo de dominio tipado: agregar una característica es agregar
 * una entrada aquí, sin migración de esquema.
 */
export const FEATURE_CODES = [
  "aptitud",
  "agua",
  "arroyo_rio",
  "monte",
  "casa",
  "galpon",
  "corrales",
  "alambrados",
  "electricidad",
  "acceso_ruta",
  "mejoras",
  // Información productiva (PLAN §8.5): catálogo cerrado, valores en texto.
  "tipo_suelo",
  "productividad",
  "uso_actual",
  "potencial_agricola",
  "potencial_ganadero",
  "recursos_hidricos",
] as const;

export type FeatureCode = (typeof FEATURE_CODES)[number];

export function isFeatureCode(value: string): value is FeatureCode {
  return (FEATURE_CODES as readonly string[]).includes(value);
}

export const FEATURE_LABELS: Record<FeatureCode, string> = {
  aptitud: "Aptitud productiva",
  agua: "Agua",
  arroyo_rio: "Arroyo / río",
  monte: "Monte",
  casa: "Casa",
  galpon: "Galpón",
  corrales: "Corrales",
  alambrados: "Alambrados",
  electricidad: "Electricidad",
  acceso_ruta: "Acceso por ruta",
  mejoras: "Mejoras",
  tipo_suelo: "Tipo de suelo",
  productividad: "Productividad",
  uso_actual: "Uso actual",
  potencial_agricola: "Potencial agrícola",
  potencial_ganadero: "Potencial ganadero",
  recursos_hidricos: "Recursos hídricos",
};

/** Características cuyo valor esperado es booleano (Sí/No). */
export const BOOLEAN_FEATURE_CODES: readonly FeatureCode[] = [
  "arroyo_rio",
  "monte",
  "casa",
  "galpon",
  "corrales",
  "alambrados",
  "electricidad",
  "acceso_ruta",
];
