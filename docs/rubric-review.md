# Final provisional rubric review

Reviewed October 13, 2026 against the Trust, Identity & AI Infrastructure track's 20/20/15/25/20 weighting. This is a separate AI review within the same AI-assisted build team. It is not an organizer score, an independent human audit, or a prize prediction. Scores assess the delivered product and recorded evidence, with external validation kept separate from internal testing.

## Implemented and useful

Latch now retrieves real H100 marketplace offers from Vast.ai through a backend rather than defaulting to illustrative prices. The API normalizes provider identifiers, geography, hardware variants, full-machine cost, GPU count, and per-GPU comparison price. It identifies retrieval time separately from upstream update time. Firebase routes same-origin API requests to Cloud Run; failures are visible rather than replaced with fixture offers.

The working economic lifecycle remains native-MON escrow on Monad testnet, buyer-authorized acceptance, provider credit and withdrawal, and expiry refund with buyer withdrawal. A reusable SDK matches committed terms, reuses durable request identities, and handles uncertain transaction confirmation. The console exposes acceptance checks, source context, payment state, and portable receipt evidence.

These are practical developer-preview capabilities. They do not constitute a GPU rental service, an independently verified truth oracle, supplier-neutral dispute resolution, or a production-audited financial protocol.

## Evidence considered

- [Public application](https://latch-agent-receipts.web.app) and [public source](https://github.com/shi1720/latch-monad).
- Contract, policy, backend normalization, SDK, application, documentation, and test source.
- `public/deployment.json` and `public/live-evidence.json` for actual Monad deployment and economic lifecycle evidence.
- The build team reports 24 passing core tests and 35 passing browser regression cases in the final live-data build. These include contract, policy, SDK, quote API, and UI behavior. Browser mocks and injected events are testing tools, not actual blockchain transactions or users. The earlier 11-test core suite was independently rerun by this reviewer before the live-data expansion; the final larger suite result is attributed to the build team's execution report.
- The build team records a real accepted GPU artifact settlement and an intentionally rejected fixture followed by actual onchain refund recovery. The rejected artifact is a test input, not an unchanged provider listing. Test transactions are engineering evidence, not commercial volume.
- Two project-owned integration functions show SDK reuse. No external application team or customer adoption is established.
- Another AI code review found two P2 issues concerning pricing/retrieval consistency and SDK artifact durability. The build team reports fixes and regression coverage. This is useful review evidence, not an independent security audit or proof that no further defects remain.

## Weighted assessment

| Criterion | Weight | Score / 10 | Assessment |
| --- | ---: | ---: | --- |
| Technical execution | 20% | 8.5 | Real economic lifecycle, authorization and deadline enforcement, pull-payment safety, replay resistance, recovery-aware SDK, and a substantive real-data backend with source semantics. Recorded actual settlement and refund evidence strengthen execution. Buyer trust, unaudited contracts, and anonymous upstream access remain material dependencies. |
| Design and craft | 20% | 8.4 | Clear policy workbench, real-offer provenance, per-GPU versus full-machine cost distinction, portable receipts, recovery states, and broad browser regressions. Developer onboarding is more useful with actual data. Session wallets, browser-local history, and network/faucet dependencies remain preview limitations. |
| Originality and track insight | 15% | 6.4 | A focused acceptance-and-receipt workflow with real structured data is more convincing than generic escrow alone. Existing agent payments, escrow, validators, and observability tools make the category crowded. This is an incremental developer wedge, not a new trustless verification primitive. |
| Founder and market readiness | 25% | 6.2 | Specific first users, real provider data, competitor analysis, an explicit reference-fee distinction, and unit-economics thinking. No interviews, supplier agreement, willingness-to-pay evidence, or validated reason to pay for a layer over freely accessible pricing. Startup readiness remains the greatest gap. |
| Traction and path forward | 20% | 4.6 | Public product/source, real data retrieval, reproducible testnet evidence, and concrete integration targets. No external developers, customers, revenue, or commercial usage. A provider API integration and internally generated test volume are not adoption. |

**Weighted provisional score: 68.1 / 100.** Real data and clearer recovery/provenance improve the evidence modestly. They do not resolve the market-validation and supplier-trust questions. More tests and polish cannot substitute for independent demand.

## Material remaining gaps

1. **Buyer-controlled fairness:** a conforming provider can still be denied acceptance. Expiry returns funds to the buyer rather than guaranteeing supplier payment. Do not describe the mechanism as trustless delivery-versus-payment or guaranteed fair procurement.
2. **Truth and transformation trust:** the adapter queries a real provider, but prices, availability, hardware, and geography remain provider claims transformed by Latch. Retrieval time proves neither when the provider updated a listing nor how long it remains available. The contract does not independently verify those claims.
3. **Anonymous provider dependency:** keyless Vast.ai searches currently work, while official examples specify authentication. Optional server-side `VAST_API_KEY` helps deployment configuration but does not make anonymous access a supported guarantee. Authentication changes and upstream rate limits can break retrieval.
4. **No independent demand:** prospective users can already read Vast.ai prices. Latch must show that acceptance, reconciliation, and receipts save enough developer time or reduce enough operational loss to warrant adoption and payment. No external evidence establishes this yet.
5. **Limited policy generality:** the current artifact and validator are focused on H100 quote data. Policy commitments do not independently pin the JavaScript validator implementation. Integrators must preserve the agreed SDK release or commit out of band.
6. **Unaudited testnet operations:** native testnet MON, generated test-session keys, local receipt history, Cloud Run, public RPC, and faucet access are developer-preview choices. Independent audit, production operations, supplier fairness, and token-specific reviews remain future work.
7. **Submission completion:** prepared media, public video links, and submission copy must be checked against the final live-data release. Neither a deployed product nor a completed video proves that the submission platform accepted the entry. An accepted submission confirmation remains separate evidence.

## Highest-value next evidence

1. Have an independent developer integrate the SDK into a different application and document actual setup friction and outcomes with permission.
2. Interview both data buyers and suppliers about acceptance disputes. Determine whether buyer-controlled release is commercially acceptable before expanding the scope.
3. Test willingness to pay for hosted receipts, monitoring, and source adapters. Keep proposed workspace pricing labeled as a hypothesis until someone pays or commits.
4. Record the current hosted real-offer acceptance and a clearly labeled adversarial test with refund recovery. Explain per-GPU normalization, observation time, and the reference-fee boundary while showing actual receipts.
5. Confirm the precise final source commit, deployment, public videos, and accepted platform submission all describe the same release.

## Claim discipline

Real marketplace data is not independently verified capacity. A normalized per-GPU price does not mean one GPU can be rented separately. Latch's MON reference fee does not pay Vast.ai or purchase GPUs. A credited provider payment is not yet a withdrawal. Internal integration functions are not third-party adopters. Automated tests and testnet transactions are not customers, revenue, or commercial traction.

The supplied general rubric also gives equal weight to quality, technical excellence, Monad integration, track fit, and innovation/impact. Actual deployment and a complete financial lifecycle support technical and integration scores. Track fit is supported by reusable contracts and SDK interfaces. Innovation and impact remain limited by a crowded category and unvalidated external demand. Verify final organizer requirements and mandatory deliverables before submission.
