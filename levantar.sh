#!/usr/bin/env bash
#
# Levanta el sitio local (Campos del Uruguay) y deja el panel de
# administración listo para cargar publicaciones.
#
# Uso:
#   ./levantar.sh            # build + servidor de producción en :3100
#   ./levantar.sh --dev      # modo desarrollo (recarga automática de código)
#   ./levantar.sh --no-build # usa el build existente (más rápido)
#
# Datos: si `.env` define DATABASE_URL, levanta el contenedor Postgres y
# aplica migraciones (persistente). Sin DATABASE_URL, todo vive en memoria
# del proceso y se reinicia cuando lo apagás. La contraseña del panel está
# en `.env` (variable ADMIN_PASSWORD).

set -euo pipefail

PORT="${PORT:-3100}"
LOG="${TMPDIR:-/tmp}/campos-server.log"

cd "$(dirname "$0")"

active_pid="$(ss -ltnp 2>/dev/null | awk -v p=":$PORT" '$4 ~ p {match($0, /pid=([0-9]+)/, m); print m[1]}' | head -1)"

stop_existing() {
  if [ -n "$active_pid" ]; then
    owner="$(ps -o user= -p "$active_pid" 2>/dev/null || echo "")"
    if [ "$owner" = "$(id -un)" ]; then
      printf 'Deteniendo el servidor anterior (PID %s) en el puerto %s...\n' "$active_pid" "$PORT"
      kill "$active_pid" 2>/dev/null || true
      sleep 2
    else
      printf 'El puerto %s está ocupado por un proceso ajeno (PID %s). Usá PORT=3101 ./levantar.sh.\n' "$PORT" "$active_pid" >&2
      exit 1
    fi
  fi
}

case "${1:-}" in
  --dev)
    stop_existing
    printf 'Iniciando en MODO DESARROLLO en http://localhost:%s ...\n' "$PORT"
    exec npm run dev -- -p "$PORT"
    ;;
  --no-build)
    stop_existing
    ;;
  *)
    stop_existing
    printf 'Compilando el proyecto...\n'
    npm run build
    ;;
esac

if [ -n "${1:-}" ] && [ "$1" != "--no-build" ] && [ "$1" != "--dev" ]; then
  printf 'Argumento desconocido: %s\n' "$1" >&2
  exit 1
fi

# Base de datos local: arranca el contenedor Postgres y aplica migraciones.
if grep -qE '^DATABASE_URL=' .env 2>/dev/null; then
  printf 'Levantando la base Postgres (docker-compose)...\n'
  docker-compose up -d >/dev/null 2>&1 || { printf '  No se pudo levantar Postgres. Revisá docker-compose.yml\n' >&2; exit 1; }
  for _ in $(seq 1 30); do
    health="$(docker inspect -f '{{.State.Health.Status}}' remates-postgres 2>/dev/null || echo starting)"
    if [ "$health" = "healthy" ]; then break; fi
    sleep 1
  done
  if [ "$health" != "healthy" ]; then
    printf '  La base no quedó sana (estado: %s). Revisá "docker logs remates-postgres"\n' "$health" >&2
    exit 1
  fi
  printf '  Base lista. Aplicando migraciones...\n'
  npm run db:migrate
fi

printf 'Arrancando servidor en http://localhost:%s (log: %s)\n' "$PORT" "$LOG"
setsid nohup npm start -- -p "$PORT" >"$LOG" 2>&1 < /dev/null &

for _ in $(seq 1 30); do
  if curl -s -o /dev/null "http://localhost:$PORT/"; then
    break
  fi
  sleep 1
done

if ! curl -s -o /dev/null "http://localhost:$PORT/"; then
  printf 'El servidor no respondió. Revisá el log: %s\n' "$LOG" >&2
  exit 1
fi

admin_password="$(grep -E '^ADMIN_PASSWORD=' .env 2>/dev/null | head -1 | cut -d= -f2-)"

printf '\n==============================================================\n'
printf '  Sitio:         http://localhost:%s\n' "$PORT"
printf '  Panel admin:   http://localhost:%s/admin\n' "$PORT"
if [ -n "$admin_password" ]; then
  printf '  Contraseña:    (definida en ADMIN_PASSWORD; no se muestra en pantalla)\n'
else
  printf '  Contraseña:    (definila como ADMIN_PASSWORD en tu archivo .env)\n'
fi
if grep -qE '^DATABASE_URL=' .env 2>/dev/null; then
  printf '  Datos:         Postgres local (npm run db:status)\n'
else
  printf '  Datos:         memoria del proceso (no persisten)\n'
fi
printf '  Apagar:        kill %s\n' "$(ss -ltnp 2>/dev/null | awk -v p=":$PORT" '$4 ~ p {match($0, /pid=([0-9]+)/, m); print m[1]}' | head -1)"
printf '==============================================================\n'
printf '\nPublicaste algo desde el panel? Se crea como borrador; desde la\n'
printf 'lista tocá "Publicar" para que aparezca en el sitio.\n'