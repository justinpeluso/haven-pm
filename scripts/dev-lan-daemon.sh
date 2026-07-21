#!/bin/bash
# Keep Haven PM reachable on LAN (0.0.0.0:3000). Used by LaunchAgent.
set -u
export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/opt/postgresql@17/bin:/opt/homebrew/bin:$PATH"
ROOT="/Users/justin/Projects/haven-pm"
LOG_DIR="$HOME/Library/Logs/haven-pm"
mkdir -p "$LOG_DIR"
cd "$ROOT" || exit 1

# Ensure Postgres is up (best-effort)
if command -v pg_isready >/dev/null 2>&1; then
  if ! pg_isready -h localhost -q 2>/dev/null; then
    brew services start postgresql@17 >/dev/null 2>&1 || true
    sleep 2
  fi
fi

# Free the port if a stale next is wedged (only our own listener)
if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  # If it's already a healthy next, just exec-replace by killing and restarting cleanly
  pkill -f "next dev -H 0.0.0.0 -p 3000" 2>/dev/null || true
  sleep 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] starting next -H 0.0.0.0 -p 3000" >> "$LOG_DIR/dev-lan.log"
exec npx next dev -H 0.0.0.0 -p 3000 >> "$LOG_DIR/dev-lan.log" 2>&1
