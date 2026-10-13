/**
 * Máscara de teléfono uruguayo para el formulario de contacto (PLAN §8.7).
 * Solo números, agrupados en tríos con espacios: "099 193 151".
 * Tope de 9 dígitos (celular uruguayo) → como mucho 11 caracteres.
 */
export const UY_PHONE_MAX_DIGITS = 9;
export const UY_PHONE_MAX_LENGTH = UY_PHONE_MAX_DIGITS + 2;

export function formatUyPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, UY_PHONE_MAX_DIGITS);
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ");
}

/** True si el teléfono tiene forma uruguaya (u opcionalmente vacío). */
export function isUyPhoneValid(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 0 || (digits.length >= 8 && digits.length <= UY_PHONE_MAX_DIGITS);
}
