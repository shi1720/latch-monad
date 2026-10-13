Open https://latch-agent-receipts.web.app in a current browser. No password or paid API key is required.

1. Click Fetch live quotes. The app calls its live Vast.ai adapter. Check the source, retrieval time, location, GPU count, per-GPU price, and full-machine hourly price. Filter by country or price. If no offer matches, increase the display ceiling or show all retrieved offers. An outage displays a retryable error, never a fabricated quote.
2. Click Use this quote. Inspect its actual JSON. Set an acceptance country, price ceiling, and maximum retrieval age, then Run acceptance checks. Any country allows returned country codes; an explicit country must match. Display filters and acceptance policy are separate. Listings can change or disappear.
3. Connect an EVM wallet on Monad testnet, or use the browser-generated test wallet if no extension exists. The app requests free testnet MON if needed. Faucet limits are external. Keep this browser tab open to retain its session key. Never send real assets.
4. Click Reserve & settle on Monad. Inspect the reserve and acceptance confirmations. The 0.001 MON reference fee credits the Latch adapter provider, not Vast.ai. No GPU is rented or reserved.
5. Under Sandbox fixtures choose Stale result, run checks, then Keep payment protected. This explicitly synthetic safety test reserves funds, waits for expiry, refunds, and withdraws the buyer credit. Allow about 20 to 35 seconds. Network fees are not refunded. Malformed payload tests schema rejection.
6. Open Receipts and Inspect receipt. Check full commitments, source artifact, participants, transaction trail, and explorer links. Export JSON. Accepted receipts mean provider credit, not completed provider withdrawal. Rejected result digests remain offchain.
7. Change a policy or JSON input and verify the previous verdict is cleared. Reload during a pending purchase and reconnect the same wallet to recover the original request. Do not clear storage during recovery.

Contract: 0xcfeb00b37333b3f4397eed2790e2869a40ffb871. Chain ID: 10143.

The buyer validates and authorizes acceptance; the contract enforces payment authority and expiry. It is not a truth oracle. Retrieval freshness does not prove provider update time or GPU availability. Additional provider usage charges may apply. This is an unaudited testnet developer release.
