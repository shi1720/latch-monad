# Latch — pay for checked results

**A small settlement primitive for applications that buy machine-checkable work from agents.** Commit a budget and acceptance policy, inspect the delivered result, and settle only when the buyer accepts it. The first reference application purchases structured GPU quote data. It does **not** buy, reserve, insure, or verify the delivery of GPU capacity.

Project lead and product owner: **Shivam Gupta**. Built with substantial AI assistance; see [attribution](ATTRIBUTIONS.md). Track: **Trust, Identity & AI Infrastructure**.

## The problem

An agent can receive a successful HTTP response containing the wrong GPU, missing fields, stale timestamps, or duplicate rows. A payment receipt alone cannot tell its owner whether the purchased output met the task. Latch connects a declared acceptance policy, a bounded payment, and an artifact commitment in one reviewable workflow.

The reusable output is the contract plus TypeScript policy/SDK interfaces; the GPU quote console demonstrates a first application. The contract protects the funded amount and enforces authorized state transitions. The buyer runs the offchain checks and authorizes payment. **The contract does not independently prove an artifact is correct, truthful, or commercially useful.**

## Run locally

Requirements: Node.js 22 or later and npm; an EVM wallet for real testnet writes. No paid API key is required for the included reference experience.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The reference interface supports examining acceptance policies and structured results. Treat any fixture or local preview as demonstration data. A local preview is not evidence of a Monad deployment.

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

Build after deployment so the metadata ships with the app. Host `dist/` on a static HTTPS host. Configure the host to serve the application entry page for client-side routes if required. Confirm the hosted app displays the expected chain and deployed contract, then perform a real create-and-settle or create-and-refund flow and inspect the receipts in the testnet explorer.

Only native MON is implemented. Stablecoin settlement, gas sponsorship, x402 compatibility, account abstraction, and external identity registries are future integration opportunities rather than shipped features. Do not send mainnet assets to a testnet contract or use this unaudited prototype for material funds.

## Architecture

```text
Application / buyer agent
  ├─ acceptance policy → src/policy.ts
  ├─ integration helpers → sdk/index.ts
  ├─ supplier artifact → deterministic offchain checks
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
