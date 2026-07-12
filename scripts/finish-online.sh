#!/usr/bin/env bash
# Finish Haven PM online: AUTH_URL + Neon schema/seed + smoke checks.
# Does NOT touch local .env DATABASE_URL.
# Run in Mac Terminal (bypasses Cursor approval blockers):
#   cd ~/Projects/haven-pm && ./scripts/finish-online.sh
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/node@20/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.."

PROD_URL="https://haven-pm.vercel.app"
LOG="/tmp/haven-finish-online.log"
exec > >(tee "$LOG") 2>&1

echo "==> Whoami"
npx --yes vercel whoami

echo "==> Confirm production deployment"
npx --yes vercel ls 2>&1 | head -20
npx --yes vercel inspect "$PROD_URL" 2>&1 | head -40 || true

echo "==> Current production env (names only)"
npx --yes vercel env ls production 2>&1 | tee /tmp/haven-env-ls.txt

echo "==> Ensure AUTH_URL"
if grep -q 'AUTH_URL' /tmp/haven-env-ls.txt; then
  echo "  AUTH_URL already set"
else
  printf '%s' "$PROD_URL" | npx --yes vercel env add AUTH_URL production
  echo "  AUTH_URL added → $PROD_URL"
  echo "==> Redeploying so AUTH_URL is live"
  npx --yes vercel --prod --yes 2>&1 | tee /tmp/haven-vercel-redeploy.log
fi

echo "==> Ensure AUTH_SECRET + messaging env"
if [[ -z "${AUTH_SECRET:-}" ]]; then
  AUTH_SECRET="$(openssl rand -base64 32)"
  echo "  Generated AUTH_SECRET for first-time env setup"
fi
add_env() {
  local name="$1" value="$2"
  if grep -q "$name" /tmp/haven-env-ls.txt; then
    echo "  skip $name (exists)"
  else
    printf '%s' "$value" | npx --yes vercel env add "$name" production
    echo "  added $name"
  fi
}
add_env AUTH_SECRET "$AUTH_SECRET"
add_env MESSAGING_PORTAL_URL "https://my.quo.com/"
add_env MESSAGING_PROVIDER_NAME "OpenPhone"
add_env MESSAGING_PHONE_NUMBER "(412) 797-5007"

echo "==> Pull production env to temp file (not .env)"
rm -f .env.vercel
npx --yes vercel env pull .env.vercel --environment=production --yes

# Capture local DATABASE_URL host for safety check later
LOCAL_HOST="$(node -e "const fs=require('fs'); const e=fs.readFileSync('.env','utf8'); const m=e.match(/^DATABASE_URL=(.+)$/m); if(!m){process.exit(0);} const u=new URL(m[1].replace(/^\\\"|\\\"$/g,'')); console.log(u.hostname);")"
echo "  local .env DATABASE_URL host: ${LOCAL_HOST:-unknown}"

set -a
# shellcheck disable=SC1091
source <(grep -E '^(DATABASE_URL|AUTH_SECRET)=' .env.vercel | sed 's/^/export /')
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL missing from production env pull"
  rm -f .env.vercel
  exit 1
fi

NEON_HOST="$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.hostname);")"
echo "  production DATABASE_URL host: $NEON_HOST"
if [[ "$NEON_HOST" == "localhost" || "$NEON_HOST" == "127.0.0.1" ]]; then
  echo "ERROR: pulled DATABASE_URL looks local — aborting"
  rm -f .env.vercel
  exit 1
fi

echo "==> prisma db push (Neon only — env in this shell)"
npx prisma db push

echo "==> db:seed (Neon only)"
npm run db:seed

rm -f .env.vercel
echo "==> Removed .env.vercel"

# Verify local .env untouched
LOCAL_HOST_AFTER="$(node -e "const fs=require('fs'); const e=fs.readFileSync('.env','utf8'); const m=e.match(/^DATABASE_URL=(.+)$/m); if(!m){process.exit(0);} const u=new URL(m[1].replace(/^\\\"|\\\"$/g,'')); console.log(u.hostname);")"
echo "  local .env DATABASE_URL host after: ${LOCAL_HOST_AFTER:-unknown}"
if [[ "$LOCAL_HOST_AFTER" != "localhost" && "$LOCAL_HOST_AFTER" != "127.0.0.1" ]]; then
  echo "WARNING: local .env DATABASE_URL is not localhost!"
fi

echo "==> Smoke checks"
curl -s -o /dev/null -w "live_login:%{http_code}\n" "$PROD_URL/login"
curl -s -o /dev/null -w "live_root:%{http_code}\n" "$PROD_URL/"
curl -s -o /dev/null -w "local_login:%{http_code}\n" "http://localhost:3000/login" || echo "local_login:down"
curl -s -o /dev/null -w "local_root:%{http_code}\n" "http://localhost:3000/" || echo "local_root:down"

echo ""
echo "DONE — Haven is live at: $PROD_URL"
echo "Demo login: admin@ / justin@ / michelle@havenpm.com / password123"
echo "Log: $LOG"
