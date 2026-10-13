import { parseQuoteSnapshot } from '../src/quotes.ts';
import { validateResult, type Policy } from '../src/policy.ts';
/** Read-only live adapter. No GPU rental, reservation, or payment occurs here. */
export async function fetchLiveQuote(policy: Policy, endpoint = 'https://latch-agent-receipts.web.app/api/quotes', fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Live quote adapter returned HTTP ${response.status}. Preserve the original purchase for retry or expiry refund.`);
  const snapshot = parseQuoteSnapshot(await response.json());
  const quotes = [...snapshot.quotes].sort((a,b) => a.priceUsdPerHour - b.priceUsdPerHour);
  for (const quote of quotes) {
    const payload = { ...snapshot, quotes: [quote] };
    if (validateResult(payload, policy).accepted) return payload;
  }
  throw new Error('No live offer meets the acceptance policy. No illustrative quote was substituted.');
}
