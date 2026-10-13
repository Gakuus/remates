# Arquitectura

> Resumen operativo de la arquitectura ya implementada. El detalle y el
> razonamiento viven en [`PLAN.md`](./PLAN.md) (§2 arquitectura, §16 estructura,
> §15 seguridad).

## Principio

Arquitectura **hexagonal pragmática** (puertos y adaptadores) con un núcleo de
dominio puro, casos de uso orquestando reglas, y adaptadores que conectan el
núcleo con el exterior (Next.js, Supabase, WhatsApp). El núcleo **no importa
nada de la infraestructura**.

```
                         ┌──────────────────────────────────────────┐
                         │              src/app (Next.js)           │
                         │  páginas · route handlers · metadata     │
                         └───────────────┬──────────────────────────┘
                                         │ llama a
                         ┌───────────────▼──────────────────────────┐
   presentación          │     src/adapters/presentation            │
   (view models,         │  property-presenter · detail-presenter   │
    JSON-LD, filtros)    └───────────────┬──────────────────────────┘
                                         │ usa
   aplicación ────────────┐   ┌──────────▼──────────────────────────┐
   (casos de uso,         │   │       src/application               │
    dtos Zod, puertos)    ├───┤  use-cases · ports · dtos           │
                         └──►└──────────┬──────────────────────────┘
                                        │ implementa
   dominio ─────────────────────┐       │
   (puro, sin imports)          │       │
                                │  ┌────▼────────────────────────────┐
                                │  │       src/adapters              │
                                │  │  supabase-* · inquiry-controller│
                                │  │  whatsapp-contact-channel       │
                                │  └────┬────────────────────────────┘
                                │       │ usa
                                │  ┌────▼────────────────────────────┐
                                └──►     src/infrastructure          │
                                   │  client · env · rate-limit      │
                                   │  supabase                       │
                                   └─────────────────────────────────┘
```

## Reglas de dependencia (ESLint `eslint-plugin-boundaries`)

Declaradas en `eslint.config.mjs` y verificadas con `npm run lint`:

| Elemento (raíz del import)       | Puede importar                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `src/domain/**`                  | `domain` (nada más)                                                               |
| `src/application/**`             | `domain`, `application` (Zod solo en `application/dtos`)                          |
| `src/adapters/infrastructure/**` | `domain`, `application`, `adapters`, `presentation`, `infrastructure`, `platform` |
| `src/adapters/presentation/**`   | `domain`, `application`, `presentation`                                           |
| `src/platform/**`                | todo + `presentation`                                                             |
| `src/ui/**`                      | `domain`, `application`, `platform`, `ui`, `presentation`                         |
| `src/app/**` (Next)              | todo                                                                              |

Restricciones adicionales (`no-restricted-imports`):

- `zod` **prohibido** en `domain/**` (el dominio no depende de librerías).
- Frameworks (next, react, supabase) **prohibidos** en `application/**`.
- `src/infrastructure/**` prohibido fuera de `application`/`adapters`/`platform`
  (el cliente de BD no llega a la UI ni al dominio).

Ojo con los detalles fáciles de romper:

- `presentation` se lista **primero** en la lista de elementos: sin eso,
  `ui → presentation` se resuelve como `ui → adapters` y falla.
- Los filtros/URL se parsean en `src/adapters/http/search-params.ts` (fuera de
  `ui`, para no crear `ui → adapters`). El componente de chips usa
  `ActiveFilter` de `src/adapters/presentation/active-filters.ts`.
- No existe `rounded-grande`: los radios son `rounded-suave` / `rounded-mas`
  (§9). `gris-calido` solo tiene variantes `-300`/`-600`.

## Capas

### `domain/`

Tipos y reglas de negocio puros: `Property`, `Price`, `Hectares`, `Slug`,
`PublicationStatus`, `FeatureCode` (`FEATURE_CODES`), `Inquiry`, más
`domain/rules/` (`image-rules.ts` con validación por magic bytes) y enums.
Cero imports externos.

### `application/`

- `ports/` — interfaces: `PropertyRepository`, `AuctionRepository`,
  `MachineryRepository`, `CatalogRepository`, `InquiryRepository`,
  `ImageStorage`, `ContactChannel`, `MapProvider`.
- `use-cases/` — catálogo de propiedades (`search-properties`, `…-lifecycle`),
  remates (`search-auctions`, `auction-lifecycle`), maquinaria
  (`search-machinery`, `machinery-lifecycle`) y `submit-inquiry`,
  `get-catalog-summary`.
