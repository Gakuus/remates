# PLAN — Plataforma de Campos y Terrenos Rurales a la Venta (Uruguay)

> **Estado:** Etapa de planificación — **NO implementado**.
> **Propósito de este documento:** dejar el proyecto planificado para pasar a implementación sin rediseñar la arquitectura.
> **Regla de esta etapa:** no se escribe código de la aplicación, no se crean tablas, componentes ni lógica de negocio.

> **Nota de vigencia (post-planificación).** Este documento refleja las
> decisiones originales de la etapa de planificación. En la implementación se
> reemplazó **Supabase por un Postgres directo** (driver `pg`): las secciones
> que mencionan Supabase (p. ej. §12, RLS, storage) se conservan como registro
> histórico del razonamiento. Las fuentes operativas y actualizadas son
> [`ARQUITECTURA.md`](./ARQUITECTURA.md) y [`DEPLOY.md`](./DEPLOY.md).

---

## Índice

1. [Evaluación tecnológica](#1-evaluación-tecnológica)
2. [Arquitectura](#2-arquitectura)
3. [Patrón UI/UX](#3-patrón-uiux)
4. [Página de inicio](#4-página-de-inicio)
5. [Catálogo](#5-catálogo)
6. [Tarjetas de campos](#6-tarjetas-de-campos)
7. [Sistema de filtros](#7-sistema-de-filtros)
8. [Ficha de cada campo](#8-ficha-de-cada-campo)
9. [Identidad visual](#9-identidad-visual)
10. [Responsive](#10-responsive)
11. [Modelo de datos](#11-modelo-de-datos)
12. [Supabase](#12-supabase)
13. [SEO](#13-seo)
14. [Rendimiento](#14-rendimiento)
15. [Seguridad](#15-seguridad)
16. [Estructura del proyecto](#16-estructura-del-proyecto)
17. [MVP](#17-mvp)
18. [Sprints](#18-sprints)
19. [Documentación futura](#19-documentación-futura)
20. [Regla final y checklist de salida](#20-regla-final-y-checklist-de-salida)

---

## 1. Evaluación tecnológica

### Stack seleccionado

| Capa                 | Tecnología                                               | Veredicto |
| -------------------- | -------------------------------------------------------- | --------- |
| Lenguaje             | **TypeScript (strict)**                                  | Adoptar   |
| Framework            | **Next.js (App Router)**                                 | Adoptar   |
| UI                   | **React + Tailwind CSS**                                 | Adoptar   |
| Backend/Persistencia | **Supabase (PostgreSQL + Storage + Auth + RLS)**         | Adoptar   |
| Calidad              | ESLint, Prettier, validación de datos, testing selectivo | Adoptar   |

### Por qué este stack es adecuado para este proyecto

**TypeScript estricto**
El dominio tiene entidades con reglas (precio, superficie, estado de publicación, características binarias). Tipar el dominio evita errores silenciosos (metros vs hectáreas, USD vs UYU, estados inválidos) y documenta las reglas por código. Con `strict: true` y `noUncheckedIndexedAccess` se eliminan clases enteras de bugs en filtros y mapeos de datos.

**Next.js (App Router)**
Es la pieza que resuelve más requisitos del proyecto a la vez:

- **Rendering:** las páginas de inicio, catálogo y ficha son mayoritariamente contenido público que debe posicionar en buscadores → **Server Components + SSG/ISR**. No necesitamos un SPA pesado.
- **Routing:** URLs amigables por departamento/localidad (`/campos/paysandu/estancia-la-esperanza`) son routing de Next, con _generación dinámica de rutas_ y `generateMetadata()` para SEO por propiedad.
- **Backend ligero:** las consultas de contacto, el sitemap y los endpoints puntuales se resuelven con **Route Handlers** (`app/api/**`), sin levantar un servidor separado.
- **Optimización de imágenes:** `next/image` resuelve lazy loading, formatos modernos (WebP/AVIF) y tamaños responsivos, que es crítico porque la fotografía es el elemento protagonista.
- **Incrementalidad:** ISR permite regenerar la ficha de un campo cuando cambia, sin rebuild completo.

**React + Server Components**
La arquitectura hexagonal obliga a decidir dónde vive cada cosa. Next.js App Router permite que los casos de uso se ejecuten en el servidor (sin exponer claves ni lógica) y que solo sean Client Components los elementos realmente interactivos (filtros, formulario, galería deslizable). Esto minimiza el JS enviado al navegador.

**Tailwind CSS + componentes reutilizables propios**
Se eligió Tailwind porque:

- El sistema de diseño es propio (identidad rural específica), no una plantilla: Tailwind no impone una estética, solo provee primitivas de utilidad.
- Facilita un **design token** único (colores `monte`, `oliva`, `salvia`, `beige`, `crema`, `arena`, `tierra`, `gris-calido`) usado igual en Server y Client Components.
- Evita el costo de un sistema de estilos más pesado (CSS-in-JS) para un proyecto con rendering mayoritariamente en servidor.
- La iconografía se resuelve con un set consistente (p. ej. `lucide-react`) en lugar de mezclar fuentes de iconos.

La contraparte —y es una decisión consciente— es que **los componentes se escriben a medida** según la identidad definida en la sección 9, tomando de plantilla solo la infraestructura (no la estética).

**Supabase (PostgreSQL)**
Es adecuado porque entrega, sobre una base Postgres estándar y portable:

- **PostgreSQL** para datos estructurados y consultas con filtros complejos (rango de precio, rango de hectáreas, joins de características) — las consultas del catálogo son SQL relacional clásico, donde Postgres es fuerte.
- **Storage** para fotografías, con URLs firmables y transformación de imágenes, evitando construir un servicio de uploads propio.
- **Auth** preparado para el panel administrativo futuro, sin incorporar un proveedor de identidad ahora.
- **RLS** como mecanismo nativo para el requisito central: _público ve publicados, admin gestiona todo_.
- **API auto-generada** (PostgREST) que nos ahorra escribir un CRUD, pero —clave para la arquitectura— **no se usará directamente desde la UI**: siempre detrás de puertos y adaptadores.

Postgres además es requisito implícito del proyecto, así que no hay que justificar la elección del motor, sino su encapsulamiento.

**Calidad (ESLint, Prettier, validación, testing)**

- ESLint con reglas de Next.js y TypeScript.
- Prettier para formateo consistente (con `plugin:tailwindcss` para orden de clases).
- **Zod** para validación de datos: se usa tanto en el servidor (formularios, parámetros de búsqueda) como para tipar los objetos que salen de los adaptadores. Es el punto donde la validación y la tipificación se unifican.
- Testing selectivo (ver sección 17): prioridad a reglas de dominio y casos de uso, no a testear CSS.

### Alternativas evaluadas

| Alternativa                                             | Por qué no se adopta (para este proyecto)                                                                                                                                                                                                     |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Remix / SvelteKit**                                   | Válidos, pero Next.js ofrece mejor soporte nativo de SSG/ISR + metadata + image optimization, que es exactamente lo que pide un portal de propiedades con SEO. Cambiar el stack obligaría a resolver manualmente lo que Next resuelve.        |
| **Prisma / Drizzle + API propia**                       | Más capas que mantener. Supabase ya provee Postgres + storage + auth + RLS. Además, la arquitectura hexagonal permite reemplazar Supabase por Prisma después **sin tocar dominio ni casos de uso** (justamente para eso existen los puertos). |
| **Next.js + Pages Router**                              | App Router da Server Components, `generateMetadata` por ruta y una separación más natural de servidor/cliente.                                                                                                                                |
| **Tailwind + shadcn/ui u otra librería de componentes** | Aporta velocidad, pero impone una estética genérica de dashboard/inmobiliaria urbana, exactamente lo que el proyecto quiere evitar. Se toma solo la idea de componentes reutilizables, escritos a medida.                                     |
| **CMS (Sanity, Strapi, WordPress)**                     | Aportaría un panel, pero acopla el contenido a un tercero y complica el modelo de datos. El panel admin se resuelve con Supabase Auth + RLS en una fase posterior.                                                                            |
| **Mapbox/Google Maps desde el inicio**                  | El mapa no es obligatorio para el MVP. La arquitectura prevé un adaptador de mapa (sección 2 y 5) para incorporarlo sin tocar el dominio.                                                                                                     |
| ** ORM sobre Supabase**                                 | Innecesario para el volumen inicial; la capa de persistencia va detrás de un puerto, así que es un cambio local posterior si se necesita.                                                                                                     |

### Conclusión de la evaluación

El stack es **adecuado y no requiere cambios**. No se detecta ninguna alternativa claramente superior para ninguna capa que justifique un cambio; las alternativas superiores (p. ej. Prisma) serían mejores solo en un escenario donde Supabase no estuviera disponible, y ese escenario está cubierto por la arquitectura hexagonal.

---

## 2. Arquitectura

### Enfoque: Arquitectura Hexagonal (Ports & Adapters), práctica

El objetivo es que **el dominio y los casos de uso no dependan de Supabase, Next.js, ni de ningún framework**, de modo que la plataforma pueda cambiar de proveedor de storage, de base de datos o de UI sin rediseñar el núcleo.

Se aplica una versión **pragmática**: capas claras y dependencias en una sola dirección, sin crear abstracciones por abstraccionismo.

#### Regla de dependencia

```
UI (app/, components/)  ──▶  Casos de uso (application/)  ──▶  Dominio (domain/)
        │                              │
        │                              ▼
        └──────────────────────▶  Puertos (ports/)
                                          ▲
                                          │  (implementados por)
                                   Adaptadores (adapters/)
                                          ▲
                                          │
                                   Infraestructura (supabase/, config/)
```

- `domain/` no importa nada de afuera (ni React, ni Supabase, ni Next).
- `application/` importa `domain/` y `ports/` (interfaces) — nada más.
- `adapters/` importa `ports/` + `domain/` + tecnologías concretas.
- `app/` y `components/` importan casos de uso y, vía composición, adaptadores (solo en la capa de composición/arranque).
- Las adaptaciones se **ensamblan en un único punto de composición** (p. ej. `src/platform/container.ts`) para no dispersar la creación de dependencias.

### Dominio

Entidades y conceptos (puras, sin I/O):

| Concepto                                   | Responsabilidad                                                                                                                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Campo (Property)**                       | Entidad principal: identidad, nombre, precio, superficie, descripción, tipo, estado, ubicación, características, fotografías.                                           |
| **Ubicación (Location)**                   | Departamento, localidad, coordenadas opcionales, texto de accesos.                                                                                                      |
| **Precio (Price)**                         | Valor monetario + moneda (USD por defecto), valor opcional de precio por hectárea derivado.                                                                             |
| **Características (Features)**             | Conjunto de atributos: aptitud productiva, agua, arroyo/río, monte, casa, galpón, corrales, alambrados, electricidad, acceso por ruta, mejoras.                         |
| **Fotografías (Image)**                    | Orden, texto alternativo, si es principal, estado de carga.                                                                                                             |
| **Tipo de campo (PropertyType)**           | Agrícola, Ganadero, Mixto (y extensible).                                                                                                                               |
| **Estado de publicación (PropertyStatus)** | Borrador, Publicado, Destacado, Vendido/Retirado.                                                                                                                       |
| **Consulta de contacto (Inquiry)**         | Contacto entrante asociado a un campo: nombre, teléfono, email, mensaje, fecha, estado.                                                                                 |
| **Valores de dominio**                     | `Hectareas`, `Precio`, `Slug`, `Coordenadas` — con validación (hectáreas > 0, precio ≥ 0).                                                                              |
| **Reglas de dominio**                      | p. ej.: solo un campo puede estar `Publicado`; un campo `Publicado` requiere precio, superficie, tipo, ubicación y al menos una foto; `Destacado` requiere `Publicado`. |

> Los catálogos (tipos, estados, departamentos, aptitudes) se modelan como **valores de dominio tipados + tablas de referencia en BD**, no como lógica dispersa.

### Aplicación (casos de uso)

Cada caso de uso es una función/clase que orquesta puertos. Ninguna conoce SQL ni React.

| Caso de uso                                   | Descripción                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `CreateProperty`                              | Alta de campo (borrador) con validación de dominio.                                                    |
| `UpdateProperty`                              | Edición de datos de un campo.                                                                          |
| `PublishProperty`                             | Valida reglas de publicación y cambia estado → `Publicado`.                                            |
| `UnpublishProperty`                           | Cambia estado → `Borrador` (o `Retirado`).                                                             |
| `GetPropertyBySlug`                           | Obtiene un campo para su ficha (solo publicados, públicamente).                                        |
| `SearchProperties`                            | Búsqueda + filtros + ordenamiento + paginación; devuelve también el total para `N campos encontrados`. |
| `GetFeaturedProperties`                       | Campos destacados para la portada.                                                                     |
| `GetRecentProperties`                         | Publicados más recientes para la portada.                                                              |
| `GetCatalogFacets`                            | Opciones disponibles para filtros (departamentos, tipos, rangos).                                      |
| `ManagePropertyImages`                        | Alta/borrado/reordenamiento de fotos, marcado de principal, subida a storage.                          |
| `SubmitInquiry`                               | Recibe y valida una consulta de contacto; limita abuso.                                                |
| `ListDepartments` / `GetDepartmentAggregates` | Zonas y conteos para la sección de departamentos.                                                      |

### Puertos (interfaces)

Definidas en `src/application/ports/` (o `src/ports/`), implementadas por adaptadores:

| Puerto                                      | Método principal                                                                               | Implementado por                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- |
| `PropertyRepository`                        | `create`, `update`, `findById`, `findBySlug`, `search(criteria)`, `listFeatured`, `listRecent` | `SupabasePropertyRepository`           |
| `PropertyCatalogRepository`                 | `listTypes`, `listStatuses`, `listDepartments`, `listAptitudes`                                | `SupabaseCatalogRepository`            |
| `ImageStorage`                              | `upload(file, path)`, `remove(path)`, `getPublicUrl(path)`, `list(prefix)`                     | `SupabaseImageStorage`                 |
| `PropertyImageRepository`                   | `add`, `remove`, `reorder`, `setMain`                                                          | `SupabaseImageRepository`              |
| `InquiryRepository`                         | `save(inquiry)`                                                                                | `SupabaseInquiryRepository`            |
| `InquiryNotifier` _(futuro)_                | `notify(inquiry)`                                                                              | Adaptador de email/WhatsApp (post-MVP) |
| `SearchCriteria` / value objects de entrada | —                                                                                              | —                                      |
| `MapProvider` _(futuro)_                    | `renderStatic(coords)`, `embed(...)`                                                           | Adaptador Mapbox/Google (post-MVP)     |
| `ContactChannel` _(futuro)_                 | `buildWhatsAppUrl(property, message)`                                                          | Adaptador WhatsApp (post-MVP)          |
| `Clock` / `IdGenerator`                     | para fechas e IDs deterministas en tests                                                       | Adaptadores en memoria                 |

### Adaptadores

| Adaptador           | Tecnología                                                 | Nota                                                            |
| ------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| Persistencia        | Supabase PostgREST / SQL                                   | Único punto que conoce tablas y columnas.                       |
| HTTP/Entrada        | Next.js Server Actions y/o Route Handlers                  | Traducen request → caso de uso → respuesta.                     |
| Presentación        | Componentes React + adaptadores de vista                   | Mapean modelos de dominio a props de UI; sin lógica de negocio. |
| Storage de imágenes | Supabase Storage                                           | Validación de tipo/tamaño antes de subir.                       |
| Mapas               | Post-MVP                                                   | Interfaz ya declarada.                                          |
| Contacto            | Formulario → `InquiryRepository` (email/WhatsApp post-MVP) |                                                                 |

### Infraestructura

- `src/infrastructure/supabase/`: clientes (browser/server), mappers BD→dominio, consultas SQL.
- `src/infrastructure/config/`: variables de entorno validadas con Zod al arrancar.
- `src/platform/container.ts`: composición de adaptadores (punto único de wiring).

### Pragmatismo anti-sobreingeniería

Reglas explícitas para no caer en exceso:

1. **Una carpeta por capa, no un paquete por entidad.** No monorepo, no DI framework: un `container.ts` simple con constructores.
2. **Casos de uso = funciones** cuando no hay estado compartido; clases solo si aportan (p. ej. `PublishProperty` con varias reglas).
3. **Sin repositorios genéricos** (`GenericRepository<T>`): interfaces concretas por necesidad real.
4. **Sin eventos, CQRS, saga, ni capas de "servicio" redundantes.** Si un caso de uso es `get X`, no se crea un servicio extra.
5. **Los puertos se crean solo cuando hay más de una implementación real o cuando hay testing/mock.** Ej.: `MapProvider` se declara pero se implementa en el MVP como adaptador `NoopMapProvider`.
6. **El dominio no lleva framework**: nada de decorators, ORM ni React en `domain/`.
7. Se abstrae **lo que cambia** (Supabase, storage, mapa, notificador), no lo que es estable (reglas de negocio).

---

## 3. Patrón UI/UX

### Patrón: **Editorial Rural + Property Discovery**

La referencia es una **revista/catálogo editorial de campos** (fotografía protagonista, tipografía serif con carácter, ritmo de páginas amplio) combinada con las **convenciones ya aprendidas por el usuario en portales de propiedades** (buscador visible, filtros, tarjetas comparables, ficha con galería y CTA).

### Jerarquía de información (inviolable)

```
Fotografía → Ubicación → Precio → Hectáreas → Características → Descripción → Contacto
```

Cada pantalla respetará este orden de atención. Si un elemento no tiene lugar en esa jerarquía, no va en la pantalla.

### Principios

1. **La fotografía manda.** Imágenes grandes, poco ruido alrededor, marcos limpios. El texto acompaña, no compite.
2. **Ritmo editorial.** Secciones amplias, aire (espaciado generoso), contraste jerárquico tipográfico (serif para titulares, sans para datos).
3. **Descubrimiento, no administración.** El usuario explora y compara; nunca ve algo que parezca un formulario interno, una tabla de datos o un KPI.
4. **Calma visual.** Colores apagados y naturales, sin saturación, sin gradientes llamativos, sin sombras duras, sin bordes decorativos en exceso.
5. **Acción clara.** Cada vista tiene un objetivo: portada → buscar; catálogo → filtrar y abrir ficha; ficha → consultar.

### Lo que explícitamente NO debe parecer

- Un dashboard / panel administrativo.
- Una página administrativa genérica.
- Una inmobiliaria urbana genérica (departamentos, amenities, metros cuadrados).
- Una web rural antigua (tablas con bordes, degradados azul-verde de los 2000, GIFs, tipografía por defecto).

### Debe sentirse como

**Una marca especializada en campos uruguayos**: confiable, terrena, sofisticada sin pretensión, con orgullo por el territorio.

### Mapeo de patrón a componentes

| Pantalla | Expresión del patrón                                                                    |
| -------- | --------------------------------------------------------------------------------------- |
| Portada  | Portada de revista: hero fotográfico a pantalla completa + buscador como pieza central. |
| Catálogo | Índice editorial: grid de tarjetas fotográficas con datos mínimos.                      |
| Ficha    | Artículo de fondo: galería, ficha de datos, texto largo, mapa, cierre con CTA.          |

---

## 4. Página de inicio

### Hero

- **Fotografía rural de gran tamaño** (a pantalla completa en desktop, compacta en mobile), con una capa oscura sutil para legibilidad del texto (sin degradado llamativo).
- **Logo/nombre de la marca** (arriba, como parte del header sobre el hero).
- **Título** (serif, grande) + **Subtítulo** (sans, muted).
- **Buscador principal** como pieza destacada sobre la imagen.

#### Buscador principal (campos)

| Campo         | Comportamiento                            |
| ------------- | ----------------------------------------- |
| Departamento  | Select/combobox con los 19 departamentos. |
| Localidad     | Select dependiente del departamento.      |
| Tipo de campo | Agrícola / Ganadero / Mixto (+ "Todos").  |
| Superficie    | Rango: desde / hasta (ha) o preset.       |

Acción: `Buscar campos` → navega a `/campos?...` con los parámetros ya aplicados.

#### Accesos rápidos (chips bajo el buscador)

`Agrícola` · `Ganadero` · `Mixto` · `+100 ha` · `+500 ha`

Cada chip aplica el filtro correspondiente y abre el catálogo.

### Secciones posteriores

| #   | Sección                        | Contenido                                                                                    |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| 1   | **Campos destacados**          | 3–6 tarjetas de campos destacados (`GetFeaturedProperties`).                                 |
| 2   | **Recientemente publicados**   | Grid de los últimos publicados (`GetRecentProperties`).                                      |
| 3   | **Zonas / departamentos**      | Tiles por departamento con cantidad de campos (ej. `Paysandú · 8 campos`).                   |
| 4   | **Remates próximos**           | Próximos remates con fecha/lugar (ver §11 `auctions`). Enlaza a `/remates`.                  |
| 5   | **Maquinaria**                 | Últimos avisos de maquinaria (ver §11 `machinery`). Enlaza a `/maquinaria`.                  |
| 6   | **Presentación de la empresa** | Bloque editorial: quiénes somos, foto, texto, valores.                                       |
| 7   | **CTA**                        | Doble CTA: "Consultá por un campo" y "Publicá tu campo" (el segundo abre un flujo/contacto). |
| 8   | **Footer completo**            | Navegación, departamentos, contacto, legales, marca.                                         |

---

## 5. Catálogo

Experiencia de descubrimiento en `/campos`, `/remates` y `/maquinaria`. Las
secciones 5–8 describen el patrón de catálogo/ficha; cada tipo de contenido
define sus propios filtros y detalles (ver §11).

### Catálogo de campos — `/campos`

### Desktop

```
┌────────────────────────────────────────────────────────┐
│  Barra de búsqueda (texto + acceso a filtros)         │
│  Ordenar: [Relevancia ▾]   42 campos encontrados      │
├──────────────┬─────────────────────────────────────────┤
│  Filtros     │  Grid de propiedades (2–3 columnas)     │
│  (sidebar)   │                                         │
│  Principales │                                         │
│  Más filtros │                                         │
│  Chips de    │                                         │
│  filtros act.│                                         │
└──────────────┴─────────────────────────────────────────┘
```

- **Barra de búsqueda:** término libre + acceso rápido a filtros.
- **Filtros:** panel lateral sticky (sidebar) en desktop.
- **Ordenamiento:** Relevancia (default), Más recientes, Precio ↑, Precio ↓, Superficie ↑, Superficie ↓.
- **Cantidad de resultados:** siempre visible (`42 campos encontrados`).
- **Grid de propiedades:** tarjetas (sección 6).
- **Chips de filtros activos:** permiten eliminar filtros individualmente.

### Mobile

- Filtros mediante **panel/modal** a pantalla completa (ver sección 10).
- Una tarjeta por fila.
- Ordenamiento en un select compacto.

### Arquitectura preparada para Lista + Mapa

El modelo de búsqueda (`SearchCriteria` → `SearchResult { items, total, facets }`) es independiente de la presentación. Incorporar mapa futuro implica:

1. Un adaptador `MapProvider` (ya declarado, con implementación `Noop` en MVP).
2. Un modo de vista `list | map | split` en la UI del catálogo.
3. Que `SearchResult` incluya coordenadas por ítem (el dominio ya prevé `Coordenadas` opcionales).

Nada de esto requiere tocar dominio ni casos de uso. **El mapa no entra en el MVP.**

### Parámetros de URL

Los filtros viven en la URL (`?depto=paysandu&tipo=ganadero&ha_min=100&orden=precio_asc`) para:

- Compartible / SEO-friendly.
- Restaurar estado al navegar atrás.
- Renderizado del servidor con los mismos datos que ve el usuario.

---

## 6. Tarjetas de campos

### Contenido de la tarjeta

| Elemento                    | Detalle                                                    |
| --------------------------- | ---------------------------------------------------------- |
| Fotografía principal        | 4:3 o 3:2, esquinas suaves, sin saturar.                   |
| Cantidad de fotografías     | Badge discreto (ej. `📷 8`).                               |
| Nombre del campo            | Serif, 1–2 líneas.                                         |
| Departamento · Localidad    | Sans, muted, con icono.                                    |
| Precio                      | Sans, peso visual alto.                                    |
| Superficie                  | `450 ha`.                                                  |
| Tipo de campo               | Chip/etiqueta (`Ganadero`).                                |
| Características principales | 2–4 íconos con tooltip (ej. casa, agua, ruta, monte).      |
| Estado                      | Solo si es relevante (`Destacado`, `Reservado`/`Vendido`). |
| CTA                         | `Ver campo →`.                                             |

### Ejemplo conceptual

```
┌──────────────────────────────┐
│ [foto]                [8]   │
│                              │
│ Estancia La Esperanza        │
│ Paysandú · Uruguay           │
│ 450 ha · Ganadero            │
│ USD 1.250.000                │
│ ⌂ 🌊 🛤 🌲                  │
│ Ver campo →                  │
└──────────────────────────────┘
```

### Principio

**La tarjeta no muestra toda la información.** Genera interés y lleva a la ficha completa. Si un dato no supera el test de "¿ayuda a decidir si hago clic?", no va en la tarjeta.

### Estados de la tarjeta

- Hover sutil (elevación mínima o cambio de opacidad de la foto — sin sombras fuertes).
- Skeleton mientras carga.
- Estado `Vendido/Retirado`: desaturada o con overlay, deshabilitada.

---

## 7. Sistema de filtros

Pensados específicamente para **propiedades rurales** (no filtros de inmobiliaria urbana).

### Filtros principales (visibles)

| Filtro        | Tipo                                              |
| ------------- | ------------------------------------------------- |
| Departamento  | Lista/select (19).                                |
| Localidad     | Select dependiente.                               |
| Precio        | Rango USD (desde / hasta) + presets.              |
| Hectáreas     | Rango (desde / hasta) + presets (`+100`, `+500`). |
| Tipo de campo | Agrícola / Ganadero / Mixto (multi o single).     |

### Filtros avanzados (dentro de "Más filtros")

| Filtro             | Tipo                                               |
| ------------------ | -------------------------------------------------- |
| Aptitud productiva | Agrícola / Ganadero / Mixto / Mixta fina… (multi). |
| Agua               | Sí/No, o tipo (manantial, aljibe, perforación).    |
| Arroyo / río       | Sí/No.                                             |
| Monte              | Sí/No o superficie aprox.                          |
| Casa               | Sí/No (+ tipo: casa principal, casa de peón).      |
| Galpón             | Sí/No.                                             |
| Corrales           | Sí/No.                                             |
| Alambrados         | Sí/No (o estado).                                  |
| Electricidad       | Sí/No (red rural / propia).                        |
| Acceso por ruta    | Sí/No + tipo de ruta.                              |
| Mejoras            | Texto/multi (infraestructura en general).          |

### Comportamiento del panel de filtros

- Sección **"Más filtros"** colapsable dentro del panel.
- **Contador siempre visible:** `42 campos encontrados` (actualiza con cada cambio).
- **Chips de filtros activos** con `×` individual para eliminar filtros uno a uno.
- Botón **"Limpiar todos"**.
- En mobile: panel/modal a pantalla completa con sticky footer (`Ver 42 campos`).
- Los filtros aplican sobre el servidor (via `SearchProperties`) → compatible con SSR/SEO.

---

## 8. Ficha de cada campo

La ficha funciona como una **landing page de la propiedad**. Orden:

### 8.1 Galería

- Imagen principal grande + strip/thumbnails secundarios.
- Lightbox a pantalla completa.
- Badge de cantidad; indicador de foto activa.
- Mobile: **galería deslizable** (swipe).

### 8.2 Información principal (inmediatamente bajo la galería)

- **Nombre** (serif, grande).
- **Ubicación:** `Departamento · Localidad · Uruguay`.
- **Precio** (destacado) + **Superficie** + **Tipo** + **Estado**.
- CTA primario visible: **"Consultar por este campo"** (sticky en mobile).

### 8.3 Características (visual)

Bloque con icono + label + valor, agrupado:

| Grupo         | Ítems                                                                      |
| ------------- | -------------------------------------------------------------------------- |
| Superficie    | Total (ha), y desglose si existe (agropecuaria / forestal / improductiva). |
| Aptitud       | Agrícola / Ganadero / Mixto.                                               |
| Agua          | Fuente(s), arroyo/río.                                                     |
| Acceso        | Acceso por ruta, tipo de camino.                                           |
| Mejoras       | Estado/general.                                                            |
| Instalaciones | Casa, galpón, corrales.                                                    |
| Electricidad  | Sí/No, tipo.                                                               |
| Monte         | Sí/No, tipo.                                                               |

### 8.4 Descripción

Texto completo, tipografía de lectura (ancho de columna ~65–75 caracteres, interlineado amplio).

### 8.5 Información productiva (solo cuando exista)

- Tipo de suelo.
- Productividad.
- Uso actual.
- Potencial agrícola.
- Potencial ganadero.
- Recursos hídricos.

Se renderiza **solo si el campo tiene datos** (no mostrar bloques vacíos).

### 8.6 Ubicación

- Mapa (adaptador `MapProvider`; en MVP, estático o embed simple, o bloque con texto de accesos si no hay coordenadas).
- Explicación de accesos (texto editorial: distancias a ruta, ciudades, etc.).

### 8.7 Contacto

**CTA destacado:** _"Consultar por este campo"_.

Formulario:

- Nombre
- Teléfono
- Email
- Mensaje (pre-cargado con plantilla sugerida: _"Hola, me interesa {campo} ({ubicación})."_)

- Validación cliente + servidor (Zod).
- Confirmación de envío sin recargar (óptimistic / Server Action).
- **Arquitectura preparada para WhatsApp:** el botón se resuelve vía puerto `ContactChannel`; en MVP puede ocultarse o apuntar a un número configurable por env.

---

## 9. Identidad visual

### Inspiración

El campo uruguayo: monte, sierra, tierra, cielo amplio, texturas naturales, arquitectura rural. Estética **rústica + elegante + moderna + natural + confiable**.

### Paleta

| Token         | Color (referencia)      | Uso                               |
| ------------- | ----------------------- | --------------------------------- |
| `monte`       | Verde monte `#2F4A3C`   | Color primario, headers, botones. |
| `oliva`       | Verde oliva `#6B7A4F`   | Acentos, iconografía, links.      |
| `salvia`      | Verde salvia `#A3B18A`  | Fondos suaves, chips, hover.      |
| `beige`       | Beige `#E7E0D3`         | Fondos de sección.                |
| `crema`       | Crema `#F6F1E7`         | Fondo base de página.             |
| `arena`       | Arena `#D9CBA9`         | Bordes sutiles, separadores.      |
| `tierra`      | Marrón tierra `#5C4433` | Textos secundarios, detalles.     |
| `gris-calido` | Gris cálido `#8A8178`   | Texto muted, metadatos.           |

> Los valores exactos se afinan en Sprint 1 con contraste WCAG AA verificado. Regla: **apagados, naturales, nunca saturados.**

### Tipografía

| Rol               | Estilo                                                                                 | Ejemplo de uso                               |
| ----------------- | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| Display / Títulos | **Serif elegante** (p. ej. `Fraunces`, `Playfair Display`, `Source Serif 4`, o `Lora`) | H1, nombres de campo, títulos de sección.    |
| Interfaz / Datos  | **Sans-serif moderna** (p. ej. `Inter`, `IBM Plex Sans`, `Söhne`-like)                 | Párrafos, filtros, precios, labels, botones. |

- Precios y superficies: sans con `font-variant-numeric: tabular-nums` para alineación.
- Escala tipográfica fluida (`clamp()`) para respetar mobile-first.

### Estética — hacer / evitar

**Sí:**

- Fotografía como elemento protagonista.
- Espaciado amplio y ritmo editorial.
- Bordes redondeados suaves (8–12px) y solo donde aportan.
- Jerarquía por tipografía y aire, no por cajas.
- Iconografía de línea consistente (un solo set).

**No:**

- Colores excesivamente saturados.
- Gradientes exagerados.
- Sombras fuertes.
- Animaciones excesivas (solo transiciones sutiles de opacidad/transform).
- Demasiados bordes.
- Exceso de información en pantalla.

---

## 10. Responsive

**Enfoque: mobile-first.**

### Mobile

- Hero compacto (imagen de fondo + buscador simplificado).
- **Buscador simple:** 1 campo principal + "Más filtros".
- **Filtros** mediante panel/modal a pantalla completa.
- Una tarjeta por fila.
- Galería deslizable (swipe) en la ficha.
- **CTA de contacto accesible** (barra sticky inferior en la ficha).
- Ordenamiento en select.

### Desktop

- Grid de 2–3 columnas en catálogo.
- Filtros laterales (sidebar sticky) o superiores.
- Mayor protagonismo fotográfico (hero grande, galería amplia).
- Posibilidad futura de **lista + mapa**.

### Breakpoints sugeridos

`sm 640 · md 768 · lg 1024 · xl 1280` (estándar Tailwind) + verificación en 320/375/414.

---

## 11. Modelo de datos

Modelo inicial de **PostgreSQL**. Objetivo: **sin tablas innecesarias**, pero con lugar para crecer.

### Entidades propuestas

#### `property_types` (referencia)

| Campo  | Tipo                   | Notas                           |
| ------ | ---------------------- | ------------------------------- |
| `id`   | `smallint PK`          |                                 |
| `code` | `text UNIQUE NOT NULL` | `agricola`, `ganadero`, `mixto` |
| `name` | `text NOT NULL`        |                                 |

> Evaluación: **tabla separada** justificada — el tipo aparece en filtros, URLs/labels, y es extensible. Podría ser un `enum`, pero una tabla permite traducción/agregación y evita `ALTER TYPE`. Se elige **tabla**.

#### `property_statuses` (referencia)

| Campo  | Tipo                   | Notas                                          |
| ------ | ---------------------- | ---------------------------------------------- |
| `id`   | `smallint PK`          |                                                |
| `code` | `text UNIQUE NOT NULL` | `borrador`, `publicado`, `retirado`, `vendido` |
| `name` | `text NOT NULL`        |                                                |

> **Decisión:** separar `destacado` como **booleano/columna en `properties`**, no como estado. Motivo: un campo publicado _además_ puede estar destacado; son ejes distintos. Así `estado` = ciclo de vida, `is_featured` = promoción.

#### `locations` (referencia)

| Campo          | Tipo            | Notas                       |
| -------------- | --------------- | --------------------------- |
| `id`           | `bigserial PK`  |                             |
| `department`   | `text NOT NULL` | 19 departamentos (catálogo) |
| `locality`     | `text`          | Opcional                    |
| `latitude`     | `numeric(9,6)`  | Opcional                    |
| `longitude`    | `numeric(9,6)`  | Opcional                    |
| `access_notes` | `text`          | Explicación de accesos      |

> **Evaluación:** se mantienen `department` y `locality` como texto normalizado por catálogo (con CHECK o tabla de referencia si se necesita agregación por departamento — que sí se necesita en la portada: _"Paysandú · 8 campos"_). **Decisión:** mantener `department` como texto + índice, y crear una vista/consulta agregada; si en Sprint 3 se necesita un catálogo editable, se promueve a tabla `departments`. Esto evita una tabla extra en el MVP.

> **¿Por qué `locations` separada de `properties`?** Una ubicación 1:1 con el campo aporta poco. **Decisión revisada:** en el MVP se **embeben los campos de ubicación dentro de `properties`** (`department`, `locality`, `latitude`, `longitude`, `access_notes`) para evitar un join innecesario en el 100% de las consultas. Se conserva el concepto de _Ubicación_ en el **dominio** como value object. Si más adelante se necesita reutilizar ubicaciones (p. ej. bodegas, administradores), se extrae la tabla sin tocar la capa de dominio (solo el adaptador). **Tabla `locations` NO se crea en el MVP.**

#### `properties`

| Campo             | Tipo                              | Null | Notas                       |
| ----------------- | --------------------------------- | ---- | --------------------------- |
| `id`              | `uuid PK`                         | NO   | `gen_random_uuid()`         |
| `slug`            | `text UNIQUE NOT NULL`            | NO   | `estancia-la-esperanza`     |
| `name`            | `text NOT NULL`                   | NO   |                             |
| `status_id`       | `smallint FK → property_statuses` | NO   | default `borrador`          |
| `type_id`         | `smallint FK → property_types`    | NO   |                             |
| `price`           | `numeric(14,2)`                   | SÍ   | USD; NULL = "a consultar"   |
| `currency`        | `text` default `'USD'`            | NO   |                             |
| `hectares`        | `numeric(10,2) NOT NULL`          | NO   | > 0                         |
| `department`      | `text NOT NULL`                   | NO   |                             |
| `locality`        | `text`                            | SÍ   |                             |
| `latitude`        | `numeric(9,6)`                    | SÍ   |                             |
| `longitude`       | `numeric(9,6)`                    | SÍ   |                             |
| `access_notes`    | `text`                            | SÍ   |                             |
| `description`     | `text`                            | SÍ   |                             |
| `is_featured`     | `boolean` default `false`         | NO   | eje de promoción            |
| `main_image_path` | `text`                            | SÍ   | denormalizado para tarjetas |
| `main_image_url`  | `text`                            | SÍ   | URL pública/resuelta        |
| `inquiry_count`   | `integer` default `0`             | NO   | opcional, métrica futura    |
| `published_at`    | `timestamptz`                     | SÍ   | para orden "más recientes"  |
| `created_at`      | `timestamptz` default `now()`     | NO   |                             |
| `updated_at`      | `timestamptz` default `now()`     | NO   | trigger                     |

#### `property_features`

Filas EAV-lite para características **binarias/descriptivas**:

| Campo          | Tipo                                     | Notas                                                                                                                  |
| -------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `property_id`  | `uuid FK → properties ON DELETE CASCADE` | PK compuesta                                                                                                           |
| `feature_code` | `text`                                   | PK compuesta. Ej: `casa`, `galpon`, `corrales`, `alambrados`, `electricidad`, `acceso_ruta`, `monte`, `agua`, `arroyo` |
| `value`        | `text`                                   | `true`/`false` o valor corto (`"manantial"`, `"red rural"`)                                                            |

**PK:** `(property_id, feature_code)`. **Índice:** `(feature_code, property_id)` para filtrar.

> **Evaluación — EAV vs columnas:**
>
> - **Columnas fijas** (`has_casa boolean`, …): más simple y con checks, pero cada filtro nuevo = `ALTER TABLE` + migración de UI.
> - **EAV (tabla `property_features`):** los filtros avanzados se resuelven con `EXISTS` y se pueden agregar características sin migración.
> - **Decisión:** `property_features` (EAV acotado) para los **atributos de filtro**, porque el listado de "Más filtros" es exactamente el tipo de cosa que crece (aparece "pozo", "silo", "solar agnóstico"). Se mantiene **acotado**: no se vuelve un ORM genérico; los `feature_code` son un catálogo de dominio tipado.
> - `aptitude` (productiva) y `mejoras` pueden vivir igual como filas con `value` textual.

**Tabla combinada vs separada:** se evaluó `property_features` como tabla única de pares (elegido) frente a una fila por atributo o columnas; la opción de columnas se descarta por fricción de migración y la de tabla única con muchas columnas por sparsity.

#### `property_images`

| Campo          | Tipo                                     | Notas                    |
| -------------- | ---------------------------------------- | ------------------------ |
| `id`           | `uuid PK`                                |                          |
| `property_id`  | `uuid FK → properties ON DELETE CASCADE` |                          |
| `storage_path` | `text NOT NULL`                          | path en Supabase Storage |
| `url`          | `text`                                   | resuelta o derivada      |
| `alt_text`     | `text`                                   | SEO/accesibilidad        |
| `sort_order`   | `smallint` default `0`                   |                          |
| `is_main`      | `boolean` default `false`                |                          |
| `created_at`   | `timestamptz`                            |                          |

**Índices:** `(property_id, sort_order)`; índice **único parcial** `(property_id) WHERE is_main` para garantizar una sola foto principal.

> Evaluación: tabla separada es obligatoria (1:N fotos). Se mantiene `main_image_*` denormalizado en `properties` para que las tarjetas del catálogo no hagan join ni subquery en cada fila.

#### `machinery_categories` (referencia)

| Campo  | Tipo                   | Notas                                                                                                              |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `id`   | `smallint PK`          |                                                                                                                    |
| `code` | `text UNIQUE NOT NULL` | `tractor`, `cosechadora`, `sembradora`, `pulverizadora`, `camion`, `acoplado`, `herramientas`, `repuestos`, `otro` |
| `name` | `text NOT NULL`        |                                                                                                                    |

#### `auctions` (remates)

| Campo             | Tipo                              | Null | Notas                             |
| ----------------- | --------------------------------- | ---- | --------------------------------- |
| `id`              | `uuid PK`                         | NO   |                                   |
| `slug`            | `text UNIQUE NOT NULL`            | NO   |                                   |
| `title`           | `text NOT NULL`                   | NO   |                                   |
| `status_id`       | `smallint FK → property_statuses` | NO   | default `borrador`; mismo ciclo   |
| `event_status`    | `text` default `'proximo'`        | NO   | `proximo`/`realizado`/`cancelado` |
| `scheduled_at`    | `timestamptz NOT NULL`            | NO   | fecha y hora del remate           |
| `location`        | `text`                            | SÍ   | lugar físico / establecimiento    |
| `auctioneer`      | `text`                            | SÍ   | martillero responsable            |
| `minimum_bid`     | `numeric(14,2)`                   | SÍ   | base del lote principal (USD)     |
| `currency`        | `text` default `'USD'`            | NO   |                                   |
| `description`     | `text`                            | SÍ   |                                   |
| `is_featured`     | `boolean` default `false`         | NO   |                                   |
| `main_image_path` | `text`                            | SÍ   |                                   |
| `main_image_url`  | `text`                            | SÍ   |                                   |
| `published_at`    | `timestamptz`                     | SÍ   |                                   |
| `created_at`      | `timestamptz` default `now()`     | NO   |                                   |
| `updated_at`      | `timestamptz` default `now()`     | NO   | trigger                           |

#### `auction_lots`

| Campo         | Tipo                                   | Notas                            |
| ------------- | -------------------------------------- | -------------------------------- |
| `id`          | `uuid PK`                              |                                  |
| `auction_id`  | `uuid FK → auctions ON DELETE CASCADE` |                                  |
| `lot_number`  | `integer NOT NULL`                     | `UNIQUE(auction_id, lot_number)` |
| `title`       | `text`                                 |                                  |
| `description` | `text`                                 |                                  |
| `minimum_bid` | `numeric(14,2)`                        | base del lote                    |
| `sort_order`  | `smallint` default `0`                 |                                  |

#### `auction_images` / `machinery_images`

Misma estructura que `property_images` (`storage_path`, `url`, `alt_text`,
`sort_order`, `is_main`) con FK a `auctions(id)` / `machinery(id)` y su índice
`(parent_id, sort_order)` + único parcial `(parent_id) WHERE is_main`.

#### `machinery`

| Campo             | Tipo                                 | Null | Notas                          |
| ----------------- | ------------------------------------ | ---- | ------------------------------ |
| `id`              | `uuid PK`                            | NO   |                                |
| `slug`            | `text UNIQUE NOT NULL`               | NO   |                                |
| `title`           | `text NOT NULL`                      | NO   | ej. "Tractor John Deere 5075E" |
| `category_id`     | `smallint FK → machinery_categories` | NO   |                                |
| `brand`           | `text`                               | SÍ   |                                |
| `model`           | `text`                               | SÍ   |                                |
| `year`            | `smallint`                           | SÍ   |                                |
| `hours_used`      | `integer`                            | SÍ   | horas de uso                   |
| `price`           | `numeric(14,2)`                      | SÍ   | USD; NULL = "a consultar"      |
| `currency`        | `text` default `'USD'`               | NO   |                                |
| `department`      | `text NOT NULL`                      | NO   |                                |
| `locality`        | `text`                               | SÍ   |                                |
| `description`     | `text`                               | SÍ   |                                |
| `status_id`       | `smallint FK → property_statuses`    | NO   | default `borrador`             |
| `is_featured`     | `boolean` default `false`            | NO   |                                |
| `main_image_path` | `text`                               | SÍ   |                                |
| `main_image_url`  | `text`                               | SÍ   |                                |
| `published_at`    | `timestamptz`                        | SÍ   |                                |
| `created_at`      | `timestamptz` default `now()`        | NO   |                                |
| `updated_at`      | `timestamptz` default `now()`        | NO   | trigger                        |

#### `inquiries`

| Campo          | Tipo                                      | Notas                                             |
| -------------- | ----------------------------------------- | ------------------------------------------------- |
| `id`           | `uuid PK`                                 |                                                   |
| `property_id`  | `uuid FK → properties ON DELETE SET NULL` | de los tres sujetos se completa **a lo sumo uno** |
| `auction_id`   | `uuid FK → auctions ON DELETE SET NULL`   | consulta sobre un remate                          |
| `machinery_id` | `uuid FK → machinery ON DELETE SET NULL`  | consulta sobre un aviso de maquinaria             |
| `name`         | `text NOT NULL`                           |                                                   |
| `phone`        | `text`                                    |                                                   |
| `email`        | `text NOT NULL`                           |                                                   |
| `message`      | `text NOT NULL`                           |                                                   |
| `status`       | `text` default `'nuevo'`                  | `nuevo`/`respondido`/`archivado`                  |
| `source`       | `text` default `'web'`                    | extensible: `whatsapp`                            |
| `created_at`   | `timestamptz`                             |                                                   |

**Índices:** `(property_id)`, `(auction_id)`, `(machinery_id)`, `(created_at DESC)`, `(status)`.

> **Decisión:** una sola tabla `inquiries` con sujeto polimórfico acotado
> (`property_id` | `auction_id` | `machinery_id`, con CHECK de que solo uno se
> complete). Evita tres tablas de consultas casi idénticas y el formulario de
> contacto se reutiliza con un `subject` tipado en el dominio.

> **Decisión:** no separar `contact` de `inquiry`; una sola tabla. Sin tabla de "leads" ni CRM en el MVP.

### Entidades evaluadas y NO creadas en el MVP

| Entidad descartada                    | Motivo                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `locations` (tabla)                   | Embebida en `properties` (1:1, join innecesario).                                |
| `departments` (tabla)                 | Catálogo fijo de 19; se usa texto + índice. Se promueve si se necesita editable. |
| `users` / `favorites` / `comparisons` | Post-MVP.                                                                        |
| `property_videos` / `tours`           | Post-MVP (ver 17).                                                               |
| `inquiry_replies`                     | El estado simple cubre el MVP.                                                   |
| Tablas de traducción/i18n             | Español (UY) como único idioma en MVP.                                           |

### Relaciones (resumen)

```
property_types     1 ──── N  properties  N ──── 1  property_statuses
                               │
                               ├── 1 ──── N  property_images
                               ├── 1 ──── N  property_features
                               └── 1 ──── N  inquiries

auctions           1 ──── N  auction_lots
                               ├── 1 ──── N  auction_images
                               └── 1 ──── N  inquiries

machinery_categories 1 ──── N  machinery  N ──── 1  property_statuses
                               ├── 1 ──── N  machinery_images
                               └── 1 ──── N  inquiries
```

> `auctions` y `machinery` se integran a los sprints 8–9; comparten el ciclo de
> estado `property_statuses` (`borrador`/`publicado`/`retirado`/`vendido`).
> Las imágenes se modelan en tablas propias (`auction_images`,
> `machinery_images`) manteniendo el patrón de `property_images`; un esquema
> `media` genérico se evaluaría solo si apareciera un cuarto tipo.

### Índices importantes (para el catálogo)

```sql
-- Desempate y orden principal
CREATE INDEX idx_properties_status_published
  ON properties (status_id, published_at DESC) WHERE status_id = <publicado>;

-- Filtros combinados
CREATE INDEX idx_properties_dept_type
  ON properties (department, type_id);

-- Rangos de precio y superficie
CREATE INDEX idx_properties_price  ON properties (price);
CREATE INDEX idx_properties_hect   ON properties (hectares);

-- Búsqueda por nombre (inicio)
CREATE INDEX idx_properties_name_trgm
  ON properties USING gin (name gin_trgm_ops);

-- Featured para portada
CREATE INDEX idx_properties_featured
  ON properties (is_featured, published_at DESC) WHERE is_featured;

-- Slug ya es UNIQUE (búsqueda de ficha)
```

> Nota: búsquedas de texto libre por nombre/descripción → `pg_trgm` (GIN). Se evalúa `tsvector` si el volumen/ relevancia lo exige; para un MVP con decenas/cientos de campos, `pg_trgm` es suficiente y simple.

### Obligatoriedad (reglas de publicación)

| Campo                                               | Alta (borrador) | Para `Publicado`                                |
| --------------------------------------------------- | --------------- | ----------------------------------------------- |
| `name`, `slug`, `type_id`, `department`, `hectares` | Obligatorio     | Obligatorio                                     |
| `price`                                             | Opcional        | Obligatorio (o marcado explícito "a consultar") |
| `description`                                       | Opcional        | Recomendado (mínimo)                            |
| Fotos                                               | Opcional        | **≥ 1 con foto principal**                      |
| `locality`, coordenadas, features, info productiva  | Opcional        | Opcional                                        |

Estas reglas viven en el **dominio** (`Property.canPublish()`), no en la BD (aunque un `CHECK` o trigger puede reforzarlo).

#### Reglas de publicación de `auctions` y `machinery`

| Contenido  | Para `Publicado` obligatorio                                                          | Opcional                          |
| ---------- | ------------------------------------------------------------------------------------- | --------------------------------- |
| Remate     | `title`, `slug`, `scheduled_at`, `event_status = 'proximo'`, `location`, `auctioneer` | base, lotes, fotos, `minimum_bid` |
| Maquinaria | `title`, `slug`, `category`, `department`, `price` (o "a consultar")                  | marca, modelo, año, horas, fotos  |

Viven en `Auction.canPublish()` y `MachineryItem.canPublish()` respectivamente.

---

## 12. Supabase

### PostgreSQL

- Datos estructurados (modelo de la sección 11).
- Migraciones versionadas en `supabase/migrations/*.sql` (CLI de Supabase).
- Seeds para catálogos (`property_types`, `property_statuses`, departamentos).

### Storage

- Bucket: `property-images` (público de lectura para imágenes publicadas, o con URLs firmadas; decisión: **público de lectura** para simplificar CDN/SEO, **escritura solo autenticada**).
- Estructura: `properties/{property_id}/{image_id}.webp`.
- Validación en el adaptador: formatos `jpeg/png/webp/avif`, tamaño máx. (p. ej. 10 MB), y **transformación** (resize/cover) antes de servir.
- Bordeado: al eliminar un campo o una foto, se limpia el objeto en storage.

### Auth

- **No se usa en el MVP público.**
- Dejado preparado: esquema `auth.users` nativo; RLS lista para `auth.uid()`.
- Post-MVP: login para administradores, rol `admin` (custom claim o tabla `profiles`).

### RLS (estrategia)

Objetivo: **público ve publicados; admin gestiona todo; nadie más escribe.**

| Tabla                                 | Lectura pública                                                      | Escritura                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `property_types`, `property_statuses` | `USING (true)` (catálogos)                                           | Solo `admin`                                                                                      |
| `properties`                          | Solo filas `status = publicado` para anónimos; **todo** para `admin` | Solo `admin`                                                                                      |
| `property_images`                     | Solo si su propiedad está publicada                                  | Solo `admin`                                                                                      |
| `property_features`                   | Solo si su propiedad está publicada                                  | Solo `admin`                                                                                      |
| `inquiries`                           | Solo `admin`                                                         | **INSERT** permitido a anónimos (vía Service Role o policy de insert limitada); SELECT solo admin |

Políticas esquemáticas:

```sql
-- properties: lectura pública solo publicados
CREATE POLICY public_read_published ON properties
  FOR SELECT USING (status_id = (SELECT id FROM property_statuses WHERE code='publicado'));

CREATE POLICY admin_all ON properties
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

**Detalle crítico de seguridad:** las escrituras del público (consulta de contacto) y cualquier mutación administrativa deben realizarse **desde el servidor** (Next.js Route Handler / Server Action) usando la **Service Role Key**, que **nunca** llega al navegador. El cliente público usa la `anon` key (con RLS) solo para lecturas si fuera necesario, o mejor: también vía servidor. Esto se detalla en sección 15.

---

## 13. SEO

La plataforma debe posicionar **cada campo individualmente**.

| Elemento                         | Plan                                                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **URLs amigables**               | `/campos/{departamento-slug}/{slug-campo}` (ej. `/campos/paysandu/estancia-la-esperanza`). Slugs ASCII sin acentos (`montevideo`, `treinta-y-tres`).                      |
| **Metadata dinámica**            | `generateMetadata()` por ruta: `title`, `description`, `canonical` desde el dominio. Título único por propiedad: `"Estancia La Esperanza — 450 ha en Paysandú             | {Marca}"`. |
| **Open Graph / Twitter**         | Imagen principal de la propiedad como `og:image` (1200×630), título/descripción dedicados.                                                                                |
| **Sitemap**                      | `app/sitemap.ts` dinámico: home, catálogo, departamentos, fichas publicadas, con `lastModified`.                                                                          |
| **robots.txt**                   | `app/robots.ts`: permitir `/campos/**`, `/`; bloquear `/api/**`, rutas admin y parámetros de filtro duplicados (o `canonical` a la URL base del catálogo).                |
| **SEO local**                    | Incluir en copy/metadata el patrón "campos en {departamento}", "terrenos en {localidad}"; páginas por departamento con copy propio.                                       |
| **Datos estructurados**          | **JSON-LD**: `RealEstateListing` (+ `Place`, `GeoCoordinates`, `Offer`) en fichas; `Organization` y `WebSite` (+ `SearchAction`) en home; `BreadcrumbList` en navegación. |
| **Títulos únicos por propiedad** | Garantizado por `generateMetadata` desde `name + hectares + department`.                                                                                                  |
| **Optimización de imágenes**     | `next/image` con `sizes`, `priority` solo above-the-fold, `alt` descriptivo por foto (visible en buscadores de imágenes).                                                 |
| **Enlazado interno**             | Tarjetas → ficha; ficha → "campos similares del departamento"; home → departamentos → catálogo filtrado.                                                                  |
| **Renderizado**                  | Fichas y catálogo renderizados en el servidor (SSG/ISR) para indexación completa (sin depender de JS).                                                                    |

---

## 14. Rendimiento

| Área                  | Plan                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Imágenes**          | `next/image` + Supabase Storage con transformación; formatos modernos; `sizes` correctos en grids; hero con `priority`.                                                               |
| **Lazy loading**      | Below-the-fold (`loading="lazy"` implícito en `next/image`), galería secundaria diferida, lightbox cargado bajo demanda (`dynamic`).                                                  |
| **Renderizado**       | Server Components por defecto en home, catálogo y ficha (SSG/ISR). Client Components solo donde hay interactividad real: filtros, buscador, galería/lightbox, formulario de contacto. |
| **JS mínimo**         | No importar librerías pesadas en el servidor; `dynamic import()` para mapas/lightbox/slider. Sin carousels gigantes en el primer render.                                              |
| **ISR**               | `revalidate` en catálogo y fichas para refrescar sin rebuild.                                                                                                                         |
| **Data fetching**     | Consultas del catálogo con selección de columnas (no `select *`); fetch de listados en servidor, sin llamadas cliente innecesarias.                                                   |
| **Mobile**            | Presupuesto de JS estricto; cero CSS-in-JS; fuentes con `next/font` (`display: swap`) y solo 2 familias/2 pesos clave.                                                                |
| **Caché**             | `fetch` cacheado / `revalidateTag` al publicar.                                                                                                                                       |
| **Métricas objetivo** | LCP < 2.5s, CLS < 0.1, INP < 200ms en 4G móvil.                                                                                                                                       |

---

## 15. Seguridad

| Área                                   | Plan                                                                                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Validación de formularios**          | Esquemas **Zod** compartidos: se validan en cliente (UX) y **siempre en servidor** (fuente de verdad). Errores tipados de vuelta a la UI.                                                         |
| **Sanitización**                       | React escapa por defecto (XSS). Se evita `dangerouslySetInnerHTML`. Campos de texto libre (mensaje, descripción) se validan por longitud y tipo; si se rinde Markdown futuro, usar parser seguro. |
| **Protección de datos**                | Contacto: solo se persisten datos del formulario. No se exponen emails/telefonos internos en el cliente.                                                                                          |
| **Variables de entorno**               | Validadas al arrancar con Zod. `NEXT_PUBLIC_*` solo para lo no sensible (`anon key`, URL). **`SERVICE_ROLE_KEY` y credenciales solo en servidor.**                                                |
| **RLS**                                | Ver sección 12. Defensa en profundidad incluso si algo llega al cliente.                                                                                                                          |
| **Control de acceso admin**            | Post-MVP con Supabase Auth + rol. Todas las escrituras por servidor con rol adecuado.                                                                                                             |
| **Validación de archivos**             | Extensión + MIME + firma (magic bytes) + tamaño máx. + conteo por propiedad; rechazo de no-imágenes. Nombre de archivo generado por servidor (sin `../` ni nombres del usuario).                  |
| **Límites de formularios de contacto** | Rate limiting por IP/sesión (p. ej. máx. 3 envíos / 10 min / IP), longitud máxima de mensaje, honeypot anti-bot, y verificación básica (reCAPTCHA solo si hay abuso).                             |
| **Transporte y headers**               | HTTPS forzado; headers de seguridad via `next.config` (`X-Content-Type-Options`, `Referrer-Policy`, `CSP` básica, `X-Frame-Options`).                                                             |
| **SQL**                                | Consultas parametrizadas vía cliente Supabase; nunca concatenación de SQL.                                                                                                                        |
| **Sin secretos en el frontend**        | Regla absoluta: ninguna clave privada en el bundle del cliente.                                                                                                                                   |

---

## 16. Estructura del proyecto

Evaluación: el ejemplo `src/domain|application|ports|adapters|infrastructure|app|components` es correcto en espíritu, pero hay que **evitar duplicar `app/` (Next) y `components/` fuera de `src/`**, y separar claramente lo que es UI de lo que es núcleo.

### Propuesta de estructura

```
/
├── docs/                          # PLAN.md y documentación
├── public/                        # estáticos (logo, og-default, favicon)
├── supabase/
│   ├── migrations/                # SQL versionado
│   └── seed.sql                   # catálogos iniciales
├── src/
│   ├── domain/                    # ⬛ Núcleo: cero dependencias externas
│   │   ├── entities/              # Property, Inquiry, PropertyImage...
│   │   ├── value-objects/         # Hectares, Price, Slug, Coordinates, Aptitude
│   │   ├── enums/                 # PropertyTypeCode, StatusCode, FeatureCode
│   │   ├── rules/                 # publishRules, slugRules
│   │   └── index.ts
│   │
│   ├── application/               # ⬛ Casos de uso (orquestan puertos)
│   │   ├── use-cases/             # search-properties.ts, publish-property.ts...
│   │   ├── dtos/                  # SearchCriteria, SearchResult, PropertySummary
│   │   └── ports/                 # ⬛ Interfaces (PropertyRepository, ImageStorage...)
│   │
│   ├── adapters/                  # ⬛ Implementaciones concretas
│   │   ├── persistence/           # SupabasePropertyRepository, mappers BD→dominio
│   │   ├── storage/               # SupabaseImageStorage
│   │   ├── http/                  # server actions / route handler controllers
│   │   ├── presentation/          # presenters: dominio → view models
│   │   ├── map/                   # NoopMapProvider (post: MapboxAdapter)
│   │   └── contact/               # FormContactAdapter (post: WhatsAppAdapter)
│   │
│   ├── infrastructure/            # ⬛ Clientes y config
│   │   ├── supabase/              # clients (server/browser), env types
│   │   ├── config/                # env schema (Zod), constants
│   │   └── logging/
│   │
│   ├── platform/
│   │   └── container.ts           # ⬛ Composición: wire de adaptadores
│   │
│   ├── ui/                        # ⬛ Todo lo visual (Next + Tailwind)
│   │   ├── components/            # componentes reutilizables (Button, Chip, Field...)
│   │   ├── features/              # composiciones por feature
│   │   │   ├── home/              # Hero, SearchBar, FeaturedGrid...
│   │   │   ├── catalog/           # FilterPanel, PropertyGrid, SortBar, ActiveFilters
│   │   │   ├── property/          # Gallery, FeatureList, InquiryForm, StickyCta
│   │   │   └── layout/            # Header, Footer, Breadcrumbs
│   │   ├── styles/                # globals.css, tokens (tailwind config)
│   │   └── icons/
│   │
│   └── app/                       # ⬛ Next.js App Router (rutas + composición)
│       ├── layout.tsx             # fuentes, provider base, metadata raíz
│       ├── page.tsx               # portada
│       ├── campos/
│       │   ├── page.tsx           # catálogo
│       │   └── [depto]/[slug]/page.tsx   # ficha
│       ├── departamentos/[depto]/page.tsx
│       ├── contacto/page.tsx
│       ├── api/
│       │   ├── inquiries/route.ts
│       │   └── properties/...     # acciones admin (post-MVP)
│       ├── sitemap.ts
│       ├── robots.ts
│       └── not-found.tsx
│
├── tests/                         # unit (dominio/use-cases) + integration
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json                  # strict
├── eslint.config.mjs
└── package.json
```

### Justificación de decisiones

1. **`ui/` en lugar de `components/` suelto** — separa todo lo visual de la lógica; `app/` queda como capa de rutas/composición liviana.
2. **`application/ports/` dentro de `application/`** — los puertos pertenecen a la capa de aplicación (contratos de los casos de uso). Es una convención válida y evita un nivel de carpeta extra.
3. **`adapters/presentation/`** — traduce dominio → view models, evitando que los componentes lean entidades de dominio crudas.
4. **`platform/container.ts`** — punto único de composición: evita `new` repartidos por la app (mantiene la hexagonal sin framework de DI).
5. **`domain/` sin imports de afuera** — regla verificable con ESLint (`import/no-restricted-paths` o `boundaries`).
6. **Sin `src/lib/` ni `src/utils/` autorial** — lo que antes sería "utils" vive en `domain/` (si es regla) o en `ui/` (si es visual).

### Reglas de dependencia (verificables con ESLint)

- `domain/**` no importa `application|adapters|infrastructure|ui|app|next|react|@supabase/*`
- `application/**` no importa `adapters|infrastructure|ui|app|@supabase/*` (solo `domain` + puertos)
- `adapters/**` y `infrastructure/**` no importan `ui` ni `app`
- `ui/**` no importa `adapters/persistence|infrastructure` directamente (pasa por casos de uso / presenters)

---

## 17. MVP

### Incluye (v1)

| #   | Funcionalidad                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | **Inicio**: hero + buscador + accesos rápidos + destacados + recientes + departamentos + presentación + CTA + footer.   |
| 2   | **Catálogo** con grid de tarjetas.                                                                                      |
| 3   | **Búsqueda** (texto + parámetros URL).                                                                                  |
| 4   | **Filtros** principales + "Más filtros", contador, chips, ordenamiento.                                                 |
| 5   | **Tarjetas** de campos (sección 6).                                                                                     |
| 6   | **Ficha individual** con galería, información, características, descripción, info productiva, ubicación.                |
| 7   | **Contacto**: formulario de consulta + CTA.                                                                             |
| 8   | **Responsive** mobile-first.                                                                                            |
| 9   | **PostgreSQL/Supabase** (datos + storage de imágenes + RLS).                                                            |
| 10  | **Arquitectura hexagonal** (dominio, casos de uso, puertos, adaptadores).                                               |
| 11  | **SEO básico**: URLs amigables, metadata dinámica, OG, sitemap, robots, JSON-LD.                                        |
| 12  | **Remates próximos** (`/remates`): catálogo con fecha/hora, lugar, rematador, base y lista de lotes + ficha + consulta. |
| 13  | **Maquinaria** (`/maquinaria`): catálogo con categoría/marca/modelo/año/horas + ficha + consulta.                       |
| 14  | **Panel administrativo** con login (`/admin`): crear/editar/publicar campos, remates y maquinaria con fotos.            |

### Dejado para futuras versiones

- Mapa avanzado / lista + mapa.
- Favoritos.
- Comparación de campos.
- Usuarios / registro público / multi-rol.
- Estadísticas y métricas.
- Tours virtuales / videos / realidad virtual.
- Geolocalización avanzada (radios, "cerca de mí").
- Integraciones externas (portales, inmobiliarias, WhatsApp Business API, email transaccional).
- Multi-moneda / multi-idioma.
- Blogs / contenido editorial.
- Semaforización de precio por hectárea automática (simplificada puede entrar si es trivial).
- Notificaciones por email/WhatsApp a interesados.

### Nota sobre alta de contenido

El MVP incluye **panel administrativo propio** (Sprint 10): login con
`ADMIN_PASSWORD` (env), cookie de sesión firmada HTTP-only y CRUD de
campos/remates/maquinaria + subida de fotos (a Supabase Storage) + estado
borrador/publicado. Adicionalmente `supabase/seed.sql` permite precargar
contenido por SQL. La arquitectura de casos de uso es la misma en ambos
casos (`CreateProperty`, `UpdateProperty`, `PublishProperty`, y sus
equivalentes para auctiones/maquinaria).

---

## 18. Sprints

### Sprint 0 — Planificación, arquitectura y diseño

|                             |                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**                | Tener el proyecto planificado y las decisiones técnicas aprobadas antes de escribir código.                                                                   |
| **Tareas**                  | Analizar repositorio; evaluar stack; definir arquitectura hexagonal; modelo de datos; UX/UI; MVP; sprints; escribir `docs/PLAN.md`; validar con el cliente.   |
| **Resultado esperado**      | `docs/PLAN.md` completo y aprobado; stack y estructura fijados.                                                                                               |
| **Criterios de aceptación** | ✔ `docs/PLAN.md` existe y está completo · ✔ sin código implementado · ✔ decisiones justificadas · ✔ el paso a implementación no exige rediseñar arquitectura. |

### Sprint 1 — Configuración del proyecto y sistema visual

|                             |                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Objetivo**                | Base técnica y sistema visual listos.                                                                                                                                                                                                                                                                                                                        |
| **Tareas**                  | Init Next.js + TS strict + ESLint + Prettier; Tailwind con design tokens (paleta, tipografías, espaciado); `next/font`; layout base (Header/Footer); componentes primitivos (Button, Chip, Input, Select, Badge, Card, Section); estructura de carpetas hexagonal; ESLint de dependencia entre capas; `.env.example` + env validada; guía de estilo interno. |
| **Resultado esperado**      | Proyecto corre; sistema visual (colores/tipos/espaciado) aplicable; estructura de capas creada.                                                                                                                                                                                                                                                              |
| **Criterios de aceptación** | ✔ `npm run dev` ok · ✔ lint y typecheck pasan · ✔ tokens de la sección 9 implementados · ✔ estructura de la sección 16 creada · ✔ reglas de dependencia entre capas activas en ESLint.                                                                                                                                                                       |

### Sprint 2 — Dominio, casos de uso y persistencia

|                             |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**                | Núcleo funcional: modelo de dominio + casos de uso + Supabase.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Tareas**                  | Entidades/value objects/reglas de dominio (Property, Precio, Hectáreas, Slug, Estado, Tipo, Características, Foto, Inquiry); puertos (`PropertyRepository`, `ImageStorage`, `InquiryRepository`, catálogos); casos de uso (create/update/publish/unpublish/get/search/featured/recent/submitInquiry/manageImages); migraciones SQL + seeds; adaptadores Supabase (persistencia, storage); `container.ts`; tests unitarios de dominio y casos de uso; decisión panel admin vs seed. |
| **Resultado esperado**      | El núcleo permite persistir y consultar campos sin UI.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Criterios de aceptación** | ✔ migraciones aplicadas · ✔ casos de uso cubren la lista de la sección 2 · ✔ `domain/` sin imports externos · ✔ RLS definido · ✔ tests de reglas de publicación y búsqueda pasan.                                                                                                                                                                                                                                                                                                  |

### Sprint 3 — Catálogo, búsqueda y filtros

|                             |                                                                                                                                                                                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**                | Experiencia de descubrimiento completa.                                                                                                                                                                                                                                                         |
| **Tareas**                  | Página de catálogo (SSR/ISR); grid de tarjetas; barra de búsqueda; filtros principales + "Más filtros"; chips activos + limpiar; contador de resultados; ordenamiento; paginación/carga; parámetros en URL; presenters dominio→view model; estados vacío/carga/error; accesos rápidos del home. |
| **Resultado esperado**      | Catálogo navegable y filtrable con datos reales.                                                                                                                                                                                                                                                |
| **Criterios de aceptación** | ✔ `42 campos encontrados` refleja el total real · ✔ filtros se pueden remover individualmente · ✔ filtros sobreviven a refresh (URL) · ✔ resultados server-rendered · ✔ tarjetas cumplen la sección 6.                                                                                          |

### Sprint 4 — Ficha individual y galería

|                             |                                                                                                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**                | Landing page de la propiedad.                                                                                                                                                                                                                                                                     |
| **Tareas**                  | Ruta `/campos/[depto]/[slug]`; galería con lightbox (swipe en mobile); bloque de información principal; características visuales; descripción; información productiva condicional; bloque de ubicación (mapa adaptador/Noop + accesos); breadcrumbs; "campos similares"; generación de slug; 404. |
| **Resultado esperado**      | Ficha completa y atractiva para cada campo.                                                                                                                                                                                                                                                       |
| **Criterios de aceptación** | ✔ orden de la sección 8 respetado · ✔ galería navegable y deslizable en mobile · ✔ bloques opcionales no se renderizan vacíos · ✔ URL con slug SEO-friendly · ✔ CTA visible.                                                                                                                      |

### Sprint 5 — Contacto y funcionalidades comerciales

|                             |                                                                                                                                                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**                | Capturar consultas de forma segura.                                                                                                                                                                                                                                                                 |
| **Tareas**                  | Formulario de consulta (cliente+servidor con Zod); Route Handler/Server Action; rate limiting + honeypot; persistencia en `inquiries`; confirmación de éxito; CTA sticky mobile; WhatsApp preparado (puerto `ContactChannel`, configurable); notificación (email) opcional; CTA "Publicá tu campo". |
| **Resultado esperado**      | Un usuario puede consultar por un campo y la consulta queda registrada.                                                                                                                                                                                                                             |
| **Criterios de aceptación** | ✔ validación servidor+cliente · ✔ límites anti-abuso activos · ✔ inquiries visibles para admin · ✔ sin secretos en el cliente · ✔ interfaz lista para WhatsApp.                                                                                                                                     |

### Sprint 6 — Responsive, SEO y rendimiento

|                             |                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**                | Pulido en móvil, indexabilidad y velocidad.                                                                                                                                                                                                                                                                                                                     |
| **Tareas**                  | Revisión mobile-first de todas las pantallas (filtros en modal, galería swipe, CTA sticky); `generateMetadata` por página; OG images; `sitemap.ts`; `robots.ts`; JSON-LD (`RealEstateListing`, `Organization`, `Breadcrumb`); páginas por departamento; `next/image` + `sizes` + `priority`; Lighthouse (LCP/CLS/INP); tree-shaking de JS; fuentes optimizadas. |
| **Resultado esperado**      | Producto listo para posicionar y rápido en móvil.                                                                                                                                                                                                                                                                                                               |
| **Criterios de aceptación** | ✔ Lighthouse ≥ 90 perf/access/SEO en móvil · ✔ metadata única por propiedad · ✔ sitemap y robots correctos · ✔ JSON-LD válido · ✔ cero desbordes de layout (CLS ~0) · ✔ todas las vistas revisadas en 320/375/768/1024/1280.                                                                                                                                    |

### Sprint 7 — Testing, seguridad y preparación para producción

|                             |                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Objetivo**                | Endurecer y desplegar.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Tareas**                  | Tests de dominio/casos de uso/integración de persistencia (los que aporten); revisión RLS; validación de archivos; headers de seguridad (CSP, X-Frame, etc.); auditoría de variables de entorno; manejo de errores y `not-found`; accesibilidad (contraste AA, foco, navegación por teclado, labels); staging en Vercel + dominio; dominio de producción; DNS; monitoreo básico; backup de BD; checklist de lanzamiento; documentación (`ARQUITECTURA.md`, `DEPLOY.md`). |
| **Resultado esperado**      | Sitio en producción, seguro y mantenible.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Criterios de aceptación** | ✔ CI con lint+typecheck+tests verde · ✔ RLS probada (anon no escribe ni lee borradores) · ✔ sin secretos en el bundle · ✔ a11y básica OK · ✔ staging validado · ✔ dominio público funcionando · ✔ plan de rollback.                                                                                                                                                                                                                                                      |

### Sprint 8 — Remates y Maquinaria: dominio y datos

|                             |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**                | Modelar y persistir remates y maquinaria manteniendo la arquitectura hexagonal.                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Tareas**                  | Migración `0002` (`auctions`, `auction_lots`, `auction_images`, `machinery`, `machinery_categories`, `machinery_images`, nuevos campos de `inquiries` + CHECK); entidades `Auction`/`AuctionLot`/`MachineryItem` con sus reglas de publicación; enums (`AuctionEventStatus`, `MachineryCategory`); puertos y repositorios (in-memory reales para demo + Supabase); casos de uso (search/get/create/update/status, incl. "próximos remates"); consultas polimórficas (`InquirySubject`). |
| **Resultado esperado**      | El núcleo permite crear/consultar remates y maquinaria sin UI.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Criterios de aceptación** | ✔ migración aplicable · ✔ `Inquiry` admite `property`/`auction`/`machinery` (a lo sumo uno) · ✔ reglas de publicación propias para cada entidad · ✔ tests de dominio y casos de uso · ✔ `domain/` sin imports externos.                                                                                                                                                                                                                                                                 |

### Sprint 9 — Remates y Maquinaria: UI y SEO

|                             |                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**                | Secciones públicas completas y capaces de captar consultas.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Tareas**                  | `/remates` (catálogo: próximos, filtro por estado/depto, orden por fecha; tarjetas con fecha, lugar, rematador, base) + ficha `/remates/[slug]` (galería, datos, lotes, CTA y formulario de consulta); `/maquinaria` (catálogo: filtros por categoría/marca/depto/precio/año) + ficha `/maquinaria/[slug]`; tarjetas y links desde la portada; sitemap/robots/JSON-LD/404/error; `generateMetadata` por contenido; formulario de consulta reutilizado con `InquirySubject`. |
| **Resultado esperado**      | Secciones navegables, indexables y con consulta funcionando.                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Criterios de aceptación** | ✔ listados y fichas renderizan con y sin BD (en memoria) · ✔ remate publicado sin fecha se marca inválido · ✔ consulta llega a `inquiries` con el sujeto correcto · ✔ metadata y JSON-LD por ítem · ✔ mobile-first (320→1280).                                                                                                                                                                                                                                              |

### Sprint 10 — Panel administrativo

|                             |                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**                | Que el administrador de sitio gestione el contenido sin SQL.                                                                                                                                                                                                                                                                                                                                                                      |
| **Tareas**                  | Login con `ADMIN_PASSWORD` (env, comparación en tiempo constante) + cookie de sesión firmada (HMAC) HTTP-only + `middleware` protegiendo `/admin/*`; layout admin; CRUD de propiedades (campos, características, fotos, publicación), de remates (datos + lotes) y de maquinaria; subida/borrado de fotos (Supabase Storage cuando esté configurado); vistas de inventario y edición; logout; auditoría básica (log de acciones). |
| **Resultado esperado**      | El admin crea/publica contenido completo desde el navegador.                                                                                                                                                                                                                                                                                                                                                                      |
| **Criterios de aceptación** | ✔ `/admin/*` inaccesible sin sesión · ✔ cookie HTTP-only firmada (no manipulable) · ✔ crear/editar/publicar/despublicar los 3 tipos · ✔ fotos subidas a Storage · ✔ sin secretos en el bundle ni en las páginas · ✔ acciones por defecto a `borrador`.                                                                                                                                                                            |

---

## 19. Documentación futura

Además de `docs/PLAN.md`, se proponen **posteriormente** (no se crean ahora, salvo necesidad estricta):

| Archivo                | Contenido                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `docs/ARQUITECTURA.md` | Capas, reglas de dependencia, diagrama de puertos/adaptadores, cómo agregar un adaptador.         |
| `docs/REQUISITOS.md`   | Requisitos funcionales/no funcionales, historias de usuario, criterios de aceptación por feature. |
| `docs/MODELO-DATOS.md` | Esquema ER, diccionario de datos, migraciones, seeds, políticas RLS.                              |
| `docs/UI-UX.md`        | Design tokens, tipografía, espaciado, patrones de componentes, specs responsive, accesibilidad.   |
| `docs/SPRINTS.md`      | Tablero de sprints, Definition of Done, seguimiento de avance.                                    |
| `docs/DEPLOY.md`       | Variables de entorno, Vercel, Supabase, dominio, DNS, CI/CD, monitoreo, rollback.                 |

---

## 20. Regla final y checklist de salida

### Regla de esta etapa

> **NO PROGRAMAR.** Esta etapa termina cuando `docs/PLAN.md` existe, está completo y aprobado.

### Checklist de verificación

- [x] Analizar el repositorio actual → _repositorío vacío; se creó `docs/` desde cero_.
- [x] Evaluar el stack → _sección 1, con alternativas justificadas_.
- [x] Definir arquitectura → _sección 2, hexagonal pragmática_.
- [x] Definir modelo de datos → _sección 11, con índices, relaciones y evaluación de entidades_.
- [x] Definir UX/UI → _secciones 3, 6, 8, 9, 10_.
- [x] Definir MVP → _sección 17_.
- [x] Definir sprints → _sección 18, con objetivo/tareas/resultado/criterios_.
- [x] Crear `docs/PLAN.md` dentro del repositorio actual.
- [x] No se implementaron funcionalidades (sin componentes, páginas, tablas ni lógica de negocio).
- [x] Las decisiones técnicas están justificadas.
- [x] El proyecto puede pasar de planificación a implementación sin rediseñar su arquitectura.

### Próximo paso (cuando el plan sea aprobado)

Sprint 1: inicializar el proyecto Next.js + TypeScript + Tailwind sobre esta estructura, sin tocar el plan salvo ajustes acordados.
