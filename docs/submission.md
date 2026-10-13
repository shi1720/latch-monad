# Submission copy and handoff

## Project name

Latch

## Tagline

Pay for checked results.

## Short description

Latch connects buyer-declared acceptance policies, bounded native-MON escrow, and inspectable receipts for machine-checkable agent work on Monad. Its first application purchases structured GPU quote data and exposes passing checks, rejected results, settlement, and refund recovery.

## Problem and intended user

Developers building agents that purchase external data need more than a successful HTTP response and a payment receipt. Their applications must know whether the delivered output satisfies the task's declared constraints. Latch makes those constraints explicit and connects the accepted artifact to an economic record. The first reference job checks GPU quote region, maximum quoted price, and freshness; it does not purchase or verify physical GPU capacity.

## What we built

A reusable settlement contract, deterministic TypeScript policy checks, integration helpers, and a reference application. The buyer funds a bounded job, evaluates the delivered result offchain, and authorizes settlement. Rejected or expired work can follow the contract's recovery path. Pull credits require withdrawal before funds reach the recipient's wallet.

## Monad integration

The settlement lifecycle runs on Monad testnet using native MON. See **`public/deployment.json`** for the actual deployment address and transaction when available. The interface should link real receipts to the testnet explorer. Monad's fast EVM settlement suits repeated small jobs; no throughput benchmark or guaranteed transaction latency is claimed.

## Track

**Trust, Identity & AI Infrastructure.** The primary output is a reusable policy/settlement primitive for other applications. The GPU quote console is the reference integration rather than a standalone GPU exchange.

## Differentiation

Agent payments and agent escrow already exist. Latch focuses on declared acceptance checks for structured artifacts and on making the policy, delivered output, and economic outcome inspectable together. It does not claim to invent escrow or solve subjective evaluation.

## Trust and current limitations

The buyer is the verifier. Offchain checks can detect policy violations but do not prove source truth. The supplier must trust the buyer to release payment for valid work. Native testnet MON is the only implemented asset; stablecoin support, independent verification, x402 integration, and production audits are not claimed. Demonstration quote prices are illustrative and are not live provider offers. The code is an unaudited prototype, not a guarantee of production security.

## Team and AI disclosure

Shivam Gupta is project lead and product owner. The project uses substantial OpenAI Codex assistance for research, implementation, tests, documentation, and demo preparation. No specific human implementation contribution should be added unless Shivam actually performed it. The repository records build provenance and dependency attribution.

## Traction and next step

No external customer traction or developer adoption is claimed. Automated checks and testnet transactions are engineering evidence rather than users or revenue. The next milestone is two independently operated application integrations and 1,000 measured test jobs, followed by a willingness-to-pay experiment for hosted receipts and monitoring.

## Final links — fill from verified results

| Required item | Current source of truth |
| --- | --- |
| Public GitHub repository | Verify the actual published repository; planned slug is not publication evidence |
| Live product URL | Verify HTTPS hosting and a fresh browser session |
| Contract address and deployment transaction | `public/deployment.json`; pending if absent |
| Technical demo, maximum 3 minutes | Public video URL after recording/upload |
| Pitch video, maximum 2 minutes | Public video URL after recording/upload |
| Logo, PNG/JPEG/WEBP under 3 MB | Use the final exported logo and inspect file size |
| Judge access | Public browsing; an EVM wallet and testnet MON for writes unless the deployed app provides a separately explained flow |

## Submission checklist

- [ ] Confirm participation eligibility and account/team registration personally; do not infer eligibility from location or name.
- [ ] Confirm only one project and one primary track are entered.
- [ ] Check the live submission website's recorded deadline. Supplied deadline October 13, 2026, 11:59 PM ET corresponds to October 14, 2026, 9:29 AM IST.
- [ ] Public repository is readable while signed out, includes source, lockfile, MIT license, attribution, AI disclosure, and genuine build-window commits.
- [ ] Fresh setup with `npm ci`, tests, build, and documented deployment succeeds.
- [ ] Actual Monad deployment metadata and transaction receipts are present.
- [ ] Hosted product loads while signed out and distinguishes preview fixtures from real chain writes.
- [ ] Passing job settlement and rejected-job refund plus withdrawal have been demonstrated with real transactions.
- [ ] Technical video is public and no longer than 3:00; pitch is public and no longer than 2:00.
- [ ] Narration matches shipped behavior; no invented customers, volume, partnerships, security assurance, or human contributions.
- [ ] No keys, credentials, private customer data, or sensitive browser content appear in source or videos.
- [ ] Logo is a supported image format and below 3 MB.
- [ ] Form submitted before the website deadline; save the confirmation and revisit the recorded submission to verify all links.

Sponsor bounties should be selected only after meeting their actual published requirements. This release does not claim a bounty merely because it uses Monad or can support a future integration.
