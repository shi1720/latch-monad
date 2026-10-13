# Recording kit

Project lead and speaker: Shivam Gupta. Read the scripts verbatim only after confirming that the corresponding flow works. Record the real hosted application and actual Monad transactions. Never speed up or splice a transaction in a way that implies faster settlement. Conceal private keys and unrelated account details. Add captions if possible.

## Technical demo :  target 2:35, hard limit 3:00

Approximately 325 words. Rehearse once; transaction waits are the main variable. If needed, prepare funded testnet accounts and a fresh job before recording. Show existing real receipts rather than inventing successful transactions during a network outage.

### Verbatim narration

“I'm Shivam Gupta, and this is Latch: pay for checked results.

When an agent buys data, a successful response doesn't necessarily mean it received what it asked for. A GPU quote can be from the wrong region, outside the budget, or too old to use.

Latch connects the acceptance rules, the delivered artifact, and the payment. This reference application purchases structured GPU quote data. It does not reserve or deliver a GPU.

Here are the rules: the region, maximum quoted price, and freshness window. These are visible before payment. The supplier prices in this demonstration are illustrative, so I'm demonstrating acceptance and settlement rather than a live capacity marketplace.

First, I'll inspect a result that meets the policy. The checks pass. I can fund the bounded job on Monad testnet and authorize acceptance. Here is the confirmed transaction and the contract record. The policy and artifact commitments let an application connect the economic receipt to the output it evaluated.

Now I'll use a result that fails the policy. The failed check is visible, and I don't accept the delivery. After the job deadline, I'll show the refund transaction and withdraw the credited balance. Refund credit and money arriving back in the wallet are separate steps; Latch makes that distinction explicit.

The trust boundary matters. These checks run offchain, and the buyer is the verifier. The contract enforces who can settle and how funds move. It does not prove that a quote is true or that physical GPU capacity exists. Suppliers must still trust the buyer's acceptance decision.

The reusable product is the contract and TypeScript integration surface. Another application can use the same policy checks and receipt format without adopting this console.

Monad gives small, repeated jobs fast EVM settlement. This release uses native testnet MON; stablecoins and independent verification are future work.

Latch makes agent spending reviewable: agree on the rules, inspect the result, and connect acceptance to settlement.”

### Shot list

| Time budget | Screen/action | Evidence to capture |
| --- | --- | --- |
| 0:00-0:20 | Product overview | Name and real running application |
| 0:20-0:45 | Policy and example result | Region, price cap, freshness; illustrative-data label |
| 0:45-1:25 | Passing result and funded acceptance | Wallet approval, confirmed state, explorer receipt |
| 1:25-2:00 | Failing result; refund; withdraw | Failed check, separate refund and withdrawal confirmations |
| 2:00-2:20 | Receipt details and trust boundary | Artifact/policy commitments, native MON, buyer verifier |
| 2:20-2:35 | Product overview / integration panel | Closing statement |

Refund is available only after expiry. Prepare a short-deadline test job and wait for expiry before the recovery segment. If the rejected-flow transactions exceed the budget, use a previously completed real rejected job and show its refund and withdrawal explorer receipts while explaining the two steps. Clearly state that it is an earlier completed test. The video must remain actual operation, not slides or a code walkthrough.

## Pitch video :  target 1:40, hard limit 2:00

Approximately 235 words. Camera introduction plus a few product shots; this is separate from the technical demo.

### Verbatim narration

“I'm Shivam Gupta, project lead and product owner of Latch.

AI agents are starting to buy tools and data. But a payment receipt answers only one question: did money move? It doesn't answer the question the owner cares about: did my agent get something it could actually use?

Our first use case is buying structured GPU quote data. If the result is stale, outside the requested region, or over the price limit, the agent shouldn't quietly treat it as a successful purchase.

Latch is a developer primitive that connects a declared acceptance policy, a bounded escrow, and an inspectable receipt. The reference application shows passing results, rejected results, Monad settlement, and refund recovery.

We're deliberately precise about trust. The buyer evaluates the result. The contract enforces the payment lifecycle; it doesn't claim to verify real-world GPU delivery.

Existing payment and escrow systems are strong competition. Our wedge is a small, reusable acceptance and receipt workflow for developers buying machine-checkable data from independent suppliers.

The startup hypothesis is open-source infrastructure with paid hosted receipts, supplier adapters, and monitoring. We haven't validated pricing or claimed customer traction. The next milestone is two external application integrations and a thousand measured test jobs, followed by a real willingness-to-pay test.

Monad makes repeated small settlements practical without a long wait between jobs. Latch turns that speed into an accountable purchasing workflow.

Pay for checked results. That's Latch.”

### Shot list

- 0:00-0:12: Shivam on camera; name and project lead title.
- 0:12-0:40: Real policy and failing-result screen.
- 0:40-1:05: Real acceptance/refund receipts.
- 1:05-1:25: Speaker explaining first users and business hypothesis.
- 1:25-1:40: Running product and closing line.

## Optional advertisement :  approximately 20 seconds

“Your agent bought the data. Was it usable? Latch checks the rules you agreed: region, price, freshness. See the result. Accept the delivery. Follow the payment on Monad. For developers building accountable agent workflows. Latch: pay for checked results.”

Only record this after the mandatory videos. Do not imply audited security, customer adoption, live GPU supply, or universal fraud prevention.
