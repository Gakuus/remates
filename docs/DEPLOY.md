# Deploy

> Guía operativa de despliegue (PLAN §15 seguridad, §17 Sprint 7).
> Checklist final de salida en [`PLAN.md`](./PLAN.md) §20.

## 1. Variables de entorno

Validadas en arranque por `src/infrastructure/config/env.ts` (Zod). Un valor
inválido **impide arrancar**; un string vacío se trata como ausente.

| Variable                      | ¿Secreta? | Uso                                                                                                                                                      |
| ----------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                | **sí**    | Postgres real (`postgres://…` o `postgresql://…`). Es el modo de producción: con `DATABASE_URL` el sitio usa los adaptadores `Postgres*Repository`       |
| `NEXT_PUBLIC_SITE_URL`        | no        | canonical, sitemap, OG (ej. `https://camposdeluruguay.uy`)                                                                                               |
| `NEXT_PUBLIC_SITE_NAME`       | no        | nombre del sitio en metadata                                                                                                                             |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | no        | opcional; formato internacional `59899123456`                                                                                                            |
| `ADMIN_PASSWORD`              | **sí**    | **solo servidor**: contraseña maestra del panel `/admin`. Sin prefijo `NEXT_PUBLIC_`. Si falta, el panel queda bloqueado (login muestra aviso, APIs 503) |

- **Modos** (ver `src/platform/container.ts`): con `DATABASE_URL` → adaptadores
  Postgres (producción); sin ella → adaptadores en memoria (demo; los datos se
  reinician con el proceso).
- Las imágenes se guardan en el disco local del servidor (`.uploads`), servidas
  por `/uploads/...`. Necesitás **disco persistente** o un volumen montado.

- Plantilla: `.env.example` → copiar a `.env`.
- Regla: nada de `.env*` en git (`.gitignore` ya lo excluye).
- Rotar la contraseña de la base y `ADMIN_PASSWORD` si se filtraron.

## 2. Base de datos local (Postgres en Docker)

Para desarrollo y self-hosting persistente:

1. Levantar la BD + aplicar migraciones y seed:
   `npm run db:up` (o `npm run db:migrate` si el contenedor ya corre).
2. Utilidades: `npm run db:status` (tablas y filas), `npm run db:reset`
   (recrea de cero), `npm run db:down`.
3. `bash levantar.sh` detecta `DATABASE_URL` en `.env` y orquesta todo:
   `docker-compose up -d`, espera el healthcheck y corre `npm run db:migrate`.
4. Migraciones versionadas en `db/migrations/*.sql`; el runner
   (`scripts/db.mjs`) crea el schema `auth` y un stub de `auth.jwt()` antes de
   aplicar las migraciones (las políticas RLS los referencian).
5. La fuente de verdad del esquema son las migraciones; el contenedor vive en
   el puerto host 5433 por defecto (`docker-compose.yml`, variable
   `POSTGRES_PORT`).

## 3. Postgres en producción

1. Aprovisionar un Postgres gestionado (o self-hosted) con **disco
   persistente**; obtener la cadena de conexión para `DATABASE_URL`.
2. Aplicar migraciones + seed: `npm run db:migrate` (con `DATABASE_URL` de
   producción en el entorno). El seed carga **solo catálogos** (departments,
   property_types, publication_statuses, feature catalog).
3. Las migraciones definen políticas RLS por defensa en profundidad. La app
   conecta como owner de las tablas (las bypassa); si en el futuro agregás un
   rol de solo lectura, las políticas siguen vigentes.
4. Imágenes: el storage es el disco local del servidor (`.uploads`). Montá un
   **volumen persistente** que sobreviva a los deploys. En un entorno
   serverless efímero (p. ej. Vercel) este storage no sirve: usá un VPS o
   reemplazá `LocalImageStorage` por un adaptador S3-compatible.
5. Copias de vida: backups automáticos diarios + export puntual antes de cada
   migración.

## 4. Vercel

1. Import del repo (framework: Next.js, auto-detectado).
2. Settings → Environment Variables: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`,
   `ADMIN_PASSWORD` (fuerte), opcional `NEXT_PUBLIC_WHATSAPP_NUMBER`. Configurá
   `Production` (y `Preview` con una base de lectura si querés).
   **Aviso**: Vercel usa filesystem efímero, incompatible con el storage local
   de imágenes. Para Vercel necesitás un adaptador S3-compatible; con storage
   local, desplegá en un VPS con volumen persistente (ver §3).
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
  restaurar el backup de Postgres y re-desplegar el commit asociado.
- Checkpoint antes de cada release: `npm run lint && npm run typecheck &&
npm test && npm run format:check && npm run build`.

## 9. Pendientes explícitos (post-MVP)

- Email/WhatsApp reales en `ContactChannel` (hoy WhatsApp solo arma el link).
- Storage de objetos S3-compatible (para desplegar sin disco persistente).
- Contenido definitivo de la página `/nosotros` y foto del hero del inicio.
- Lighthouse con navegador real (no ejecutable sin red).

> Fotos del panel: ver `docs/ARQUITECTURA.md` (flujo upload → attach) y
> `docs/SEGURIDAD.md` (validación de archivos, rate limit, paths seguros).
