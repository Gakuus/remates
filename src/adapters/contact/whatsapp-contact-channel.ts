import type { ContactChannel } from "@/application/ports/contact-channel";

/**
 * Canal WhatsApp (PLAN §8.7: "arquitectura preparada para WhatsApp").
 * Se habilita únicamente si `NEXT_PUBLIC_WHATSAPP_NUMBER` está definida;
 * si no, `buildUrl` devuelve null y la UI oculta el botón.
 */
export class WhatsAppContactChannel implements ContactChannel {
  readonly id = "whatsapp";
  readonly label = "WhatsApp";

  constructor(private readonly configuredNumber?: string) {}

  buildUrl({ message }: { message: string; phone?: string }): string | null {
    if (!this.configuredNumber) return null;
    const digits = this.configuredNumber.replace(/\D/g, "");
    if (digits.length < 8) return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }
}