- `dtos/` — esquemas Zod compartidos cliente+servidor (`inquiry-schema.ts`,
  `property-search-query-schema.ts`) y tipados del panel
  (`admin-content.ts` con `ContentKind`/`CONTENT_KINDS`, para no romper el
  límite `ui → infrastructure`).

### `adapters/`

- `http/` — parseo de querystring y controllers de route handler
  (`search-params.ts`, `inquiry-controller.ts`): devuelven códigos 400/421/422/
  429/500 y encabezados (`Retry-After`).
- `presentation/` — presentadores dominio→view model (`property-presenter`,
  `property-detail-presenter`, `seo-presenter`, `active-filters`).
- `supabase/` — repositorios (`supabase-property-repository`,
  `supabase-auction-repository`, `supabase-machinery-repository`,
  `supabase-catalog-repository`, `supabase-inquiry-repository`).
- `persistence/` — `in-memory-repositories.ts` (modo sin BD: Maps que viven en
  el proceso; `findBySlug` público oculta borradores igual que Supabase, y
  `update` mantiene sincronizados `byId` y `bySlug`). También aquí viven los
  adaptadores Postgres reales (`postgres-*.ts`) que escriben contra la BD local
  o remota vía `@/infrastructure/postgres/client`.
- `storage/` — `supabase-image-storage.ts` (Supabase Storage) y
  `local-image-storage.ts` (modo Postgres/sin BD: escribe en `.uploads` fuera
  de `public` —`next start` no sirve archivos agregados a `public` en runtime— y
  la URL `/uploads/...` la sirve una route handler + ruta de middleware público;
  con directorio inyectable para tests). Se elige en `container.ts` según
  `isSupabaseConfigured()`.
- `contact/`, `map/` — `WhatsappContactChannel` (puerto `ContactChannel`),
  `NoopMapProvider`.

### `platform/`

`container.ts` (composición: use cases, adaptadores y limpiador),
`admin-actions.ts` (server actions del panel: `createContent`, `changeStatus`,
`deleteContent`). Las acciones viven acá —y no en `app/`— porque `ui/` puede
importar `platform` pero no `app` (regla de boundaries), y así los formularios
del panel invocan las mutaciones directamente. Se usan **server actions** y no
route handlers porque comparten bundle con las páginas `/admin`.

### Modos de persistencia (prioridad en `container.ts`)

1. **Postgres real** cuando `DATABASE_URL` está configurada (protocolo
   `postgres:`/`postgresql:`): adaptadores `Postgres*Repository` + storage
   local de imágenes (`.uploads`).
2. **Supabase** cuando hay `NEXT_PUBLIC_SUPABASE_URL` (y no `DATABASE_URL`):
   repos Supabase + `SupabaseImageStorage`.
3. **Memoria** (demo) si no hay ninguna: repos in-memory; los datos viven en el
   proceso y se reinician al reiniciar. En build de producción la consistencia
   del bundle queda garantizada entre lo que escribe el panel y lo que leen
   catálogo y fichas públicas.

Los repos Postgres persisten además los hijos al actualizar (características,
imágenes y lotes con `delete + insert` transaccional).

### `infrastructure/`

`config/env.ts` (Zod sobre `process.env`, strings vacíos → ausentes; incluye
`ADMIN_PASSWORD` solo-servidor y `DATABASE_URL`/`isPostgresConfigured()`),
`supabase/client.ts` (anónimo vs service-role), `postgres/client.ts` (pool
`pg` perezoso, compartido por los adaptadores Postgres; no abre conexión al
importar, ver `scripts/db.mjs` para migraciones), `rate-limit.ts` (ventana
deslizante en memoria, `now` inyectable), `admin/` (`session.ts`: token HMAC
WebCrypto en cookie `admin_session`, TTL 12 h; `content.ts`: parseo Zod de
altas y lotes del panel).

### `ui/` y `app/`

- `src/ui/` — componentes presentacionales y features:
  `property/detail-view`, `auction/…`, `machinery/…`, `catalog-controls`,
  `property-card`; admin: `login-form`, `create-content-form`,
  `content-actions`, `content-list` (estos tres invocan
  `@/platform/admin-actions`). Primitivos en `components/`.
- `src/app/` — rutas App Router: catálogo (`/campos`, `/campos/[depto]/[slug]`),
  remates (`/remates`, `/remates/[slug]`), maquinaria
  (`/maquinaria`, `/maquinaria/[slug]`), admin (`/admin`, `/admin/login`,
  `/admin/{campos,remates,maquinaria}`), apis (`/api/inquiries`,
  `/api/admin/login`, `/api/admin/logout`), `robots.ts` / `sitemap.ts`,
  `middleware.ts` (protege `/admin/*` y `/api/admin/*`), layouts con metadata.

