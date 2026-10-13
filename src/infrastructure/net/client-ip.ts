/**
 * IP del cliente para rate limiting.
 *
 * - `x-real-ip` lo setea el reverse proxy (Nginx/caddy); se usa primero.
 * - `x-forwarded-for` como fallback: se toma el primer hop.
 * - Sin ningún encabezado se devuelve `null`: el llamador decide cómo
 *   degradar. NUNCA se devuelve una clave compartida tipo "unknown" (un
 *   atacante sin IP podría llenar un bucket común y bloquear a todos los
 *   clientes en un solo intento — H1.1).
 */
export function clientIpFromRequest(request: { headers: Headers }): string | null {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  const firstHop = forwarded?.split(",")[0]?.trim();
  if (firstHop) return firstHop;

  return null;
}
