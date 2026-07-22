#!/usr/bin/env bash
# Restarts Next dev if the Node process exits (crash, SIGKILL from OOM, etc.).
# Ctrl+C stops during the sleep between restarts — if Next swallowed the signal, Ctrl+C twice.
set +e
cd "$(dirname "$0")/.."
PORT="${PORT:-3000}"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

USE_TURBOPACK="${DEV_TURBOPACK:-1}"

while true; do
  ts="$(date +"%Y-%m-%d %H:%M:%S")"
  if [[ "$USE_TURBOPACK" == "1" ]]; then
    echo "[$ts] runsheet-dev-keepalive: npm run dev (Turbopack, port $PORT)"
    npm run dev -- --port "$PORT"
  else
    echo "[$ts] runsheet-dev-keepalive: npm run dev:webpack (port $PORT)"
    npm run dev:webpack -- --port "$PORT"
  fi
  code=$?
  echo "[keepalive] next exited (${code}); sleeping 2s then restarting (Ctrl+C now to quit this loop)"
  sleep 2
done
