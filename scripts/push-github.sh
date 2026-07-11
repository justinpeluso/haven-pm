#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "Set GH_TOKEN first, then re-run."
  exit 1
fi

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/node@20/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.."

LOGIN="$(gh api user --jq .login)"
echo "Logged in as: $LOGIN"

if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create haven-pm --public --source=. --remote=origin \
    --description "Haven PM — property management" || true
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "https://github.com/${LOGIN}/haven-pm.git"
fi

git push -u origin HEAD:main
echo "Repo: https://github.com/${LOGIN}/haven-pm"
