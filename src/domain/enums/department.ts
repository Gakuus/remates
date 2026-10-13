/**
 * Departamentos de Uruguay (catálogo fijo, PLAN §11).
 * Se persisten como texto en `properties.department` + índice.
 */
export const URUGUAY_DEPARTMENTS = [
  "Artigas",
  "Canelones",
  "Cerro Largo",
  "Colonia",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Montevideo",
  "Paysandú",
  "Río Negro",
  "Rivera",
  "Rocha",
  "Salto",
  "San José",
  "Soriano",
  "Tacuarembó",
  "Treinta y Tres",
] as const;

export type UruguayDepartment = (typeof URUGUAY_DEPARTMENTS)[number];

export function isUruguayDepartment(value: string): value is UruguayDepartment {
  return (URUGUAY_DEPARTMENTS as readonly string[]).includes(value);
}
