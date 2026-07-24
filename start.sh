#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "$0")"
if [[ -f .env ]]; then set -a; source .env; set +a; fi

: "${BACKEND_PORT:?BACKEND_PORT is required}"
: "${FRONTEND_PORT:?FRONTEND_PORT is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${SESSION_SECRET:?SESSION_SECRET is required}"
if [[ ${#SESSION_SECRET} -lt 32 ]]; then echo "SESSION_SECRET must contain at least 32 characters" >&2; exit 1; fi
if [[ "$BACKEND_PORT" == "$FRONTEND_PORT" ]]; then echo "API and UI ports must be distinct" >&2; exit 1; fi

if [[ ! -f dist/index.html ]]; then
  echo "Web bundle is missing; run npm run build before start.sh." >&2
  exit 1
fi

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $port is occupied; refusing to terminate another process." >&2; exit 1; fi
done

cleanup() {
  kill -TERM "${api_pid:-}" "${ui_pid:-}" 2>/dev/null || true
  wait "${api_pid:-}" "${ui_pid:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

node runtime/server.cjs & api_pid=$!
python3 -m http.server "$FRONTEND_PORT" --bind "${FRONTEND_HOST:-127.0.0.1}" --directory dist & ui_pid=$!
while kill -0 "$api_pid" 2>/dev/null && kill -0 "$ui_pid" 2>/dev/null; do sleep 1; done
exit 1
