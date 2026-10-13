export const UPSTREAM = 'https://console.vast.ai/api/v0/bundles/';
export const QUERY = Object.freeze({ gpu_name: { in: ['H100 SXM', 'H100 PCIE'] }, rentable: { eq: true }, rented: { eq: false }, verified: { eq: true }, limit: 100, type: 'ondemand' });
const SOURCE_URL = 'https://cloud.vast.ai/';

export class QuoteSourceError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

/** Normalize provider claims; do not expose host IPs, machine IDs, or arbitrary URLs. */
export function normalizeOffers(document, retrievedAt) {
  if (!document || !Array.isArray(document.offers) || document.offers.length > 1000)
    throw new QuoteSourceError('Quote source returned an invalid offer list.');
  if (!Number.isFinite(Date.parse(retrievedAt))) throw new TypeError('Invalid retrieval timestamp');
  const seen = new Set();
  const quotes = [];
  for (const offer of document.offers.slice(0, 100)) {
    if (!offer || !['H100 SXM', 'H100 PCIE'].includes(offer.gpu_name) || !Number.isSafeInteger(offer.id) || offer.id <= 0 || seen.has(offer.id)) continue;
    if (offer.rentable !== true || offer.rented !== false || !Number.isInteger(offer.num_gpus) || offer.num_gpus < 1 || offer.num_gpus > 1024 || !Number.isFinite(offer.dph_total) || offer.dph_total <= 0 || offer.dph_total > 1e7) continue;
    if (typeof offer.geolocation !== 'string' || offer.geolocation.length > 160) continue;
    const match = offer.geolocation.match(/,\s*([A-Z]{2})\s*$/);
    if (!match) continue; // Unknown geography must not silently become a target region.
    seen.add(offer.id);
    quotes.push({
      id: `vast-${offer.id}`, gpu: 'NVIDIA H100 80GB', gpuVariant: offer.gpu_name,
      region: match[1], location: offer.geolocation.trim(), numGpus: offer.num_gpus,
      totalPriceUsdPerHour: offer.dph_total,
      priceUsdPerHour: offer.dph_total / offer.num_gpus,
      observedAt: retrievedAt, sourceUrl: SOURCE_URL, sourceOfferId: String(offer.id),
      providerVerification: typeof offer.verification === 'string' ? offer.verification.slice(0, 40) : 'not supplied',
    });
  }
  quotes.sort((a, b) => a.priceUsdPerHour - b.priceUsdPerHour || a.id.localeCompare(b.id));
  return {
    source: 'Vast.ai', quoteKind: 'live-offer', retrievedAt,
    observedAtBasis: 'proxy-retrieval-time', sourceUrl: SOURCE_URL, quotes,
    provenance: {
      upstream: UPSTREAM, requestLimit: 100, upstreamObservationTimestampAvailable: false,
      priceBasis: 'dph_total / num_gpus; instance compute and configured storage divided by GPU count',
      exclusions: 'Availability, location and pricing are provider claims. Network usage and other usage-dependent charges may be additional. No GPU reservation or rental is made.',
      verificationFilter: 'Vast verified=true search filter; not independent verification by Latch',
      selectionBasis: 'At most 100 source-ranked search results, sorted locally by per-GPU price; not an exhaustive market or best-price guarantee',
      truncated: document.truncated === true,
    },
  };
}

async function boundedJSON(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new QuoteSourceError('Quote source response exceeded the size limit.');
  if (!response.body) throw new QuoteSourceError('Quote source returned an empty response.');
  const reader = response.body.getReader();
  let length = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw new QuoteSourceError('Quote source response exceeded the size limit.');
      chunks.push(Buffer.from(value));
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new QuoteSourceError('Quote source returned invalid JSON.'); }
}

/** Cache is per service instance; concurrent misses share one bounded upstream request. */
export function createQuoteSource({ fetchImpl = fetch, now = Date.now, ttlMs = 30000, timeoutMs = 8000, maxBytes = 2 * 1024 * 1024, apiKey = process.env.VAST_API_KEY } = {}) {
  let cache, inFlight, failedAt, lastFailure;
  async function fetchOffers() {
    try {
      const response = await fetchImpl(UPSTREAM, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify(QUERY),
      });
      if (!response.ok) throw new QuoteSourceError('Quote source is temporarily unavailable.', response.status === 429 ? 503 : 502);
      const document = await boundedJSON(response, maxBytes);
      const fetchedAt = now();
      cache = { value: normalizeOffers(document, new Date(fetchedAt).toISOString()), fetchedAt };
      failedAt = undefined;
      return cache.value;
    } catch (error) {
      failedAt = now();
      lastFailure = error instanceof QuoteSourceError ? error : new QuoteSourceError('Quote source request failed or timed out.', 503);
      throw lastFailure;
    }
  }
  return async function getQuotes() {
    if (cache && now() - cache.fetchedAt < ttlMs) return { ...cache.value, cache: { hit: true, ttlSeconds: ttlMs / 1000 } };
    if (failedAt !== undefined && now() - failedAt < 5000) throw lastFailure;
    const joined = Boolean(inFlight);
    if (!inFlight) inFlight = fetchOffers().finally(() => { inFlight = undefined; });
    const value = await inFlight;
    return { ...value, cache: { hit: joined, ttlSeconds: ttlMs / 1000 } };
  };
}
