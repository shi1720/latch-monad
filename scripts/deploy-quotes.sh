#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run test:quotes
gcloud run deploy latch-quotes --source server --region us-central1 --project gen-lang-client-0444960702 --allow-unauthenticated --min-instances 0 --max-instances 1 --memory 256Mi --cpu 1 --concurrency 40 --timeout 15s --set-env-vars ALLOWED_ORIGIN=https://latch-agent-receipts.web.app --quiet
