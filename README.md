# Latch: pay for checked results

**A small settlement primitive for applications that buy machine-checkable work from agents.** Commit a budget and acceptance policy, inspect the delivered result, and settle only when the buyer accepts it. The first reference application purchases structured GPU quote data. It does **not** buy, reserve, insure, or verify the delivery of GPU capacity.

Project lead and product owner: **Shivam Gupta**. Built with substantial AI assistance; see [attribution](ATTRIBUTIONS.md). Track: **Trust, Identity & AI Infrastructure**.

## The problem

An agent can receive a successful HTTP response containing the wrong GPU, missing fields, stale timestamps, or duplicate rows. A payment receipt alone cannot tell its owner whether the purchased output met the task. Latch connects a declared acceptance policy, a bounded payment, and an artifact commitment in one reviewable workflow.

The reusable output is the contract plus TypeScript policy/SDK interfaces; the GPU quote console demonstrates a first application. The contract protects the funded amount and enforces authorized state transitions. The buyer runs the offchain checks and authorizes payment. **The contract does not independently prove an artifact is correct, truthful, or commercially useful.**

## Run locally

Requirements: Node.js 22 or later and npm; an EVM wallet for real testnet writes. The quote adapter currently supports observed anonymous Vast.ai searches. Optional server-side `VAST_API_KEY` enables authenticated requests; anonymous access is not a guaranteed provider contract.

```sh
npm ci
npm run start:quotes
```

Leave the quote server running, then in a second terminal run `npm run dev`. Vite proxies `/api` to `http://127.0.0.1:8080`. Open the local URL printed by Vite. The default result comes from real Vast.ai marketplace offers through `GET /api/quotes`; the server caches upstream responses for 30 seconds. Upstream failure is visible and never silently replaced with fixture data. A local preview is not evidence of a Monad deployment.

```sh
npm test
npm run build
```

The test suite checks the implemented policy and contract behavior; its output is the source of truth for which checks currently pass. Test execution is not an independent audit. Production assets are generated in `dist/`.

## Deploy to Monad testnet

The script accepts optional `MONAD_RPC_URL` and `DEPLOYER_PRIVATE_KEY` environment variables. Without a supplied key it creates a **testnet-only** deployer in ignored `work/deployer.json`, restricted to file mode 600. Fund the printed deployer address with **testnet MON** using the official Monad testnet faucet, then rerun deployment. Never put a key in browser code, Git, screenshots, or a submission.

```sh
npm run deploy
```

The command invokes `node scripts/deploy.mjs`. Deployment metadata is recorded in **`public/deployment.json`**. Use that file for the actual chain, contract address, and deployment transaction; never substitute an example address. A missing or pending deployment file means the public deployment requirement is not yet satisfied. `npm run compile` compiles the contract separately when needed.

Build after deployment so the metadata ships with the app. The production frontend uses Firebase Hosting; its same-origin `/api/quotes` rewrite routes to the quote service on Cloud Run. Static `dist/` hosting alone does not supply that API. Deploy the quote backend and preserve the API rewrite when reproducing hosting. Keep optional `VAST_API_KEY` in the backend environment, never a Vite variable or public asset. Confirm the hosted app retrieves quotes, displays the expected chain and contract, and completes a real create-and-settle or create-and-refund flow with explorer receipts.

Only native MON is implemented. Stablecoin settlement, gas sponsorship, x402 compatibility, account abstraction, and external identity registries are future integration opportunities rather than shipped features. Do not send mainnet assets to a testnet contract or use this unaudited prototype for material funds.

## Architecture

```text
Application / buyer agent
  ├─ acceptance policy → src/policy.ts
  ├─ integration helpers → sdk/index.ts
  ├─ GET /api/quotes → Cloud Run adapter → Vast.ai marketplace
  ├─ retrieved quote artifact → deterministic offchain checks
  └─ buyer wallet → escrow contract on Monad
                         ├─ locks native MON
                         ├─ authorizes settlement / refund transitions
                         └─ emits auditable records and commitments
```

