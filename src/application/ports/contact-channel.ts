/**
 * Canal de contacto alternativo (PLAN §8: "preparar la arquitectura para
 * agregar WhatsApp"). Implementación real post-MVP.
 */
export interface ContactChannel {
  readonly id: string;
  readonly label: string;
  /** URL de apertura, o null si el canal no está disponible. */
  buildUrl(input: { message: string; phone?: string }): string | null;
}
