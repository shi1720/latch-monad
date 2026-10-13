# Rubric self-review

This is a **provisional self-assessment**, not an independent judging result. Scores reflect the intended submission and must be revisited against actual deployed evidence. They are not a predicted prize outcome. A missing live deployment or video is a mandatory-requirement failure regardless of score.

| Criterion | Weight | Provisional score / 10 | Evidence and remaining weakness |
| --- | ---: | ---: | --- |
| Technical execution | 20% | 7 | Deterministic policy logic and native-MON escrow have a narrow reviewable scope. Buyer verification is an explicit trust dependency. Confirm all tests, deployment, recovery, and withdrawal paths before raising score. |
| Design and craft | 20% | 8 | The reference flow exposes policy outcomes and economic state. Verify keyboard access, mobile layout, errors, network changes, and fresh-session usability against the actual UI. |
| Originality and track insight | 15% | 6 | Acceptance policies plus linked receipts are a specific wedge. Generic agent escrow is already crowded; no “first ever” claims are justified. |
| Founder and market readiness | 25% | 6 | Named developer segment, narrow first job, competitor analysis, and explicit business hypotheses. No customer interviews or willingness-to-pay evidence yet. |
| Traction and path forward | 20% | 4 | Reproducible tests and testnet operations can demonstrate engineering progress. No external adopters, revenue, or usage evidence. Targets are not traction. |

Weighted provisional score: **62 / 100**. The largest commercial weakness is absence of buyer and supplier validation, especially supplier willingness to accept buyer-controlled release. The largest technical honesty risk is describing offchain validation as onchain proof.

## Highest-value improvements

1. Complete public deployment and collect real create, settle, refund, and withdraw receipts. Confirm the final metadata and hosted app match.
2. Exercise adversarial behavior: unauthorized settlement, expired jobs, repeated settlement/refund attempts, withdrawals, and conservation of contract balances. Fix failures before making cosmetic changes.
3. Record the technical demo from the actual app, including a failure and recovery. Keep blockchain waits honest.
4. Have a developer unfamiliar with the project follow setup and integrate the SDK. Record actual feedback with permission. If this does not occur, leave adoption unclaimed.
5. Ask real prospective buyers and suppliers about acceptance disputes after obtaining communication authorization. Revise the commercial hypothesis based on evidence rather than inventing validation.

## Release gates

### Functional

- [ ] Fresh installation and production build succeed.
- [ ] Policy checks reject relevant region, price, and freshness violations.
- [ ] Contract tests cover authorization, transitions, accounting, deadline recovery, and withdrawal behavior appropriate to implemented functions.
- [ ] Failed RPC calls and rejected wallet prompts cannot display false success.
- [ ] Real testnet job completes; refunded credit can be withdrawn.

### Evidence and usability

- [ ] Public hosted app, public source, real deployment metadata, and explorer links work.
- [ ] Preview and fixture data are labeled; UI does not imply a real GPU marketplace.
- [ ] Mobile and desktop flow are visually verified.
- [ ] Videos stay inside their limits and show actual product operation.
- [ ] Judge access instructions match the authentication actually implemented.

### Claims

- [ ] Buyer verifier, native MON, unaudited status, and supplier fairness limits are visible.
- [ ] No offchain result is described as independently verified onchain truth.
- [ ] Tests are not called customers; simulated volume is not revenue.
- [ ] Proposed pricing and future integrations are labeled hypotheses/plans.
- [ ] Credit and AI disclosure accurately describe the work.

## General hackathon rubric cross-check

The supplied general terms also describe five equally weighted categories: quality/completeness, technical excellence, Monad integration, track fit/problem relevance, and innovation/impact. Latch's strongest intended evidence is a complete economic lifecycle and reusable developer interface. Its weak evidence remains external adoption and independently proven real-world truth. Track-specific weighting is used above because it is more operationally useful; verify the final judging rules on the submission website.
