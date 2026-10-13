import { NextRequest, NextResponse } from "next/server";

import { noStoreHeaders, isTrustedRequest } from "@/infrastructure/admin/request-guard";
import { adminSessionCookieName, revokeAdminSessionToken } from "@/infrastructure/admin/session";

export async function POST(request: NextRequest) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json(
      { error: "Origen no permitido." },
      { status: 403, headers: noStoreHeaders() },
    );
  }

  // Revoca el token server-side: no alcanza con borrar la cookie, un token
  // copiado seguiría siendo válido 12 h (H3).
  const currentToken = request.cookies.get(adminSessionCookieName())?.value;
  if (currentToken) revokeAdminSessionToken(currentToken);

  const response = NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
  response.cookies.set(adminSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
