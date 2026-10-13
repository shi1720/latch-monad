# Commercial plan :  a testable wedge

## First user and first job

The first user is a developer building a procurement or research agent that purchases structured supplier data. The first job is a GPU quote dataset: the buyer needs a specific region, a maximum quoted price, and a freshness window before it can compare offers. The purchase is information, not GPU capacity. This keeps the acceptance conditions legible and avoids pretending that a smart contract can verify a physical machine's availability.

The immediate value is an inspectable answer to “what did my agent accept and pay for?” A task owner can see the committed rules, checks, artifact commitment, payment, and recovery path. The developer can reuse these interfaces across suppliers rather than hiding acceptance logic inside a single prompt.

## Why this is a product hypothesis

Paid agent tools already exist. [Apify documents paid Actors](https://docs.apify.com/actors/running/actors-in-store), including pay-per-event and usage pricing; [Nevermined](https://nevermined.ai/) offers delegated budgets and merchant metering. These establish adjacent supply and payment workflows, not demand for Latch specifically. No interview, pilot, letter of intent, revenue, or external integration has been obtained for Latch. All pricing, adoption, and conversion figures below are hypotheses or targets.

## Competition and honest differentiation

| Alternative | What it already solves | Latch's intended focus |
| --- | --- | --- |
| [x402](https://github.com/x402-foundation/x402) | Extensible HTTP-native payment protocol | Buyer-declared structured-output acceptance and receipts; no x402 integration currently claimed |
| [AGIRAILS ACTP](https://www.agirails.io/learn/agirails-comparisons/) | Noncustodial agent escrow, attestations, disputes, reputation | Narrow deterministic policies for data artifacts; no claim to invent escrow |
| [Nexus](https://nexus.platon.network/docs/en/insights/nexus-vs-x402) | Escrow-backed settlement assurance | Small developer-facing policy/receipt primitive on Monad |
| [Nevermined](https://nevermined.ai/) | Delegated budgets, payments, metering | Acceptance evidence linked to a particular deliverable |
| An in-house validator plus ordinary payment | Cheap and flexible for a single supplier | Shared receipt and settlement format across independently operated suppliers |

The last alternative is the most serious early competitor. Latch earns adoption only if integration and debugging become easier than maintaining bespoke acceptance and payment state. Escrow alone is neither novel nor a moat.

## Business model hypothesis

Keep contracts, local policy evaluation, and the SDK open source. Test a hosted service with searchable receipts, policy templates, supplier adapters, webhooks, and operational monitoring. A possible first experiment is **$29 per developer workspace per month**, with a metered tier for high-volume hosted verification. This is unvalidated pricing, not a published service or proven willingness to pay.

Avoid a percentage fee on tiny transactions initially. One percent of a one-cent purchase is $0.0001; even 100,000 such jobs produce only $10 before costs. Workspace revenue ties the business to developer time saved. Any future transaction pricing must cover RPC, verification, storage, support, and the cost of failed jobs. Users pay network fees in the current implementation; gas sponsorship is not shipped.

The free local experience does not require a paid AI model. Deterministic validation avoids adding an inference bill to every acceptance decision. The largest likely operating costs are support, authenticated provider integrations, RPC reliability, and retained artifacts, so store commitments by default and make artifact retention explicit.

## First 30 days after the hackathon

1. Interview five developers operating paid agent/data workflows. Ask for recent failed purchases, current reconciliation effort, and whether supplier fairness blocks escrow adoption. Do not pitch until the failure is understood.
2. Recruit two design partners to integrate the SDK into separate applications. Obtain explicit permission before contacting teams or naming them publicly.
3. Measure integration time, policy failures, successful withdrawals, disputed results, and end-to-end costs on testnet. Publish denominators and distinguish synthetic runs from people.
4. Target 1,000 test jobs across those integrations, with zero unresolved escrow accounting errors. This is a target, not current traction.
5. Test whether one partner will pay for hosted receipts and monitoring. If no one values the receipt workflow, narrow or change the wedge before building a marketplace.

## Distribution and defensibility

Publish the SDK and one short “add acceptance-backed payments to your data tool” guide. Share reproducible integrations with Monad developers and paid-tool authors after obtaining any required communication authorization. Focus on one supplier category instead of buying broad consumer traffic.

Defensibility would come from useful adapters, acceptance-policy compatibility, and developers depending on portable receipts. The implementation is open source and can be copied. There is no current network effect or exclusive supplier relationship.

## Stop conditions

Do not pursue the hosted business if developers cannot name costly acceptance failures, if suppliers will not tolerate buyer-controlled release, or if ordinary payment plus an in-house validator solves the problem with less friction. An independent verifier or dispute process could address supplier fairness later, but would introduce new trust and operational obligations. It is not part of this implementation.
