# Final provisional rubric review

Reviewed October 13, 2026 against the Trust, Identity & AI Infrastructure track's 20/20/15/25/20 weighting. This is a separate AI review within the same AI-assisted build team, not an organizer score, independent human audit, or prize prediction. It evaluates the delivered source and evidence rather than the intended roadmap.

## Evidence reviewed

- [Public application](https://latch-agent-receipts.web.app) and [public repository](https://github.com/shi1720/latch-monad) both responded HTTP 200 during this review. HTTP availability does not establish every hosted interaction works.
- Contract source, policy implementation, SDK client, reference application, documentation, and test definitions were inspected.
- `public/deployment.json` records Monad testnet chain 10143, the deployment transaction, and escrow address.
- `public/live-evidence.json` records actual testnet open, accept, provider withdrawal, refund, buyer withdrawal, and duplicate-request rejection evidence. These are engineering test transactions, not customer volume.
- The implementation has 11 core contract, policy, and SDK tests and 21 browser regression cases. Browser cases include mocked RPC and injected receipt events; those must not be described as 21 real blockchain transactions. The main build team reports these suites passing. Core tests were rerun during this review: all 11 passed, with zero failures. Ganache used its JavaScript fallback because its optional native WebSocket binary did not match the local Node build.
- Two example integration functions demonstrate the reusable client. They are built by this project team and are not external integrations or adoption.

## Weighted assessment

| Criterion | Weight | Score / 10 | Assessment |
| --- | ---: | ---: | --- |
| Technical execution | 20% | 8.3 | Real contract lifecycle, pull payments, buyer-scoped permanent request IDs, authorization/deadline tests, withdrawal failure and reentrancy coverage, and an SDK with commitment matching and confirmation-timeout recovery. The buyer remains the verifier, the policy is narrowly specialized, and the system is unaudited. |
| Design and craft | 20% | 8.2 | Clear acceptance workbench, visible individual checks, portable receipt details, recovery state, and responsive regression coverage. Native testnet-only signing and a generated session wallet lower setup friction but are not a production account or identity system. Receipt history is browser-local. |
| Originality and track insight | 15% | 6.2 | Acceptance evidence linked to payment is a legible developer workflow. Agent escrow, budget delegation, and receipts already exist elsewhere. A GPU quote validator plus escrow is an incremental wedge, not a new trustless verification primitive. |
| Founder and market readiness | 25% | 6.0 | Specific first developer segment, competitor comparison, honest supplier-trust limits, explicit unit-economics thinking, and unvalidated hosted-service pricing. No buyer interviews, supplier commitments, willingness-to-pay evidence, or authenticated live GPU data integration. |
| Traction and path forward | 20% | 4.5 | Public running product, public source, real testnet evidence, and clear next integration milestones. No external developers, customers, revenue, or commercial usage are established. Internal examples and automated tests are not adoption. |

**Weighted provisional score: 66.3 / 100.** This is a substantial working prototype with good engineering evidence and honest boundaries. The largest remaining weakness is market validation and differentiation, followed by the absence of supplier-neutral verification. Cosmetic iteration alone cannot close those gaps.

## Material remaining gaps

1. **Supplier fairness:** a conforming provider can still be denied acceptance by the buyer. The deadline returns money to the buyer; it does not ensure supplier payment. Do not pitch this as trustless delivery-versus-payment or guaranteed fair procurement.
2. **Source truth:** timestamps, source labels, prices, and GPU descriptions are supplier claims. The validator checks declared constraints, not real-world truth or capacity. All demonstrated quotes are illustrative.
3. **Policy generality and versioning:** the current validator is specific to H100 quote data. Region, freshness, and price are configured, while the H100 model is an exact hardcoded requirement. The commitment covers policy values but does not itself version the offchain validator implementation. Applications must agree on validator semantics out of band.
4. **No independent adoption:** two internal integration functions show reuse, not an external team's adoption. A real integration and candid buyer/supplier feedback would materially improve the founder and traction scores.
5. **Prototype operating model:** native testnet MON, browser-local receipts, test-session key storage, and third-party faucet availability do not constitute production onboarding, monitoring, or financial operations. The contract has not been independently audited.
6. **Submission completion:** technical demo and pitch scripts exist, but final public video URLs and submission confirmation must be checked separately. Missing mandatory videos or a missing submission overrides this score.

## Small fixes identified in this review

The architecture GPU-model description and SDK wallet-scope wording were corrected during this review. The build team is correcting the transaction-count wording. The remaining recommendations below are opportunities, not claims of shipped changes.

- Corrected: architecture text now states that the code requires exactly `NVIDIA H100 80GB`.
- Count rejected-flow transactions accurately: reserve, refund after expiry, then withdrawal are three confirmed writes. A credited refund is not yet wallet delivery.
- Corrected: SDK documentation distinguishes its lack of key generation from the browser application's generated test-session wallet.
- Prefer the reusable `createLatchClient` example in the developer-facing UI over a direct low-level `accept` snippet, so adopters inherit commitment matching and retry/recovery guidance.
- Give the current policy/validator a documented version and bind that version into future job agreements. Do not silently upgrade interpretation of already-funded policies.

## Highest-value next evidence

1. Record the actual hosted success and expiry-recovery flow, including explorer evidence and explicit trust boundaries.
2. Ask one independent developer to follow setup and integrate the client, with permission to report the result.
3. Interview both data buyers and suppliers about buyer-controlled acceptance. If suppliers will not accept it, test a separately specified verifier or dispute mechanism before expanding the marketplace.
4. Test willingness to pay for hosted receipts and monitoring. Keep proposed $29 workspace pricing labeled as a hypothesis until someone pays or commits.

The supplied general rubric also gives equal weight to quality, technical excellence, Monad integration, track fit, and innovation/impact. The strong actual lifecycle evidence helps technical and integration scores. External relevance and innovation remain limited by unvalidated demand and a crowded agent-payment category. Verify the final organizer rubric and all mandatory deliverables before submitting.

## Submission status observed by the build team

The supplied DevpostRice route redirected to closed submission pages, and no fields were saved. Prepared submission text and video preparation assets are not an accepted submission. Public video links and successful platform submission remain mandatory external completion gates.
