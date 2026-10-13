import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createQuoteSource } from './quotes.mjs';

export function createQuoteServer({ getQuotes = createQuoteSource(), now = Date.now, allowedOrigin = process.env.ALLOWED_ORIGIN || '*', requestsPerMinute = 300 } = {}) {
  let windowStart = now(), requests = 0;
  return http.createServer(async (request, response) => {
    const headers = {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '600',
    };
    const reply = (status, value, extraHeaders = {}) => { response.writeHead(status, { ...headers, ...extraHeaders }); response.end(JSON.stringify(value)); };
    try {
      if ((request.url || '').length > 256) return reply(414, { error: 'Request URL is too long.' });
      const url = new URL(request.url || '/', 'http://localhost');
      if (url.pathname === '/healthz' && request.method === 'GET') return reply(200, { ok: true });
      if (url.pathname !== '/api/quotes') return reply(404, { error: 'Not found.' });
      if (request.method === 'OPTIONS') { response.writeHead(204, headers); return response.end(); }
      if (request.method !== 'GET') return reply(405, { error: 'Use GET for quotes.' }, { Allow: 'GET, OPTIONS' });
      if ([...url.searchParams.keys()].some(key => key !== 'region') || url.searchParams.getAll('region').length > 1)
        return reply(400, { error: 'Only one optional region parameter is supported.' });
      const region = url.searchParams.get('region') || 'any';
      if (region !== 'any' && !/^[A-Z]{2}$/.test(region)) return reply(400, { error: 'Region must be any or a two-letter uppercase country code.' });
      if (now() - windowStart >= 60000) { windowStart = now(); requests = 0; }
      if (++requests > requestsPerMinute) return reply(429, { error: 'Quote service rate limit reached. Retry shortly.' }, { 'Retry-After': '60' });
      const result = await getQuotes();
      return reply(200, { ...result, quotes: region === 'any' ? result.quotes : result.quotes.filter(quote => quote.region === region), filter: { region } });
    } catch (error) {
      // Stale or illustrative prices are never substituted when the live source fails.
      return reply(error.status === 503 ? 503 : 502, { error: error.message || 'Quote source unavailable.', source: 'Vast.ai', retryable: true });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const server = createQuoteServer();
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.listen(port, '0.0.0.0', () => console.log(`Latch quote proxy listening on ${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
}
