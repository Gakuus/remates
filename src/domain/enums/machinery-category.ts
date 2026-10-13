/**
 * Categorías de maquinaria (PLAN §11 `machinery_categories`).
 * Catálogo acotado y extensible; la BD lo persiste por referencia.
 */
export const MACHINERY_CATEGORY_CODES = [
  "tractor",
  "cosechadora",
  "sembradora",
  "pulverizadora",
  "camion",
  "acoplado",
  "herramientas",
  "repuestos",
  "otro",
] as const;

export type MachineryCategoryCode = (typeof MACHINERY_CATEGORY_CODES)[number];

export function isMachineryCategoryCode(value: string): value is MachineryCategoryCode {
  return (MACHINERY_CATEGORY_CODES as readonly string[]).includes(value);
}

export const MACHINERY_CATEGORY_LABELS: Record<MachineryCategoryCode, string> = {
  tractor: "Tractores",
  cosechadora: "Cosechadoras",
  sembradora: "Sembradoras",
  pulverizadora: "Pulverizadoras",
  camion: "Camiones",
  acoplado: "Acoplados",
  herramientas: "Herramientas",
  repuestos: "Repuestos",
  otro: "Otro",
};
