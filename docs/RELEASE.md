# Release verification

Primary product: https://latch-agent-receipts.web.app
Source: https://github.com/shi1720/latch-monad

## Live pricing upgrade

The default workbench now retrieves actual H100 marketplace offers from Vast.ai through a dependency-free Cloud Run adapter and Firebase same-origin rewrite. The source response is bounded, cached for 30 seconds, normalized to exact country codes, and explicit about instance and per-GPU prices. A source outage is shown as a retryable error; synthetic prices and expired cache are never substituted.

The application supports offer filtering, source offer IDs, source export, selection into a policy, real Monad testnet settlement, live artifact inspection in receipts, and recovery of interrupted purchases. Sandbox fixtures remain explicitly labeled safety-test inputs. The SDK includes `fetchLiveQuote` and a reserve-before-fetch live integration example.

## Deployment

- Hosting site: `latch-agent-receipts` in project `gen-lang-client-0444960702`.
- Quote service: `latch-quotes`, Cloud Run `us-central1`, min instances zero, max instances one, 256 MiB, concurrency 40, request timeout 15 seconds.
- `scripts/deploy-quotes.sh` deploys only that service. `scripts/deploy-firebase.sh` performs a clean install, tests, production build, and only the named Hosting site deployment.
- Hosting pins its API rewrite to a Cloud Run revision for reproducible release behavior. Deploy the service before Hosting after server changes.
- No billing account was added. The service uses the existing project's billing; scale-to-zero and a single instance bound running capacity. This is not a guarantee of zero cost.

## Material limits

Anonymous Vast.ai search worked during integration but is not a promised provider contract; official documentation describes authenticated API access. Optional `VAST_API_KEY` is server-only. Provider access, offer availability, faucet funding and public RPC availability can change.

Retrieval time is not provider update time. Listings are not reservations. GPU source claims are not independently verified. The free marketplace browser and the 0.001 testnet MON adapter payment are distinct; neither purchases compute capacity. Fees and final provider billing can differ.

The buyer authorizes acceptance. Providers must trust buyer fairness. Native testnet MON only; unaudited developer release. No independent security audit, paying customers, external integration traction, or mainnet readiness is claimed.

## Final verification

24 core, SDK and adapter tests passed. 35 browser regressions passed locally and against the Firebase release. Linux CI passed on commit `27919d5`. Actual recorded live runs fetched Vast.ai listings and completed acceptance and rejected-fixture refunds without JavaScript errors. `scripts/verify-pricing-evidence.ts` independently checked onchain terms, artifact commitments, and successful transaction receipts. The adapter provider withdrew its accumulated credits.

- [Technical demo, 2:07](https://www.youtube.com/watch?v=1o65p1IbhSQ)
- [Product pitch, 1:37](https://www.youtube.com/watch?v=12_AjRvL2SU)
