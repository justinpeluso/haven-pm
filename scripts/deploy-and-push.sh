#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/node@20/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.."

echo "=== Vercel prod deploy ==="
npx --yes vercel --prod --yes 2>&1 | tee /tmp/haven-commit-deploy.log
echo "DEPLOY_EXIT:${PIPESTATUS[0]}"
grep -E 'Ready|Aliased|Error|Production' /tmp/haven-commit-deploy.log | tail -8 || true

echo ""
echo "=== GitHub push ==="
if git push -u origin HEAD:main; then
  echo "PUSH_OK"
else
  echo "GitHub push failed (likely no auth — old PAT was revoked)."
  echo "Vercel is already updated from this machine's files."
  echo "To sync GitHub: create a new repo-scoped PAT, then:"
  echo '  GH_TOKEN=ghp_xxx git push "https://x-access-token:${GH_TOKEN}@github.com/justinpeluso/haven-pm.git" HEAD:main'
fi
