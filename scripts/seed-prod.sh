#!/usr/bin/env bash
# Seed Neon production DB only. Does NOT touch local .env.
# Uses .env.vercel from `vercel env pull` in a subshell.
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/node@20/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.."

LOG="/tmp/haven-seed-prod.log"
exec > >(tee "$LOG") 2>&1

echo "==> Verify local .env still points at localhost"
LOCAL_HOST="$(node -e "const fs=require('fs'); const e=fs.readFileSync('.env','utf8'); const m=e.match(/^DATABASE_URL=(.+)$/m); if(!m){process.exit(0);} let v=m[1].trim(); if((v[0]==='\"'&&v.endsWith('\"'))||(v[0]==\"'\"&&v.endsWith(\"'\"))) v=v.slice(1,-1); console.log(new URL(v).hostname);")"
echo "  local host: ${LOCAL_HOST:-unknown}"
if [[ "${LOCAL_HOST:-}" != "localhost" && "${LOCAL_HOST:-}" != "127.0.0.1" ]]; then
  echo "ERROR: refusing to continue — local .env DATABASE_URL is not localhost"
  exit 1
fi

echo "==> Pull production env → .env.vercel"
rm -f .env.vercel
npx --yes vercel env pull .env.vercel --environment=production --yes

echo "==> Extract DATABASE_URL via node (no print of secret)"
# Write a tiny runner that loads .env.vercel and runs prisma/seed with that env only
node <<'NODE'
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  const out = {};
  const text = fs.readFileSync(filePath, 'utf8');
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq);
    let val = line.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    // Unescape common sequences from dotenv double-quoted values
    val = val.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    out[key] = val;
  }
  return out;
}

const pulled = parseEnvFile(path.join(process.cwd(), '.env.vercel'));
const databaseUrl = pulled.DATABASE_URL || pulled.POSTGRES_PRISMA_URL || pulled.POSTGRES_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL missing from .env.vercel');
  process.exit(1);
}

let host;
try {
  host = new URL(databaseUrl).hostname;
} catch (e) {
  console.error('ERROR: DATABASE_URL is not a valid URL');
  process.exit(1);
}
console.log('  production host:', host);
if (host === 'localhost' || host === '127.0.0.1') {
  console.error('ERROR: production URL looks local — aborting');
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
};
// Prefer Neon URL only for prisma; do not inherit empty AUTH_* from pull
delete env.AUTH_SECRET;
delete env.AUTH_URL;

function run(cmd, args) {
  console.log('==>', cmd, args.join(' '));
  const r = spawnSync(cmd, args, { env, stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(r.status || 1);
}

run('npx', ['prisma', 'db', 'push']);
run('npm', ['run', 'db:seed']);
console.log('SEED_OK');
NODE

echo "==> Cleanup .env.vercel"
rm -f .env.vercel

echo "==> Re-check local .env host"
LOCAL_HOST_AFTER="$(node -e "const fs=require('fs'); const e=fs.readFileSync('.env','utf8'); const m=e.match(/^DATABASE_URL=(.+)$/m); if(!m){process.exit(0);} let v=m[1].trim(); if((v[0]==='\"'&&v.endsWith('\"'))||(v[0]==\"'\"&&v.endsWith(\"'\"))) v=v.slice(1,-1); console.log(new URL(v).hostname);")"
echo "  local host after: ${LOCAL_HOST_AFTER:-unknown}"

echo "==> Smoke checks"
curl -s -o /dev/null -w "live_login:%{http_code}\n" https://haven-pm.vercel.app/login
curl -s -o /dev/null -w "live_root:%{http_code}\n" https://haven-pm.vercel.app/
curl -s -o /dev/null -w "local_login:%{http_code}\n" http://localhost:3000/login || echo "local_login:down"
curl -s -o /dev/null -w "local_root:%{http_code}\n" http://localhost:3000/ || echo "local_root:down"

# Ensure local dev still up
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login | grep -q 200; then
  echo "==> Local login not 200 — starting/restarting dev"
  pg_isready -h localhost -d haven_pm || true
  (pkill -f "next dev" || true)
  sleep 1
  nohup npm run dev >/tmp/haven-dev.log 2>&1 &
  sleep 5
  curl -s -o /dev/null -w "local_login_retry:%{http_code}\n" http://localhost:3000/login || true
fi

echo ""
echo "DONE — live: https://haven-pm.vercel.app"
echo "Demo login: admin@ / justin@ / michelle@havenpm.com / password123"
echo "Log: $LOG"
