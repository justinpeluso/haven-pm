#!/usr/bin/env bash
# Deploy Haven PM to Vercel with free Neon Postgres + seed demo data.
# Run in Mac Terminal (bypasses Cursor approval blockers):
#   cd ~/Projects/haven-pm && ./scripts/deploy-online.sh
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/node@20/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.."

if [[ -z "${AUTH_SECRET:-}" ]]; then
  AUTH_SECRET="$(openssl rand -base64 32)"
  echo "Generated AUTH_SECRET for first-time env setup (export AUTH_SECRET to reuse)"
fi

echo "==> Checking Vercel login"
if ! npx --yes vercel whoami >/dev/null 2>&1; then
  echo "Not logged into Vercel. Opening login…"
  npx --yes vercel login
fi
npx --yes vercel whoami

echo "==> Linking project"
npx --yes vercel link --yes --project haven-pm

echo "==> Adding free Neon Postgres (if missing)"
if ! npx --yes vercel env ls 2>/dev/null | grep -q DATABASE_URL; then
  npx --yes vercel integration add neon \
    --plan free_v3 \
    -m region=iad1 \
    -m auth=false \
    --no-claim \
    --format=json || true
fi

echo "==> Setting env vars"
add_env() {
  local name="$1" value="$2" env="${3:-production}"
  if npx --yes vercel env ls 2>/dev/null | grep -q "$name"; then
    echo "  skip $name (exists)"
  else
    printf '%s' "$value" | npx --yes vercel env add "$name" "$env"
  fi
}

add_env AUTH_SECRET "$AUTH_SECRET" production
add_env AUTH_SECRET "$AUTH_SECRET" preview
add_env MESSAGING_PORTAL_URL "https://my.quo.com/" production
add_env MESSAGING_PROVIDER_NAME "OpenPhone" production
add_env MESSAGING_PHONE_NUMBER "(412) 797-5007" production

echo "==> Deploying to production"
DEPLOY_OUT="$(npx --yes vercel --prod --yes 2>&1 | tee /tmp/haven-vercel-deploy.log)"
echo "$DEPLOY_OUT"

URL="$(echo "$DEPLOY_OUT" | grep -Eo 'https://[a-zA-Z0-9.-]+\.vercel\.app' | tail -1 || true)"
if [[ -z "$URL" ]]; then
  URL="https://haven-pm.vercel.app"
fi
echo "==> App URL: $URL"

# AUTH_URL should match the live URL
if ! npx --yes vercel env ls 2>/dev/null | grep -q AUTH_URL; then
  printf '%s' "$URL" | npx --yes vercel env add AUTH_URL production
  echo "==> Redeploying with AUTH_URL"
  npx --yes vercel --prod --yes
fi

echo "==> Pulling production env for seed"
npx --yes vercel env pull .env.vercel --environment=production --yes
set -a
# shellcheck disable=SC1091
source <(grep -E '^(DATABASE_URL|AUTH_SECRET)=' .env.vercel | sed 's/^/export /')
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL missing. Open Vercel → Storage → create Neon, then re-run."
  exit 1
fi

echo "==> Pushing schema + seeding demo data"
npx prisma db push
npm run db:seed
npm run db:seed:portal

rm -f .env.vercel
echo ""
echo "DONE — Haven is live at: $URL"
echo "Demo login: admin@ / justin@ / michelle@havenpm.com / Chomps123"