## Panel de administración (Sprint 10)

- Acceso: `POST /api/admin/login` valida `ADMIN_PASSWORD` (con rate limiting
  por IP y check de `Origin`) y emite `admin_session` (HMAC WebCrypto, 12 h).
  `middleware.ts` redirige a `/admin/login` si falta sesión y falla-cerrado si
  no hay contraseña configurada. Las páginas y APIs del panel responden con
  `Cache-Control: no-store` (`infrastructure/admin/request-guard.ts`).
  Auditoría de seguridad: `docs/SEGURIDAD.md`.
- Contenido: server actions en `platform/admin-actions.ts` (crear, publicar/
  despublicar, eliminar) que revalidan la sesión y las reglas de dominio
  (`cannot_publish` si faltan requisitos, p. ej. precio/foto en campos y
  maquinaria). El detalle público oculta todo lo que no esté `publicado`
  (consistente entre repos Supabase e in-memory).
- **Fotos en dos pasos** (`ui/features/admin/image-upload.tsx`):
  1. `POST /api/admin/images/upload` (route handler) valida el archivo
     (tamaño ≤ 8 MB, tipo, magia de bytes), lo sube al storage elegido
     (`public/uploads` o Supabase Storage) y devuelve `{storagePath, url}`.
     Es route handler a propósito: las imágenes superan el límite de cuerpo
     de las server actions, y la subida es IO sin estado en memoria (no
     rompe la consistencia del bundle).
  2. server action `attachContentImage` adjunta la imagen al aviso (mismo
     bundle que `/admin`), marcando la primera como principal. El
     `storagePath` se re-valida (kind + id exactos, UUID + extensión
     permitida) para no confiar en rutas del cliente. Publicar un aviso sin
     foto sigue bloqueado por las reglas de dominio.

## Flujo de una consulta (ejemplo: ficha)

1. `src/app/campos/[depto]/[slug]/page.tsx` → `generateMetadata` + `page`
   (server component, `force-dynamic`).
2. `container.useCases.getPropertyDetail` → `FindPropertyBySlug`.
3. Puerto `PropertyRepository` → `PropertySupabaseRepository`
   (`supabase.getPropertyBySlug`).
4. Dominio: `Property` + `property_features` → `presentPropertyDetail()`
   (agrupa `featureGroups` de §8.5, `quickFacts`, breadcrumb).
5. `src/ui/features/property/detail-view.tsx` renderiza §8.1–8.7 + sticky aside
   - CTA mobile. Si falla la BD, lanza → `src/app/error.tsx`.
6. Consulta enviada: `inquiry-form` (client) → `POST /api/inquiries` →
   `inquiry-controller` (Zod + honeypot + rate limit IP) →
   `SubmitInquiry` → `InquirySupabaseRepository` con **service role**.

## Cómo agregar un adaptador

1. Definir el **puerto** en `src/application/ports/` (interfaz + tipos puros).
2. Crear el **adaptador** en `src/adapters/<tipo>/` implementando ese puerto.
   Si habla con Supabase, usar `@/infrastructure/supabase/client`; si usa
   Postgres, `@/infrastructure/postgres/client`.
3. Registrarlo en `src/platform/container.ts` y exponerlo por el caso de uso
   correspondiente en `container.useCases`.
4. Consumirlo solo desde `application` (caso de uso) o desde `app/`/`ui/` vía
   presentadores. **Nunca** importar el adaptador concreto desde `ui/`.
5. Tests: caso de uso con puerto falso (`tests/application/…`) + adaptador
   (`tests/adapters/…`).
6. `npm run lint` valida que el grafo siga las reglas.

## Tests

- Vitest (`vitest.config.mts`): alias `@ → src`, `include: tests/**/*.test.{ts,tsx}`,
  `setupFiles` cargan `.env` si existe (`tests/setup-env.mts`).
- Ubicación espejo: `tests/domain`, `tests/application`, `tests/adapters`,
  `tests/infrastructure`, `tests/ui` (React Testing Library).
- `tests/adapters/postgres-repositories.test.ts` corre contra la BD real y se
  salta (skip) si no hay `DATABASE_URL` o el contenedor no está arriba.
- Correr: `npm test` (CI: `npm run lint && typecheck && test && format:check && build`).