The buyer commits to a policy and payment before accepting a result. The policy defines the fields and constraints the application will check. The application compares a delivered artifact with those constraints and exposes individual outcomes to the operator. The authorized buyer decides whether to accept and settle. Contract events and transaction receipts make the economic outcome inspectable.

Artifact or policy hashes are commitments to bytes, not proofs of truth. Keep sensitive source data offchain. A hash of low-entropy data can still reveal information through guessing; hashing alone is not encryption. See [architecture and security](docs/architecture-security.md) for boundaries and integration guidance.

## Why Monad

Small jobs should not require a long settlement wait or a large minimum payment. Monad provides EVM compatibility and fast settlement suitable for frequent bounded jobs. Latch uses actual contract state and receipts for the financial lifecycle rather than treating the chain as a decorative activity log. The same primitive is technically portable to other EVM chains; the project does not claim that escrow is uniquely possible on Monad. Demo timings should be measured from observed transactions, not inferred from advertised network throughput.

## Security model

- The buyer is the verifier and settlement authority. A supplier must trust that buyer to accept conforming work; Latch does not solve buyer nonpayment fairness or add an independent court.
- There is no administrative truth oracle or discretionary administrator. Verify the deployed bytecode and source before relying on this property.
- Offchain checks can enforce structure and declared bounds, but cannot establish real-world GPU availability, ownership, price accuracy, or delivery.
- RPC failures, wallet rejection, and delayed inclusion are possible. Always distinguish transaction submission from confirmed settlement.
- Only the buyer can request a refund, and only after the job deadline. Rejection by the offchain validator does not unlock an immediate refund. Do not promise instant automatic refunds without observing the relevant transaction.
- Refund and payment balances use pull credits. A credited balance is still held in the contract until its owner calls `withdraw`; creating a rejected job, refunding it, and withdrawing it require separate transactions.
- This implementation is unaudited. Tests and reproducible deployment improve reviewability, not production assurance.

## Repository guide

| Path | Purpose |
| --- | --- |
| `src/` | Reference application and policy checks |
| `src/policy.ts` | Deterministic acceptance-policy implementation |
| `server/` | Real Vast.ai quote adapter and same-origin API |
| `sdk/index.ts` | Application integration surface |
| `contracts/` | Settlement contract source |
| `scripts/deploy.mjs` | Environment-configured deployment |
| `public/deployment.json` | Actual deployment metadata when available |
| `docs/architecture-security.md` | Trust model and integration notes |
| `docs/commercial-plan.md` | First user, competitors, economics, validation plan |
| `docs/video-scripts.md` | Verbatim technical demo and pitch scripts |
| `docs/submission.md` | Submission text and honest status checklist |
| `docs/rubric-review.md` | Provisional self-assessment and release gates |

## Build provenance and submission status

The source license is [MIT](LICENSE). Libraries and AI assistance are disclosed in [ATTRIBUTIONS.md](ATTRIBUTIONS.md). The Git history records actual development during the build window; do not backdate commits or imply that a fixture is commercial usage.

Public repository, hosted product, deployed contract, and public video links must be verified before submission. Contract details belong in `public/deployment.json`; final URLs belong in the submission form and [submission checklist](docs/submission.md). A working local build does not complete those external requirements.

## Published build and evidence

