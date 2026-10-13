/**
 * Guards de peticiones del panel (anti-CSRF y caché).
 *
 * Las APIs del panel se llaman con JSON (`application/json`), lo que dispara
 * un preflight CORS que los navegadores de otros orígenes no pueden completar.
 * El check de `Origin` es la segunda barrera: si un request cross-site logra
 * pasar, se rechaza explícitamente en vez de depender solo de SameSite/cookies.
 */
import type { NextRequest } from "next/server";

/**
 * ¿Debemos confiar en el `Origin` de la petición?
 * - Sin `Origin` (curl, tests server-side, navegadores viejos) se permite:
 *   no hay cross-site posible sin encabezado de origen.
 * - Con `Origin`, tiene que coincidir con el origen del propio sitio.
 */
export function isTrustedOrigin(clientOrigin: string | null, requestUrl: URL): boolean {
  if (!clientOrigin) return true;
  return clientOrigin === requestUrl.origin;
}

/** Mismo check, tomando los valores de un `NextRequest`. */
export function isTrustedRequest(request: NextRequest): boolean {
  return isTrustedOrigin(request.headers.get("origin"), request.nextUrl);
}

/** Encabezado para que ni los datos ni las páginas del panel se cacheen. */
export function noStoreHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  };
}
