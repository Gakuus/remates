/**
 * Middleware de administración (PLAN §11, §15).
 *
 * Protege `/admin/*` (páginas) y `/api/admin/*` (rutas de contenido).
 * Se valida la cookie de sesión firmada con WebCrypto (edge-safe).
 *
 * - `/admin/login` y `/api/admin/login|logout` siempre accesibles.
 * - Sin sesión → las páginas redirigen a `/admin/login`, las APIs devuelven 401.
 * - Sin `ADMIN_PASSWORD` configurada, solo se deja ver la página de login
 *   con el aviso; todo el resto del panel queda bloqueado (fail-closed).
 */
import { NextRequest, NextResponse } from "next/server";

import { noStoreHeaders } from "@/infrastructure/admin/request-guard";
import {
  adminSessionCookieName,
  isAdminConfigured,
  verifyAdminSessionToken,
} from "@/infrastructure/admin/session";

const PUBLIC_PAGES = new Set(["/admin/login"]);
const PUBLIC_API = new Set(["/api/admin/login", "/api/admin/logout"]);

function withNoStore(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(noStoreHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const publicPath = isApi ? PUBLIC_API.has(pathname) : PUBLIC_PAGES.has(pathname);

  // Sin contraseña configurada: solo se puede ver /admin/login (aviso).
  if (!isAdminConfigured()) {
    if (!publicPath) {
      return withNoStore(
        isApi
          ? NextResponse.json({ error: "Panel no configurado." }, { status: 503 })
          : NextResponse.redirect(new URL("/admin/login", request.url)),
      );
    }
    return withNoStore(NextResponse.next());
  }

  if (publicPath) {
    // Ya autenticado no necesita volver a la pantalla de login.
    if (!isApi && pathname === "/admin/login") {
      const sessionToken = request.cookies.get(adminSessionCookieName())?.value;
      if (sessionToken && (await verifyAdminSessionToken(sessionToken))) {
        return withNoStore(NextResponse.redirect(new URL("/admin", request.url)));
      }
    }
    return withNoStore(NextResponse.next());
  }

  const sessionToken = request.cookies.get(adminSessionCookieName())?.value;
  const ok = await verifyAdminSessionToken(sessionToken);

  if (!ok) {
    return withNoStore(
      isApi
        ? NextResponse.json({ error: "No autorizado." }, { status: 401 })
        : NextResponse.redirect(new URL("/admin/login", request.url)),
    );
  }

  return withNoStore(NextResponse.next());
}
