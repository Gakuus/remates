# Deploy

> Guía operativa de despliegue (PLAN §15 seguridad, §17 Sprint 7).
> Checklist final de salida en [`PLAN.md`](./PLAN.md) §20.

## 1. Variables de entorno

Validadas en arranque por `src/infrastructure/config/env.ts` (Zod). Un valor
inválido **impide arrancar**; un string vacío se trata como ausente.

| Variable                        | ¿Secreta? | Uso                                                                                                                                                      |
| ------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | **sí**    | Postgres real (`postgres://…` o `postgresql://…`). Con `DATABASE_URL` el sitio usa los adaptadores `Postgres*Repository` (prioridad máxima)              |
| `NEXT_PUBLIC_SUPABASE_URL`      | no        | API de Supabase (cliente anónimo)                                                                                                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no        | clave pública; protegida por RLS                                                                                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | **sí**    | solo servidor: `inquiries` y escrituras. Nunca con prefijo `NEXT_PUBLIC_`, nunca en el bundle                                                            |
| `NEXT_PUBLIC_SITE_URL`          | no        | canonical, sitemap, OG (ej. `https://camposdeluruguay.uy`)                                                                                               |
| `NEXT_PUBLIC_SITE_NAME`         | no        | nombre del sitio en metadata                                                                                                                             |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`   | no        | opcional; formato internacional `59899123456`                                                                                                            |
| `ADMIN_PASSWORD`                | **sí**    | **solo servidor**: contraseña maestra del panel `/admin`. Sin prefijo `NEXT_PUBLIC_`. Si falta, el panel queda bloqueado (login muestra aviso, APIs 503) |

- **Orden de prioridad** (ver `src/platform/container.ts`): Postgres
  (`DATABASE_URL`) → Supabase (`NEXT_PUBLIC_SUPABASE_URL`) → memoria.
- Si **no** hay `DATABASE_URL` ni Supabase, el sitio corre en modo demo: los
  datos viven en memoria del proceso (`InMemory*Repository`) y se reinician al
  reiniciar. Para un panel persistente, configurá Postgres o Supabase.

- Plantilla: `.env.example` → copiar a `.env`.
- Regla: nada de `.env*` en git (`.gitignore` ya lo excluye). Auditoría: `npm run build` +
  grep del bundle por fragmentos de la service role.
- Rotar claves si se filtraron; Rotación en Supabase → Project Settings → API.

## 2. Base de datos local (Postgres en Docker)

Para desarrollo y self-hosting persistente, sin necesidad de Supabase:

1. Levantar la BD + aplicar migraciones y seed:
   `npm run db:up` (o `npm run db:migrate` si el contenedor ya corre).
2. Utilidades: `npm run db:status` (tablas y filas), `npm run db:reset`
   (recrea de cero), `npm run db:down`.
3. `bash levantar.sh` detecta `DATABASE_URL` en `.env` y orquesta todo:
   `docker-compose up -d`, espera el healthcheck y corre `npm run db:migrate`.
4. Migraciones versionadas en `supabase/migrations/*.sql`; el runner local
   (`scripts/db.mjs`) ejecuta un preludio que crea el schema `auth` y un stub
   de `auth.jwt()` (que en producción provee Supabase) antes de las migraciones.
5. La fuente de verdad del esquema son las migraciones; el contenedor vive en
   el puerto host 5433 por defecto (`docker-compose.yml`, variable
   `POSTGRES_PORT`).

## 3. Supabase

1. Crear proyecto (región más cercana a Uruguay: `us-east-1`).
2. Aplicar migraciones en orden:
   `supabase/migrations/0001_initial_schema.sql` (Schema Editor o CLI).
3. Aplicar `supabase/seed.sql`: **solo catálogos** (departments, property_types,
   publication_statuses, feature catalog). No inserta propiedades de demo.
4. Storage: crear bucket público `property-images`; límite de tamaño
   8 MB y tipos `jpeg/png/webp/avif` (reglas en `domain/rules/image-rules.ts`).
5. RLS (`properties`, `property_features`, `property_photos`, `inquiries`,
   catálogos): lectura anónima solo de `published` + features de publicadas;
   inserts a `inquiries` **desde servidor** con service role (el cliente no
   tiene política de escritura). Verificar en el SQL Editor con la anon key:
   `select` debe ver solo publicadas y `insert` debe denegarse.
6. Copias de vida: backups automáticos diarios (plan de pago) + export
   puntual antes de cada migración.

## 4. Vercel

1. Import del repo (framework: Next.js, auto-detectado).
2. Settings → Environment Variables: agregar las de la tabla, por entorno
   (`Production` mínimo; `Preview` puede usar un proyecto Supabase separado o
   el mismo con lectura). No olvidar `ADMIN_PASSWORD` con una contraseña fuerte.
3. Build & Development Settings: `npm run build` por defecto, Node 24.
4. `next.config.ts` ya envía `Content-Security-Policy`,
   `Strict-Transport-Security`, `X-Frame-Options`, `Referrer-Policy` y
   `Permissions-Policy` — no repetirlas en el CDN.
5. Desplegar `main`. Verificar `/_headers` equivalentes con
   `curl -I https://dominio/`.

> Seguridad del panel: ver `docs/SEGURIDAD.md` (auditoría, amenazas cubiertas
> y riesgos residuales del rate limit en memoria).

Alternativa self-hosted: `npm run build && npm start` (Node ≥ 20) detrás de
un reverse proxy que también sirva `/public`.

## 5. Dominio y DNS

- Añadir dominio en Vercel → te da CNAME/ALIAS para el apex.
- DNS: apex `A`/`ALIAS` al endpoint de Vercel, `www` → CNAME.
- `NEXT_PUBLIC_SITE_URL=https://<dominio>` obligatorio: alimenta canonical,
  sitemap y OG. HTTPS forzado por HSTS (ya emitido por `next.config.ts`).
- Dominio verificado antes de pedir indexación.

## 6. CI/CD

`.github/workflows/ci.yml` corre en `push` a `main` y en PRs:
`npm ci → lint → typecheck → test → format:check → build` (con env de
placeholder). Merge sin checks rojos = deploy automático en Vercel.

## 7. Verificación post-deploy

- `curl -I` con headers de seguridad.
- `/robots.txt` y `/sitemap.xml` (fichas presentes), `/(depto)/(slug)` 200.
- `/departamentos` y una ficha: JSON-LD `RealEstateListing` + `Breadcrumb`.
- Formulario de contacto: validación 422, honeypot 201 sin insertar,
  cuarta petición rápida 429 con `Retry-After`.
- Lighthouse móvil (perf/SEO/accesibilidad ≥ 90).
- Consola del navegador sin errores.

## 8. Monitoreo y rollback

- Sentry (o Vercel Observability) + alerta de 5xx y de fallos de `/api/inquiries`.
- Log del servidor para `console.error("[inquiries] …")` (fallo de guardado).
- Rollback: Vercel → Deployments → promote el anterior; si hubo migración,
  restaurar backup de Supabase y re-desplegar el commit asociado.
- Checkpoint antes de cada release: `npm run lint && npm run typecheck &&
npm test && npm run format:check && npm run build`.

## 9. Pendientes explícitos (post-MVP)

- Los adaptadores Postgres sincronizan `*_images`, características y lotes al
  actualizar. En los repos Supabase las filas hijas aún no se upsertan al
  adjuntar foto desde el panel (la foto ya se muestra igual porque se guardan
  los `main_image_*` denormalizados).
- Email/WhatsApp reales en `ContactChannel` (hoy WhatsApp solo arma el link).
- Inquiries visibles en una vista admin.
- Lighthouse con navegador real (no ejecutable sin red).

> Fotos del panel: ver `docs/ARQUITECTURA.md` (flujo upload → attach) y
> `docs/SEGURIDAD.md` (validación de archivos, rate limit, paths seguros).
