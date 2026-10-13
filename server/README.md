# Live H100 quote proxy

Dependency-free Node 22 service. It reads public Vast.ai marketplace offers and normalizes them into Latch's supplier JSON shape. It never rents a GPU, places an order, signs a transaction, or receives a wallet key.

```sh
node server/index.mjs
curl http://localhost:8080/api/quotes
curl 'http://localhost:8080/api/quotes?region=US'
node --test test/server.test.mjs
```

Build the container with **server as its build context**: `docker build -t latch-quotes server`. Cloud Run supplies `PORT`; `/healthz` is a simple process health check, not an upstream health claim. Set `ALLOWED_ORIGIN` to your frontend origin to restrict browser CORS, or leave `*` for this public, credential-free read endpoint.

Anonymous marketplace search was observed working during development. This is not an uptime or continued-access guarantee; the provider may require authentication or change its API. Optional `VAST_API_KEY` is read only by the server and sent as a Bearer token. Configure it using a runtime secret, never in frontend code, a Docker build argument, or Git. No key is required for the observed public-access path.

## Endpoint and provenance

`GET /api/quotes` returns all normalized countries; `?region=US` filters the cached results locally. Country codes come from the final uppercase two-letter suffix in Vast's `geolocation` field. No geographic inference is made when that suffix is missing. Only the optional `region` parameter is allowed. User input cannot change the upstream URL, request body, count, or price filters.

The fixed upstream POST searches `H100 SXM` and `H100 PCIE`, rentable and not rented, with Vast's `verified=true` search filter, on-demand type and limit 100. Multi-GPU instance prices are retained as `totalPriceUsdPerHour`; `priceUsdPerHour` is exactly `dph_total / num_gpus`. This is a comparison unit, not a promise that one GPU can be rented separately. The price includes the source's instance compute/configured storage estimate; bandwidth and other usage-dependent charges can be additional. Both 80GB H100 variants normalize to `NVIDIA H100 80GB`, with the source variant preserved separately. No capacity is reserved.

Every quote's `observedAt` equals **proxy retrieval time**, not a provider-signed observation time. `observedAtBasis`, `retrievedAt`, and `provenance.upstreamObservationTimestampAvailable=false` make that distinction machine-readable. Cache hits preserve the original timestamp. Source location, availability, verification status and prices remain provider claims; Latch does not independently verify them. Source URLs link to the public marketplace; `sourceOfferId` preserves the listing ID for manual lookup. No unsupported offer deep-link is claimed. At most 100 source-ranked results are fetched and sorted locally by per-GPU price: this is not an exhaustive market search or best-price guarantee.

Successful responses are cached for 30 seconds per service instance. Concurrent misses share one upstream request. Failed upstream calls have a five-second backoff. A service instance permits 300 quote requests per minute; this is a small shared abuse budget, not a per-user quota. Horizontal scaling creates separate caches/budgets; configure Cloud Run maximum instances and a platform rate limiter for a wider launch.

Upstream requests time out after eight seconds, follow no redirects and read at most 2 MiB. Output contains at most 100 offers and excludes host IPs and arbitrary provider URLs. Invalid rows are omitted. Invalid source documents, HTTP failures, and timeouts return HTTP 502/503 with an explicit error. Expired cache and sample prices are **never** substituted for a failed live request. An empty list means the source returned no rows passing normalization; no sample data is inserted.

This proxy delivers data for buyer validation. It does not turn a JSON policy check into proof that a provider's claims are true, and it does not charge the marketplace provider through Monad. The testnet escrow demonstrates a separate buyer-authorized payment primitive.

Run `node server/probe.mjs` for an explicit live upstream probe. It fetches public quotes only; it creates no blockchain transaction or GPU rental. The output prints counts, country codes, variants and provenance, with no credentials or provider IP fields.
