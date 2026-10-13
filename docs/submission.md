## Inspiration

A successful tool call is not the same as useful work. A compute-sourcing agent can receive a stale price, the wrong GPU, or a quote outside its budget. The HTTP request succeeded. The task did not. Latch connects a clear definition of done to a recoverable payment.

## What it does

Latch is an acceptance and settlement primitive for applications buying machine-checkable data. The first application connects to the real Vast.ai GPU marketplace. Users fetch current H100 listings, compare country and per-GPU prices alongside full-machine costs, inspect an offer's source and retrieval time, and select a structured result for validation.

The buyer sets country, price, and freshness limits. Passing results can be settled on Monad testnet. Rejected purchases can be refunded after expiry. Each outcome has an exportable receipt with policy and result commitments, participants, and transaction evidence. Permanent buyer-scoped request IDs and broadcast recovery prevent retries from opening a second identical purchase.

Market data is free to browse. The 0.001 testnet MON reference payment credits the Latch adapter provider. It does not pay Vast.ai, rent GPUs, or reserve capacity. Freshness measures Latch retrieval time because the upstream does not supply a signed observation timestamp. Availability and pricing remain provider claims.

## How we built it

Shivam Gupta leads the product. React, TypeScript, Vite, Lucide, and viem power the interface and client. A dependency-free Node service on Cloud Run queries a fixed, bounded Vast.ai search through a same-origin Firebase Hosting route. It normalizes exact country codes, preserves instance and per-GPU prices, shares concurrent fetches, and caches successful results for 30 seconds. Upstream failures are explicit, with no synthetic or expired-cache fallback.

The reusable output is an immutable Solidity escrow and TypeScript SDK. The SDK reserves policy and budget before requesting supplier data, checks the policy commitment, then authorizes acceptance. A live quote integration example selects the cheapest conforming returned offer. Pull withdrawals and reentrancy protection separate credits from transfers.

Substantial AI assistance was used for implementation, research, testing, documentation, and narrated media. It is disclosed in the repository. Automated trials are implementation evidence, not customer traction or an independent audit.

## Challenges we ran into

Browser CORS prevented direct access to the provider API. We built a controlled server adapter instead of exposing credentials or relying on screenshots of prices. Comparing multi-GPU machines required preserving the full-machine price and clearly distinguishing it from a normalized per-GPU comparison unit.

A transaction can succeed after the client loses its confirmation. Opening a new request on retry could pay twice. We persist broadcast hashes before polling and reconcile the original contract state. Actual Monad testing also exposed signing and account-state timing issues that isolated local tests did not reveal.

## Accomplishments that we're proud of

The hosted application now connects real GPU market data to deterministic checks and actual Monad settlement. Users can inspect source provenance, filter offers, export data and receipts, and recover rejected purchases. Sandbox failure fixtures are explicitly labeled and separate from the real feed.

Tests cover source normalization, malformed data, timeouts, cache behavior, query abuse, unavailable sources, authorization, replay protection, expiry boundaries, hostile withdrawal callbacks, SDK recovery, receipt export, storage failures, keyboard access, and responsive layouts. The demo shows fresh live data and real testnet transactions.

## What we learned

Useful agent payments need visible rules, provenance, explicit settlement authority, and recovery. A fresh retrieval is different from a fresh provider observation. A policy hash commits to bytes, not truth. The buyer remains the verifier, and suppliers must trust its acceptance decision. Good infrastructure makes these boundaries legible.

## What's next

Our first intended customer is a developer of research, enrichment, or compute-pricing workflows buying structured results from independent suppliers. The commercial hypothesis is free open-source contracts and SDK, with paid hosted receipt monitoring, maintained supplier adapters, and operational support. Demand and pricing remain unvalidated.

Next milestones are two external developer integrations and 1,000 measured jobs, tracking rejected outputs, recovery success, API availability, and willingness to pay. Authenticated supplier envelopes, stablecoin settlement, independent verification, and a security review are launch gates for material funds.

## Access and deployment

Product: https://latch-agent-receipts.web.app
Source and setup: https://github.com/shi1720/latch-monad
Monad testnet chain ID: 10143
Contract: 0xcfeb00b37333b3f4397eed2790e2869a40ffb871
Deployment transaction: 0xf818227f6219893732734b4d260d1edb776a0cd91b22e9dbd6b930355e8918d3

No login or paid API key is required for browsing and local checks. For testnet writes, connect an EVM wallet or use the browser's test-only wallet. Faucet availability is external. Never send valuable assets to the browser key or unaudited testnet contract. Anonymous marketplace search currently works but the provider may require server-side API authentication later; failures remain visible.
