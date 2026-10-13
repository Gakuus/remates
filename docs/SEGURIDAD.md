# Auditoría de seguridad — Panel de administración

Última revisión: octubre 2026. Alcance: autenticación del panel (`/admin`, `/api/admin/*`), sesión y dificultad de acceso por fuerza bruta.

## Resumen

El panel usa una única contraseña maestra (`ADMIN_PASSWORD`, solo servidor). El diseño
es **fail-closed**: sin contraseña configurada el panel no se abre en ningún caso. Toda
mutación del panel pasa por **server actions** que revalidan la sesión en cada llamada,
además del middleware.

## Amenazas y mitigaciones

| Amenaza                                        | Mitigación                                                                                                                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fuerza bruta sobre la contraseña               | Rate-limit **5 intentos / 15 min / IP** con `Retry-After` (`src/app/api/admin/login/route.ts`). Respuesta 429 genérica.                                                                                                            |
| Huellas de timing (fuga de longitud/contenido) | Comparación en tiempo constante por **digest SHA-256** de ambos lados: el tiempo no depende de contenido ni longitud (`safeEqual` en `session.ts`). Retardo fijo de 50 ms en cada intento de login.                                |
| Suplantación/falsificación de cookie           | La cookie la firma el servidor con **HMAC-SHA256** (`v1                                                                                                                                                                            | <expiración>.<firma>`); una cookie modificada o re-emitida no verifica. |
| Robo de cookie                                 | Cookie `admin_session` **HttpOnly** + `SameSite=Lax` + `Secure` en producción, host-only (sin `domain`), TTL 12 h.                                                                                                                 |
| CSRF                                           | `SameSite` + `form-action 'self'` (CSP) + **check de `Origin`** en login y logout (`request-guard.ts`): un origen cross-site recibe 403. Refuerza, además, que el JSON dispara preflight CORS no completable desde otros orígenes. |
| Caché de datos sensibles                       | `Cache-Control: no-store` + `Pragma: no-cache` en todo el panel: páginas `NextResponse` del middleware y respuestas de `/api/admin/*` (`request-guard.ts`).                                                                        |
| Enumeración de estado                          | Respuestas minimalistas y consistentes (`401 No autorizado`, `503 Panel no configurado`, mensajes de login sin información útil).                                                                                                  |
| Exposición de páginas a motores de búsqueda    | `/admin/*` fuera de robots y con `noindex` en el metadata.                                                                                                                                                                         |
| Inyección/XSS/clickjacking                     | CSP estricta en producción, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy` restrictiva (`next.config.ts`).                                                                                       |
| Tránsito en claro                              | HSTS + `upgrade-insecure-requests` (solo producción).                                                                                                                                                                              |
| Entornos mal configurados                      | `env.ts` valida el esquema una vez; solo variables sin prefijo `NEXT_PUBLIC_` acceden a secretos, así nunca llegan al bundle del cliente.                                                                                          |

## Endurecimientos aplicados en esta revisión

1. Comparaciones de contraseña y firma pasaron a comparar **digests** (antes la comparación
   constante cortaba por longitud → fuga de longitud).
2. Rate-limit de login endurecido de 10 → **5 intentos / 15 min / IP**.
3. **Check de `Origin`** en las APIs de login y logout (anti-CSRF en profundidad).
4. **`Cache-Control: no-store`** en todas las respuestas del panel (páginas y API).
5. Acceso discreto al panel desde el footer (única vía de entrada pública, enlace tenue).

## Subida de imágenes (panel)

- El endpoint `POST /api/admin/images/upload` exige sesión válida, está dentro
  del matcher del middleware (no-store) y está **rate-limited a 20 subidas /
  10 min / IP** (evita llenar disco/storage).
- Validación server-side con `image-rules.ts`: tamaño ≤ 8 MB, tipo permitido
  (JPG/PNG/WEBP/AVIF) y **firma binaria (magic bytes) coherente con el MIME** —
  no se confía en el nombre ni en el tipo declarado por el cliente.
- El archivo se llama con un **UUID generado por el servidor**; el path es
  `{kind}/{id}/{uuid}.{ext}` y el `LocalImageStorage` rechaza cualquier
  traversal (`..`) que escape la raíz de `.uploads` (la ruta pública
  `/uploads/...` valida extensión y path antes de leer del disco).
- Al adjuntar la foto (server action `attachContentImage`) el `storagePath` se
  **re-valida**: kind + id exactos de la operación, UUID y extensión permitida
  (`infrastructure/admin/image-upload.ts`). Un path inventado no se acepta.

## Riesgos residuales

- **Rate-limit en memoria**: vale por proceso. En un despliegue serverless multi-instancia
  la cuota es por instancia (un atacante podría escalar). Para la contraseña maestra única
  es aceptable; migrar a Redis/Upstash sin tocar el contrato (`rate-limit.ts`).
- **Sin bloqueo progresivo**: un mismo IP puede reintentar a los 15 min. Para redoblar la
  protección se puede sumar backoff exponencial o bloqueo tras N ventanas.
- **Una sola contraseña**: no hay usuarios individuales ni 2FA. Si la contraseña se filtra,
  rotarla tiene efecto inmediato (nueva firma HMAC invalida todas las sesiones).
- **Sin varias instancias**: `levantar.sh` mantiene una sola instancia en producción local.
- **HTTP en local**: cookie `Secure` solo en producción; en local se usa HTTP (esperado).

## Verificación

- Unit: 158 tests pasan, incluidos `admin-session.test.ts`, `request-guard.test.ts`,
  `image-upload.test.ts`, `attach-image-publish.test.ts` y
  `local-image-storage.test.ts`.
- E2E: smoke del panel en build de producción (login, CRUD, subir foto →
  publicar, despublicar, borrador oculto, acceso público 404) + checks de
  seguridad (Origin 403, no-store, fuerza bruta 429).
- Evidencia manual: con `Origin` foráneo el login responde 403; tras 5 intentos fallidos
  responde 429 con `Retry-After`; páginas del panel llegan con `Cache-Control: no-store`.
