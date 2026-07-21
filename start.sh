#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "$0")"

: "${HOST:=127.0.0.1}"
: "${PORT:=3000}"

if [[ ! -f dist/index.html ]]; then
  echo "Web bundle is missing; run npm run build before start.sh." >&2
  exit 1
fi

exec python3 -m http.server "$PORT" --bind "$HOST" --directory dist
