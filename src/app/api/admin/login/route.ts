import { NextRequest, NextResponse } from "next/server";

import {
  adminPasswordMatches,
  adminSessionCookieName,
  createAdminSessionToken,
} from "@/infrastructure/admin/session";
import { noStoreHeaders, isTrustedRequest } from "@/infrastructure/admin/request-guard";
import { createInMemoryRateLimiter } from "@/infrastructure/rate-limit";
import { clientIpFromRequest } from "@/infrastructure/net/client-ip";

// Máx. 5 intentos por IP cada 15 min para frenar fuerza bruta.
const loginLimiter = createInMemoryRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
});

// Cookie anónima: cuando no llega IP (ej. acceso directo sin proxy) se usa
// como clave de rate limit por navegador, en vez de un bucket global
// compartido que un atacante podría llenar y bloquear a todos (H1.1).
const CLIENT_ID_COOKIE = "admin_client_id";

function resolveClientKey(request: NextRequest): { key: string; clientId: string | null } {
  const ip = clientIpFromRequest(request);
  if (ip) return { key: `admin-login:${ip}`, clientId: null };

  const existing = request.cookies.get(CLIENT_ID_COOKIE)?.value;
  if (existing) return { key: `admin-login:anon:${existing}`, clientId: null };

  const id = crypto.randomUUID();
  return { key: `admin-login:anon:${id}`, clientId: id };
}

function setClientIdCookie(response: NextResponse, clientId: string | null): void {
  if (!clientId) return;
  response.cookies.set(CLIENT_ID_COOKIE, clientId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
}

function denied(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: noStoreHeaders() });
}

export async function POST(request: NextRequest) {
  if (!isTrustedRequest(request)) {
    return denied("Origen no permitido.", 403);
  }

  const { key, clientId } = resolveClientKey(request);
  const limited = loginLimiter.check(key);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo más tarde." },
      {
        status: 429,
        headers: { ...noStoreHeaders(), "Retry-After": String(limited.retryAfterSeconds) },
      },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === "string") password = body.password;
  } catch {
    return denied("Cuerpo inválido.", 400);
  }

  const passwordOk = await adminPasswordMatches(password);

  // Pequeño retardo constante para no acelerar por diferencias de timing
  // en la verificación (los intentos correctos también sufren ~50 ms).
  await new Promise((resolve) => setTimeout(resolve, 50));

  if (!passwordOk) {
    const failed = denied("Contraseña incorrecta.", 401);
    setClientIdCookie(failed, clientId);
    return failed;
  }

  const token = await createAdminSessionToken();
  const response = NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
  setClientIdCookie(response, clientId);
  response.cookies.set(adminSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}
