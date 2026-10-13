#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
npm test
npm run build
if [[ -n "${LATCH_FIREBASE_CLI:-}" ]]; then
  "$LATCH_FIREBASE_CLI" deploy --only hosting:latch-agent-receipts --project gen-lang-client-0444960702 --non-interactive
else
  npx --yes firebase-tools@15.33.0 deploy --only hosting:latch-agent-receipts --project gen-lang-client-0444960702 --non-interactive
fi