- Public source: [GitHub repository](https://github.com/shi1720/latch-monad)
- Primary product: [Firebase hosted application](https://latch-agent-receipts.web.app)
- Deployment: `0xcfeb00b37333b3f4397eed2790e2869a40ffb871`, Monad testnet (10143).
- Reproducible real transactions: [`public/live-evidence.json`](public/live-evidence.json), including provider withdrawal, buyer refund withdrawal, and replay rejection. The live pricing run is in [`public/live-pricing-evidence.json`](public/live-pricing-evidence.json), with an accepted Vast.ai artifact and independently checked contract commitments. These are automated integration trials, not user traction.
- SDK integration guide: [docs/SDK.md](docs/SDK.md). Use a durable request ID and persist `onBroadcast` hashes before waiting for receipts.

### Judge access

No login credentials or paid API keys are needed. Run local acceptance checks without an account. For onchain writes, connect your EVM wallet, or use the browser-generated test wallet when no extension is present. The app requests free testnet MON from a public faucet; availability and rate limits are outside our control. This test wallet's private key remains in this tab's `sessionStorage`; closing the tab can make it inaccessible. Never use it for valuable funds. Wallet connection identifies the settlement account; the application has no server-side identity session. The backend serves public pricing data and does not custody wallet keys.

The workbench retrieves actual Vast.ai H100 offers and preflights the selected output before reserving funds for an inspectable reference transaction. For actual supplier integrations, the SDK `open` operation commits policy and budget **before** calling the supplier; see the two example agent functions. Provider fields remain upstream claims. `observedAt` records adapter retrieval time, not when the provider last changed the price. A 30-second cached response retains its original retrieval time. The browser persists an unfinished purchase and reuses its identity on retry. Do not clear browser storage while recovering a pending transaction.

Development dependencies include Ganache's legacy dependency tree with known npm advisories; Ganache is used only in isolated local tests and is not shipped in the static production bundle. Do not expose a Ganache server publicly. This release is a tested testnet developer preview, not a mainnet-audited financial product.

## Hosting and submission status

Firebase project creation was blocked by project quota. Hosting therefore uses the newly created isolated `latch-agent-receipts` site in the existing defaultGemini project (`gen-lang-client-0444960702`). The deployment targets only that named site; no other deployment was modified. See `firebase.json` and `scripts/deploy-firebase.sh` for the precise target.


## Firebase hosting and regression checks

Primary product URL: **https://latch-agent-receipts.web.app**.

The separate `latch-agent-receipts` Hosting site is contained in the existing `gen-lang-client-0444960702` Firebase project because the Google Cloud account reached its project-creation quota. The deployment targets only this site; it does not replace another site's release. No billing account was added for this deployment.

```sh
npm run test:browser
npm run test:hosted
npm run deploy:firebase
```

Firebase deployment requires an authenticated Firebase CLI account with access to that project. The script runs a clean install, core tests, and a production build before deployment. See [docs/TESTING.md](docs/TESTING.md) for browser installation, coverage, and limits. The GitHub workflow checks the contract, SDK, production build, and browser suite on `main`.

## Product videos

- [Technical demo, 2:07](https://www.youtube.com/watch?v=1o65p1IbhSQ)
- [Product pitch, 1:37](https://www.youtube.com/watch?v=12_AjRvL2SU)

Both show real product footage with synthesized narration and captions. [Release verification](docs/RELEASE.md) records the checks and material limits.

## Real pricing semantics

`GET /api/quotes` returns normalized H100 marketplace listings with original offer identity and source attribution. The adapter uses exact ISO country codes for geography; the policy can accept any country using its wildcard selection. A country code does not establish a particular city, datacenter, latency, or data-residency certification.

The normalized per-GPU hourly amount is Vast.ai's `dph_total / num_gpus`. The full-machine hourly amount and GPU count must remain visible so an eight-GPU machine is not mistaken for a purchasable single-GPU instance. The listed total reflects the upstream search configuration; bandwidth, storage changes, taxes, and actual billing may differ. Marketplace availability and prices can change before rental.

Latch does not rent, reserve, or pay Vast.ai for GPUs. Its native-MON escrow is a reference fee for acceptance of the retrieved data artifact, separate from the provider's quoted USD compute price. Vast.ai does not receive that reference payment. The buyer remains responsible for acceptance; no smart contract verifies provider truth or actual GPU delivery.

Source documentation: [Vast.ai search offers](https://docs.vast.ai/api-reference/search/search-offers) and [Vast.ai pricing](https://github.com/vast-ai/docs/blob/main/guides/pricing.mdx). The provider documents authentication; working anonymous searches are observed behavior and may cease.
