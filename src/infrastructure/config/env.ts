import { z } from "zod";

/** Trata los strings vacíos de `.env` como si la variable no existiera. */
const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional(),
);

/**
 * Esquema de variables de entorno (docs/PLAN.md §15).
 * Se valida una única vez en el servidor. Las claves privadas jamás
 * llevan prefijo NEXT_PUBLIC_ (nunca llegan al bundle del cliente).
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.url().optional(),
  ),
  NEXT_PUBLIC_SITE_NAME: optionalString,
  NEXT_PUBLIC_WHATSAPP_NUMBER: optionalString,
});

const serverEnvSchema = z.object({
  ADMIN_PASSWORD: optionalString,
  DATABASE_URL: optionalString,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readEnv(): { public: PublicEnv; server: ServerEnv } {
  const publicParsed = publicEnvSchema.safeParse(process.env);
  const serverParsed = serverEnvSchema.safeParse(process.env);

  if (!publicParsed.success || !serverParsed.success) {
    const issues = [
      ...(publicParsed.success ? [] : publicParsed.error.issues),
      ...(serverParsed.success ? [] : serverParsed.error.issues),
    ];
    const detail = issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(
      `Variables de entorno inválidas:\n${detail}\n\nCopia .env.example a .env y completá los valores.`,
    );
  }

  return { public: publicParsed.data, server: serverParsed.data };
}

const env = readEnv();

/** Variables públicas (seguras en cliente y servidor). */
export const envPublic = env.public;

/** Variables de SOLO servidor. Prohibido importar desde componentes de cliente. */
export const envServer = env.server;

/** URL pública del sitio (para canonical, sitemap, OG). */
export const siteUrl = env.public.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const siteName = env.public.NEXT_PUBLIC_SITE_NAME ?? "Campos del Uruguay";

/**
 * ¿Hay Postgres local configurado? Cuando `DATABASE_URL` está presente, el
 * container usa adaptadores Postgres y todo persiste en la base real.
 */
export function isPostgresConfigured(): boolean {
  const url = env.server.DATABASE_URL;
  if (!url) return false;

  try {
    return new URL(url).protocol === "postgres:" || new URL(url).protocol === "postgresql:";
  } catch {
    return false;
  }
}
