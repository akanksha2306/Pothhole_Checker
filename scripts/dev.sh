#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# PotholeWatch dev environment — one command.
#
#   ./scripts/dev.sh        (or: npm run dev)
#
# Starts: shared build (once) → backend (:3001) → frontend (:5173).
# - Kills anything already listening on the ports (stale servers serve stale
#   code — the class of bug this project has been burned by).
# - Refuses to start without the .env files — prints what's missing.
# - Logs: /tmp/potholewatch-backend.log and /tmp/potholewatch-frontend.log
# - Ctrl+C stops everything cleanly.
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

BACKEND_PORT=3001
FRONTEND_PORT=5173
BACKEND_LOG=/tmp/potholewatch-backend.log
FRONTEND_LOG=/tmp/potholewatch-frontend.log

say() { printf '\033[1;32m[dev]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2; exit 1; }

# --- prerequisites ---------------------------------------------------------
command -v npm >/dev/null || die "npm not found — install Node 20+ first"
[ -f backend/.env ] || die "backend/.env missing — copy backend/.env.example and fill the secrets"
[ -f frontend/.env ] || die "frontend/.env missing — copy frontend/.env.example and set VITE_GOOGLE_CLIENT_ID"

# --- free the ports (stale dev servers serve stale code) --------------------
free_port() {
  local port=$1 pid
  pid=$(lsof -ti :"$port" || true)
  if [ -n "$pid" ]; then
    say "port $port busy (pid $pid) — stopping it"
    kill $pid 2>/dev/null || true
    sleep 1
    kill -9 $pid 2>/dev/null || true
  fi
}
free_port "$BACKEND_PORT"
free_port "$FRONTEND_PORT"

# --- build the shared contract once (frontend/backend import its dist) ------
say "building shared contract"
npm run build -w shared --silent

# --- start backend + frontend -----------------------------------------------
say "starting backend on :$BACKEND_PORT (log: $BACKEND_LOG)"
nohup npm run dev:backend >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

say "starting frontend on :$FRONTEND_PORT (log: $FRONTEND_LOG)"
nohup npm run dev:frontend >"$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

# --- wait for readiness, then report ---------------------------------------
for i in $(seq 1 30); do
  if curl -sf -m 2 "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
    say "backend ready: $(curl -s -m 2 "http://localhost:$BACKEND_PORT/api/health")"
    break
  fi
  [ "$i" = 30 ] && { tail -20 "$BACKEND_LOG"; die "backend did not become healthy in 30s"; }
  sleep 1
done

for i in $(seq 1 30); do
  if curl -sf -m 2 "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
    say "frontend ready: http://localhost:$FRONTEND_PORT"
    break
  fi
  [ "$i" = 30 ] && { tail -20 "$FRONTEND_LOG"; die "frontend did not become healthy in 30s"; }
  sleep 1
done

say "all up — app: http://localhost:5173  ·  api: http://localhost:3001/api/health"
say "logs: tail -f $BACKEND_LOG | $FRONTEND_LOG"
say "press Ctrl+C to stop both"

trap 'say "stopping"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM
wait
