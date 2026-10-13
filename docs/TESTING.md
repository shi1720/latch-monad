# Verification guide

## Core and browser suites

```sh
npm ci
npm run compile
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run test:hosted
```

`npm test` runs contract, policy, and SDK integration tests against isolated Ganache instances. `test:browser` runs the Chromium UI regressions locally. `test:hosted` runs the same suite against the deployed Firebase product. Mocked recovery tests block external RPC writes and assert that existing accepted/refunded jobs do not submit transactions.

Browser tests cover sample scenarios, malformed JSON, wrong model/region/price/age, invalid policy, input invalidation, receipt persistence/deduplication/export/copy, malformed stored records, receipt details, interrupted-input recovery, and responsive views at 390, 768, and 1440 pixels.

## Real network trials

`public/live-evidence.json` contains real Monad testnet reserve/accept/provider-withdraw and reserve/refund/buyer-withdraw transactions plus replay rejection assertions. A separate hosted browser recording captures actual payment and refund recovery. These trials are automated implementation evidence, not customer traction.

The live test script requires the ignored test deployer key generated during deployment. It funds a separate test buyer and performs real testnet writes:

```sh
node scripts/live-test.mjs
```

Never point this script at mainnet or supply a valuable wallet. Testnet faucets are rate limited, and public RPC availability is outside the app's control.

## Security and release limits

Tests are not an independent audit. The buyer authorizes settlement and suppliers must trust its acceptance decision. Quote truth and availability are not independently authenticated. A policy hash binds policy bytes, not a JavaScript implementation version; integrations must agree on the validator release or Git commit out of band. Stablecoin support and independent verification remain future work.

Ganache has legacy development dependencies with known npm advisories. It is confined to local tests and is not shipped in the static app bundle.
