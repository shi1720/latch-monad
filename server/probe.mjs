import { createQuoteSource, QUERY } from './quotes.mjs';

const result = await createQuoteSource()();
console.log(JSON.stringify({
  query: QUERY, source: result.source, retrievedAt: result.retrievedAt,
  quoteCount: result.quotes.length,
  countries: [...new Set(result.quotes.map(quote => quote.region))],
  variants: [...new Set(result.quotes.map(quote => quote.gpuVariant))],
  lowestReturnedPriceUsdPerGpuHour: result.quotes[0]?.priceUsdPerHour ?? null,
  provenance: result.provenance,
}, null, 2));
