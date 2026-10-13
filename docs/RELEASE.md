# Latch release verification

## Public product and source

- Product: https://latch-agent-receipts.web.app
- Source: https://github.com/shi1720/latch-monad
- Technical demo: https://www.youtube.com/watch?v=PioZkd00OZY
- Pitch: https://www.youtube.com/watch?v=fmQ5vGBern4
- Network: Monad testnet, chain ID 10143
- Contract: `0xcfeb00b37333b3f4397eed2790e2869a40ffb871`

The technical demo is 1 minute 53 seconds, with natural neural narration, burned-in captions, and an uploaded English subtitle track. The separate pitch is 1 minute 30 seconds. Narration is synthesized and does not impersonate the project lead.

## Completed verification

- 11 core contract, policy, and SDK tests passed.
- 22 browser regressions passed locally and against the public Firebase deployment.
- Real hosted browser transactions captured successful acceptance and expired refund followed by buyer withdrawal, with no JavaScript errors.
- Earlier live integration trials include provider withdrawal and permanent duplicate-request rejection.
- Clean installation, tests, production build, and a deployment targeting only `latch-agent-receipts` completed.
- Linux GitHub CI passed after correcting optional platform metadata for Ganache's macOS file watcher.
- The main HTML entry returns `Cache-Control: no-cache`; hashed assets use long-lived caching. Security response headers are configured.
- Only `main` is used; no feature branches were created or left for submission.

## Evidence and reproduction

See `public/deployment.json`, `public/live-evidence.json`, `docs/TESTING.md`, and the public CI workflow. Browser recovery regressions use deliberately mocked existing receipts and forbid transaction submission. They are distinct from the recorded real testnet trials.

## Release limits

This is a tested developer release on testnet. Quote inputs are illustrative, the buyer is the verifier, and suppliers must trust its acceptance decision. It is not an independent truth oracle, a live GPU exchange, a stablecoin product, or an independently audited mainnet service. Pricing and demand remain unvalidated; automated trials are not customer traction.
