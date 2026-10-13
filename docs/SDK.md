# Integrating Latch

`sdk/client.ts` is a reusable native-currency escrow client. Supply your own viem wallet and public clients, deployed escrow address, and compiled ABI. The SDK never generates a wallet, reads a private key, or stores one. The reference browser application separately supports a generated test-only wallet stored in tab session storage; that demonstration onboarding is not SDK key management.

```ts
import { createLatchClient } from './sdk/client.ts';

const latch = createLatchClient({
  walletClient,
  publicClient,
  escrow,
  abi,
  // Your durable database write; called immediately after each transaction broadcast.
  onBroadcast: async transaction => database.saveTransaction(transaction),
});

// Generate ONCE per purchase and durably save before sending any transaction.
const purchase = await database.loadPurchase(purchaseId);
// purchase = { requestId: bytes32, provider: address, amount: bigint,
//              policy: { maxAgeSeconds, maxPriceUsd, region }, deadline: bigint }
const reserved = await latch.open(purchase);
const result = await latch.complete({
  key: reserved.key,
  policy: purchase.policy,
  payload: supplierResponse,
});
```

The example assumes application-provided clients, `database`, and supplier transport. See [`example-quote-agent.ts`](../scripts/example-quote-agent.ts) and [`example-schema-guard.ts`](../scripts/example-schema-guard.ts) for executable integration functions.

## Retry and recovery rules

1. Persist the request ID **and all original terms**, including deadline, before `open`. Never regenerate an ID because a request timed out. Distinct buyers have distinct receipt keys.
2. `open` returns the existing receipt when its terms match, including after acceptance or refund. Changed provider, amount, policy hash, or deadline fails instead of silently creating a replacement purchase.
3. Persist every broadcast hash using `onBroadcast`. `LatchPendingTransactionError.transaction` also exposes that hash. A timeout means confirmation is unknown; inspect the transaction and `readReceipt(key)`, then resume using the original purchase. A transaction already broadcast cannot be undone by a callback error.
4. A rejected result leaves its original escrow Open. After the deadline, call `refundExpired(key)`, then `withdraw()`. Both operations are safe to resume: an existing refund is returned, and zero-credit withdrawal sends no transaction.
5. `complete` compares the supplied policy commitment with the onchain policy. An already-accepted receipt returns success only for the identical result hash. Validation uses the buyer's clock for supplier timestamp age; expiry uses chain time.

Concurrent calls within one client instance for the same key are rejected. Across processes, contract request IDs prevent a second deposit with the same buyer/ID; concurrent duplicate transactions can still waste gas. Coordinate workers using your own durable job lock. The SDK cannot recover an ID that the application never saved.

## Trust and money boundaries

- This prototype uses native MON, with integer wei amounts. On Monad testnet these are test funds. It does not implement ERC-20 or mainnet stablecoin payments.
- The policy's `maxPriceUsd` caps each normalized quote in USD per GPU-hour, computed by the live adapter as upstream `dph_total / num_gpus`. Preserve full-machine cost and GPU count; the normalization does not make a single GPU independently rentable. It does **not** cap the purchase deposit; the caller explicitly sets `amount` and should enforce its own spending budget before `open`.
- A schema, region, timestamp, or price check evaluates supplier claims. It does not independently prove capacity, price truth, timestamp truth, or delivery. The buyer controls acceptance and can withhold it; providers must trust that behavior. No dispute oracle exists.
- Acceptance creates provider credit; expiry refund creates buyer credit. `withdraw()` releases **all** credits belonging to the connected account, not just one receipt. A buyer cannot withdraw the provider's credit.
- Supply clients connected to the same network. Contract addresses and receipt keys are network-specific; store chain ID and escrow address with your purchase records.
- This is tested prototype code, not an independently audited financial protocol. Review and audit before using real customer funds.

Run `npx tsx --test test/sdk.test.ts` for the local-chain integration test, including an actual broadcast followed by a simulated RPC confirmation timeout and safe resume.

## Use real quote data

The reference backend exposes `GET /api/quotes` and returns normalized real H100 offers from Vast.ai. In a supplier integration, reserve the intended fee with `open`, retrieve the artifact, then pass the chosen artifact and unchanged policy to `complete`. The UI may preflight a fetched artifact first for usability; that order is not a proof of supplier execution after escrow.

Use exact ISO country codes for `region`, or the policy's any-country wildcard selection. Do not infer a US East region from an unknown US location. Quote retrieval timestamps indicate when the adapter received data; cached responses retain the original timestamp. The service caches for 30 seconds and returns an error when it cannot retrieve usable upstream data, rather than returning fixture prices.

Run the local backend with `npm run start:quotes`, then `npm run dev` in another terminal. The Vite `/api` proxy targets `127.0.0.1:8080`. In production, Firebase's same-origin API rewrite targets Cloud Run. Set optional `VAST_API_KEY` in the backend environment only. Anonymous access was observed working, not guaranteed.

The native-MON escrow amount is a Latch reference fee for data acceptance. It is distinct from the USD hourly compute quote, does not rent or reserve capacity, and does not pay Vast.ai.

### Live quote purchase

`fetchLiveQuote(policy)` reads the deployed adapter, preserves provenance, and selects the cheapest returned offer that passes the policy. It does not claim a global best price. It fails on invalid, stale, unavailable, or nonconforming results without substituting a fixture. See `scripts/example-live-quote-agent.ts` for reserve-before-fetch integration with the existing durable purchase and broadcast callback. If data acquisition fails, preserve the original job and retry or refund after expiry; do not create a new request ID.

The live example requires an application-owned durable artifact store. It saves the exact payload before acceptance, reuses that payload on retry, and verifies its committed hash when recovering an already accepted job. Losing a paid artifact is a storage failure, not a reason to open a second purchase. A stale saved result remains subject to the original freshness policy and expiry recovery.
