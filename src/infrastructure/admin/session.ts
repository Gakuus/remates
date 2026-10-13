/**
 * Sesión del panel de administración (PLAN §11, §15).
 *
 * - Acceso con una única contraseña maestra (`ADMIN_PASSWORD`, SOLO servidor).
 * - El token viaja en una cookie HTTP-only y se firma con HMAC-SHA256.
 *   Se usa WebCrypto (`crypto.subtle`), disponible tanto en Node como en el
 *   edge runtime del middleware, así el mismo módulo valida en ambos lados.
 * - El token incluye su expiración; la firma cubre `v1|<expiración>`.
 * - Verificación y comparación de contraseña en tiempo constante.
 */

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 h de sesión

/**
 * Tokens revocados en este proceso (H3): tras logout el token deja de ser
 * válido aunque alguien lo haya capturado. Es best-effort: la lista vive en
 * memoria del proceso; en un despliegue multi-instancia conviene un store
 * compartido (Redis). Los tokens expirados se limpian junto con la TTL.
 */
const revokedTokens = new Set<string>();

const encoder = new TextEncoder();

function configuredPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

export function adminSessionCookieName(): string {
  return COOKIE_NAME;
}

/** ¿Hay contraseña configurada? Sin ella el panel no debe abrirse. */
export function isAdminConfigured(): boolean {
  return configuredPassword().length > 0;
}

/**
 * Comparación en tiempo constante.
 *
 * Se comparan digests SHA-256 de ambos lados: el tiempo no depende del
 * contenido ni de la longitud, y no filtra información a través del timing
 * (ni siquiera cuántos caracteres tiene la contraseña maestra).
 */
async function safeEqual(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftDigest);
  const b = new Uint8Array(rightDigest);
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

async function hmacSha256Hex(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(configuredPassword()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const bytes = new Uint8Array(signature);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

/** Genera un token `v1.<expiraciónMs>.<firma>` válido por SESSION_TTL. */
export async function createAdminSessionToken(now = Date.now()): Promise<string> {
  const payload = String(now + SESSION_TTL_MS);
  const signature = await hmacSha256Hex(`v1|${payload}`);
  return `v1.${payload}.${signature}`;
}

/** Valida firma y expiración. Devuelve `true` solo si todo coincide. */
export async function verifyAdminSessionToken(
  token: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (typeof token !== "string" || token.length === 0) return false;
  if (revokedTokens.has(token)) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const payload = parts[1];
  const signature = parts[2];
  if (!payload || !signature) return false;
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  const expected = await hmacSha256Hex(`v1|${payload}`);
  return safeEqual(signature, expected);
}

/** Verifica la contraseña maestra con comparación en tiempo constante. */
export async function adminPasswordMatches(input: string): Promise<boolean> {
  const password = configuredPassword();
  if (password.length === 0) return false;
  return safeEqual(input, password);
}

/**
 * Invalida una sesión: el token deja de verificarse en este proceso.
 * Se podan entradas ya expiradas para no acumular memoria.
 */
export function revokeAdminSessionToken(token: string): void {
  if (typeof token !== "string" || token.length === 0) return;

  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const candidate of revokedTokens) {
    const payload = Number(candidate.split(".")[1]);
    if (!Number.isFinite(payload) || payload <= cutoff) revokedTokens.delete(candidate);
  }

  revokedTokens.add(token);
}
