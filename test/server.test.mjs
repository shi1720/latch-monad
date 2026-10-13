import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createQuoteSource, normalizeOffers, UPSTREAM, QUERY } from '../server/quotes.mjs';
import { createQuoteServer } from '../server/index.mjs';

const stamp = '2026-10-13T05:00:00.000Z';
const offer = (patch = {}) => ({ id: 123, gpu_name: 'H100 SXM', num_gpus: 4, dph_total: 8.4, geolocation: 'New Jersey, US', rentable: true, rented: false, verification: 'verified', ...patch });
const response = (offers = [offer()]) => new Response(JSON.stringify({ offers, truncated: false }), { headers: { 'Content-Type': 'application/json' } });

test('normalizes real per-instance price into per-GPU quote with explicit retrieval provenance', () => {
  const result = normalizeOffers({ offers: [offer()], truncated: true }, stamp);
  assert.equal(result.source, 'Vast.ai');
  assert.equal(result.observedAtBasis, 'proxy-retrieval-time');
  assert.equal(result.provenance.upstreamObservationTimestampAvailable, false);
  assert.equal(result.provenance.truncated, true);
  assert.deepEqual(result.quotes[0], {
    id: 'vast-123', gpu: 'NVIDIA H100 80GB', gpuVariant: 'H100 SXM', region: 'US',
    location: 'New Jersey, US', numGpus: 4, totalPriceUsdPerHour: 8.4, priceUsdPerHour: 2.1,
    observedAt: stamp, sourceUrl: 'https://cloud.vast.ai/', sourceOfferId: '123', providerVerification: 'verified',
  });
});

test('drops unsafe or non-H100 shapes, rejects invalid source documents, deduplicates and sorts', () => {
  const invalid = [
    null, offer({ id: '123' }), offer({ id: -1 }), offer({ gpu_name: 'A100 SXM' }),
    offer({ gpu_name: 'H100 NVL' }), offer({ num_gpus: 0 }), offer({ num_gpus: 1.5 }),
    offer({ dph_total: NaN }), offer({ dph_total: -1 }), offer({ dph_total: '2.3' }),
    offer({ geolocation: 'unknown' }), offer({ rentable: false }), offer({ rented: true }),
  ];
  assert.equal(normalizeOffers({ offers: invalid }, stamp).quotes.length, 0);
  const result = normalizeOffers({ offers: [offer(), offer(), offer({ id: 124, dph_total: 4, gpu_name: 'H100 PCIE', geolocation: 'Berlin, DE' })] }, stamp);
  assert.deepEqual(result.quotes.map(q => q.id), ['vast-124', 'vast-123']);
  for (const document of [null, {}, { success: false }, { offers: {} }, { offers: Array(1001).fill(offer()) }]) assert.throws(() => normalizeOffers(document, stamp), /invalid offer list/);
  assert.throws(() => normalizeOffers({ offers: [] }, 'bad'), /Invalid retrieval timestamp/);
});

test('bounds output to 100 and strips sensitive/untrusted provider metadata', () => {
  const result = normalizeOffers({ offers: Array.from({ length: 150 }, (_, i) => offer({ id: i + 1, public_ipaddr: '192.0.2.1', webpage: 'javascript:evil', secret: 'never-forward' })) }, stamp);
  assert.equal(result.quotes.length, 100);
  assert.equal(JSON.stringify(result).includes('192.0.2.1'), false);
  assert.equal(JSON.stringify(result).includes('javascript:'), false);
  assert.equal(JSON.stringify(result).includes('never-forward'), false);
});

