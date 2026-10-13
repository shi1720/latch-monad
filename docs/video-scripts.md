# Product video narration

Actual hosted product footage, real Vast.ai retrieval, and real Monad testnet settlement. Google Neural2 synthesized narration is disclosed; English captions are burned in and separately published. The sandbox rejection segment is explicitly labeled.

## Technical demo

Meet Latch. Your agent has a budget. Give it a clear definition of done. A successful data request can still return an unusable result. Latch connects the rules, the output, and an inspectable payment.

Let's fetch real H100 offers from Vast's GPU marketplace. These prices come from the provider's API through our live adapter. Compare the actual location, hourly machine cost, and cost per GPU. Select an offer to inspect its JSON. The timestamp is when Latch retrieved it, not a claim about when the provider changed its price.

This selected offer passes our country, price, schema, and freshness checks. We reserve a small reference payment on Monad testnet and accept the result. These are real transactions. The adapter provider receives a withdrawal credit. This payment buys neither GPU capacity nor a reservation. The market data itself is free to browse.

Now we test a rejected delivery using an explicitly labeled stale fixture. The freshness check fails, so we do not accept it. After the short deadline, Latch refunds the escrow and withdraws the buyer's credit. Network fees still apply. Watch the separate reserve, refund, and withdrawal confirmations. The buyer can now inspect its recovered funds. No synthetic price is used as a fallback when the live source fails.

Open either receipt to inspect the buyer, provider, policy commitment, result digest, and transaction trail. Export the record or independently inspect its explorer links. A retry reconciles the original purchase instead of opening a second payment. The real source details remain in the accepted artifact.

Developers can reuse the contract and TypeScript SDK in their own agents. The buyer runs the checks and authorizes acceptance. The contract enforces payment authority and expiry. It does not independently verify hardware or guarantee quote availability. Latch. Pay for checked results.

## Product pitch

An agent can buy data in seconds. Knowing whether that purchase was useful is much harder.

Latch is led by Shivam Gupta. We're building an acceptance and settlement layer for developers whose agents buy structured data from independent suppliers.

Imagine a compute-sourcing agent asking for a fresh H100 quote in one region. A response arrives, but it's an hour old. The tool call succeeded. The task did not.

Latch connects the rules, the result, and the payment. The buyer commits a bounded budget and acceptance policy. Its application checks the output. Accepted work creates a provider credit on Monad. Failed purchases can be recovered after expiry. Every outcome has an inspectable receipt.

We start with a narrow customer: developers of research, enrichment, and pricing-monitor workflows. The reusable product is the contract and SDK. The live Vast marketplace adapter makes the workbench useful today: compare real H100 offers, inspect their provenance, and test the settlement lifecycle. We never substitute fake quotes when the source fails.

The business hypothesis is free infrastructure with paid hosted receipts, supplier adapters, and monitoring. Our next milestone is two external integrations and a thousand measured test jobs, followed by a willingness-to-pay test.

The buyer remains the verifier. We don't claim to prove real-world GPU delivery. Our focus is clear rules, recoverable execution, and accountable spending.

Latch. Pay for checked results.
