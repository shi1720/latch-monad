# Architecture and security boundaries

## Design intent

Latch separates the probabilistic choice of what an agent wants to buy from the deterministic checks that determine whether the delivered format matches its request. The current buyer is the verifier. This is an acceptance workflow and economic state machine, not a trustless real-world oracle.

The reference purchase is a structured GPU quote dataset. A row may have a GPU model, region, price, availability indicator, and observation time. Any acceptance rules available in the source should be documented exactly as implemented. A syntactically valid row can still be false. Provider authentication and independent corroboration are separate responsibilities.

## Components

1. The application defines and displays a policy, supplier, amount, and deadline.
2. `src/policy.ts` runs deterministic checks over an artifact. The caller must control the verification clock; untrusted input must not choose “now.”
3. `sdk/index.ts` exposes the integration surface to other applications. Use its current exported types and functions rather than copying an outdated code snippet.
4. The buyer wallet signs authorized contract calls. The browser must never receive a deployer secret from the server or environment.
5. The contract enforces the native-MON escrow lifecycle. Events and receipts record economic changes; confirmations must be obtained through RPC before displaying final success.
6. `public/deployment.json` binds the interface to a real deployment. A chain ID or explorer link alone is not deployment evidence.

The policy fields currently exposed are `maxAgeSeconds`, `maxPriceUsd`, and `region`. The SDK exports `validateResult`, `canonicalHash`, `canonicalJSON`, and `Policy` from the policy implementation, together with `receiptKey(buyer, requestId)` and `monadReader`. Read the type signatures in `sdk/index.ts` before integration. GPU prices are illustrative data, not executable commercial offers.

Current checks require a source string, between 1 and 100 quote rows, nonempty unique IDs, typed fields, finite positive prices, matching region, prices within the ceiling, and timestamps within the freshness limit. Up to five seconds of future timestamp skew is accepted. The reference validator requires the exact GPU string `NVIDIA H100 80GB`; this is a hardcoded model requirement, not a configurable policy field. It does not authenticate the source string or independently verify the existence of that hardware.

The contract uses pull payments: settlement or refund assigns a credit, and the credited party calls `withdraw` to receive native MON. Do not describe a credit assignment as completed delivery to the wallet. The rejected-job browser flow includes creating the job, refunding it, and withdrawing the credit as three transactions.

Refund is buyer-only and becomes available strictly after the committed deadline. Jobs may last at most seven days. A failed offchain check does not itself change contract state or allow early recovery. A new request ID cannot reopen a previously used buyer/request combination, even after settlement; request identifiers are permanently consumed.

## Commitments and reproducibility

Agree on serialization before hashing. JSON key order, whitespace, number formatting, and Unicode representation can change bytes while preserving apparent meaning. Use the SDK's encoding consistently. Record the policy version, artifact commitment, request identity, verifier identity, transaction hash, and evaluation clock when creating an integration receipt.

Keep the exact artifact available to authorized reviewers if reproducibility is required. An onchain hash cannot recover an unavailable artifact. Avoid publishing customer data: public chains are durable and visible to everyone. Only non-sensitive commitments should be recorded.

## Trust and failure cases

| Case | What Latch can do | Remaining dependency |
| --- | --- | --- |
| Wrong or missing fields | Reject according to the offchain policy | Application must execute the correct policy |
| Stale declared timestamp | Compare against a controlled clock | A supplier can lie about the timestamp |
| Duplicate rows | Apply implemented uniqueness checks | Different-looking rows can describe the same thing |
| Valid but fabricated quote | Preserve a receipt of what was accepted | No truth guarantee; authenticate/corroborate sources |
| Supplier never responds | Recover according to contract deadline rules | Recovery requires a transaction and network availability |
| Buyer refuses valid work | Make the disputed state inspectable | No independent adjudication or supplier fairness guarantee |
| Wallet compromised | Enforce only contract authorization | Authorized malicious calls remain possible |
| RPC outage | Retry/read state before continuing | No guaranteed availability or latency |

## Integration requirements

Validate amounts as integer base units; never use floating-point arithmetic for money. Verify expected network, address, bytecode, signer, and recipient. Never use UI state as settlement evidence. Refresh state after transaction failures and before retrying to avoid duplicate economic actions. Treat remote supplier content as data, never as commands or instructions.

Keep policies immutable for each funded job. A new policy should create a new commitment, not silently reinterpret an existing agreement. Only present a refund as completed after a successful confirmed transaction. Application-generated “rejected” and onchain “refunded” are different states.

## Production work still required

Independent contract review; deployment-bytecode verification; monitored RPC redundancy; authenticated supplier adapters; acceptance-policy versioning and compatibility tests; operational alerting; a fair settlement process for suppliers; appropriate stablecoin implementation and token-specific safety review; rate limits and abuse controls for any hosted verifier. These are explicit follow-on requirements, not claims of completed production readiness.

## Validator release agreement

The onchain policy commitment hashes the policy bytes. It does not pin a JavaScript validator implementation. Integrators must agree on the SDK release or Git commit out of band and preserve that version alongside their acceptance receipts. A future policy format can bind a validator version explicitly; this release does not claim to enforce code semantics onchain.