test('uses a fixed upstream query, deduplicates concurrent misses and preserves cached retrieval time', async () => {
  let calls = 0, time = Date.parse(stamp);
  const source = createQuoteSource({ now: () => time, apiKey: 'test-only-key', fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, UPSTREAM);
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), QUERY);
    assert.equal(options.headers.Authorization, 'Bearer test-only-key');
    await new Promise(resolve => setTimeout(resolve, 5));
    return response();
  } });
  const [a, b] = await Promise.all([source(), source()]);
  assert.equal(calls, 1);
  assert.equal(a.cache.hit, false);
  assert.equal(b.cache.hit, true);
  time += 29000;
  const cached = await source();
  assert.equal(cached.cache.hit, true);
  assert.equal(cached.retrievedAt, stamp);
  assert.equal(calls, 1);
  time += 1001;
  assert.equal((await source()).cache.hit, false);
  assert.equal(calls, 2);
});

test('times out without fallback and backs off failed upstream requests', async () => {
  let calls = 0;
  const source = createQuoteSource({ timeoutMs: 10, fetchImpl: (_url, { signal }) => {
    calls++;
    return new Promise((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('signal did not fire')), 100);
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
    });
  } });
  await assert.rejects(source(), /failed or timed out/);
  await assert.rejects(source(), /failed or timed out/);
  assert.equal(calls, 1);
});

test('rejects bad HTTP responses, oversized bodies, malformed JSON and source error documents', async () => {
  for (const makeResponse of [
    () => new Response('private-error-text', { status: 401 }),
    () => new Response('x'.repeat(500), { headers: { 'content-length': '500' } }),
    () => new Response('x'.repeat(500)),
    () => new Response('{not-json'),
    () => new Response(JSON.stringify({ success: false, msg: 'error' })),
  ]) {
    const source = createQuoteSource({ maxBytes: 400, fetchImpl: async () => makeResponse() });
    await assert.rejects(source(), error => { assert.equal(error.message.includes('private-error-text'), false); return true; });
  }
});

test('expired cache is not substituted on upstream failure', async () => {
  let time = Date.parse(stamp), calls = 0;
  const source = createQuoteSource({ now: () => time, fetchImpl: async () => ++calls === 1 ? response() : new Response('', { status: 503 }) });
  assert.equal((await source()).quotes.length, 1);
  time += 30001;
  await assert.rejects(source(), /unavailable/);
  assert.equal(calls, 2);
});

test('HTTP API filters only locally, rejects query abuse, supports CORS and applies a bounded request budget', async () => {
  let sourceCalls = 0;
  const sourceResult = normalizeOffers({ offers: [offer(), offer({ id: 456, geolocation: 'Berlin, DE' })] }, stamp);
  const server = createQuoteServer({ requestsPerMinute: 3, getQuotes: async () => { sourceCalls++; return sourceResult; } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
    const all = await fetch(`${base}/api/quotes`);
    assert.equal(all.headers.get('access-control-allow-origin'), '*');
    assert.equal((await all.json()).quotes.length, 2);
    const germany = await (await fetch(`${base}/api/quotes?region=DE`)).json();
    assert.equal(germany.quotes.length, 1);
    assert.equal(germany.quotes[0].region, 'DE');
    assert.equal((await fetch(`${base}/api/quotes?region=any`)).status, 200);
    assert.equal((await fetch(`${base}/api/quotes?url=https://evil.invalid`)).status, 400);
    assert.equal((await fetch(`${base}/api/quotes?region=US&region=DE`)).status, 400);
    assert.equal((await fetch(`${base}/api/quotes?region=us-east`)).status, 400);
    assert.equal((await fetch(`${base}/api/quotes`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${base}/api/quotes`, { method: 'OPTIONS' })).status, 204);
    assert.equal((await fetch(`${base}/unknown`)).status, 404);
    const limited = await fetch(`${base}/api/quotes`);
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '60');
    assert.equal(sourceCalls, 3);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('HTTP source failure returns explicit failure without illustrative prices', async () => {
  const server = createQuoteServer({ getQuotes: async () => { throw Object.assign(new Error('Quote source request failed or timed out.'), { status: 503 }); } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const result = await fetch(`http://127.0.0.1:${server.address().port}/api/quotes`);
    assert.equal(result.status, 503);
    const body = await result.json();
    assert.equal(body.retryable, true);
    assert.equal('quotes' in body, false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
