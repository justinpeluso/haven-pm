#!/usr/bin/env bash

# Haven PM — one-command launcher
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Ensure Node 20 and Homebrew bins are on PATH
export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/opt/postgresql@17/bin:/opt/homebrew/bin:$PATH"

echo "🏠 Haven PM — starting..."
echo ""

# ─── Node.js ─────────────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js not found."
  echo "   Install with: brew install node@20"
  exit 1
fi
echo "✓ Node $(node --version)"

# ─── Environment file ─────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "→ Creating .env file..."
  cp .env.example .env
  AUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|AUTH_SECRET=.*|AUTH_SECRET=\"${AUTH_SECRET}\"|" .env
  else
    sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=\"${AUTH_SECRET}\"|" .env
  fi
  echo "✓ Created .env"
fi

# ─── Dependencies ─────────────────────────────────────────────────────────────
if [ ! -d node_modules ]; then
  echo "→ Installing dependencies (first run, may take a minute)..."
  npm install || { echo "❌ npm install failed"; exit 1; }
fi
echo "✓ Dependencies ready"

# ─── PostgreSQL ───────────────────────────────────────────────────────────────
start_postgres() {
  # Try Docker first
  local DOCKER=""
  for d in docker /usr/local/bin/docker /Applications/Docker.app/Contents/Resources/bin/docker; do
    if command -v "$d" >/dev/null 2>&1 || [ -x "$d" ]; then
      DOCKER="$d"
      break
    fi
  done

  if [ -n "$DOCKER" ]; then
    echo "→ Starting PostgreSQL via Docker..."
    $DOCKER compose up -d 2>/dev/null && sleep 3 && return 0
  fi

  # Fall back to Homebrew PostgreSQL
  if command -v pg_isready >/dev/null 2>&1; then
    if ! pg_isready -q 2>/dev/null; then
      echo "→ Starting PostgreSQL via Homebrew..."
      brew services start postgresql@17 2>/dev/null || brew services start postgresql@16 2>/dev/null || true
      sleep 2
    fi
    if pg_isready -q 2>/dev/null; then
      # Create user and database if they don't exist
      createuser -s haven 2>/dev/null || true
      psql postgres -tc "SELECT 1 FROM pg_database WHERE datname='haven_pm'" | grep -q 1 || \
        psql postgres -c "CREATE USER haven WITH PASSWORD 'haven_dev_password' CREATEDB;" 2>/dev/null || true
      psql postgres -tc "SELECT 1 FROM pg_database WHERE datname='haven_pm'" | grep -q 1 || \
        createdb -O haven haven_pm 2>/dev/null || \
        psql postgres -c "CREATE DATABASE haven_pm OWNER haven;" 2>/dev/null || true
      return 0
    fi
  fi

  echo "❌ PostgreSQL is not running."
  echo "   Install one of:"
  echo "     brew install postgresql@17 && brew services start postgresql@17"
  echo "     Docker Desktop — then re-run ./start.sh"
  exit 1
}

start_postgres
echo "✓ PostgreSQL running"

# ─── Database setup ───────────────────────────────────────────────────────────
echo "→ Syncing database schema..."
npm run db:push 2>&1 || { echo "❌ Database sync failed — is PostgreSQL running?"; exit 1; }

echo "→ Seeding demo data..."
npm run db:seed 2>&1 || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Haven PM is ready!"
echo "  🌐 http://localhost:3000"
echo "  👤 admin@ / justin@ / michelle@havenpm.com / Chomps123"
echo "  Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stop stale dev server and clear Next cache (avoids 500s after production builds)
pkill -f "next dev" 2>/dev/null || true
sleep 1
rm -rf .next

npm run dev
