import type { Address, Hex } from 'viem';
import { createLatchClient, type LatchClientOptions } from '../sdk/client.ts';
import { fetchLiveQuote } from '../sdk/quotes.ts';
import { canonicalHash, type Policy } from '../src/policy.ts';

type ArtifactStore = { load: (requestId: Hex) => Promise<unknown | null>; save: (requestId: Hex, payload: unknown) => Promise<void> };
/** Persist purchase, artifact and broadcast hashes in your application.
 * Reserve before requesting data. Failures keep the SAME job recoverable.
 * The payment goes to the agreed adapter provider, not to Vast.ai for GPU capacity.
 */
export async function purchaseLiveQuote(options: LatchClientOptions,
  purchase: { requestId: Hex; provider: Address; amount: bigint; policy: Policy; deadline: bigint },
  artifacts: ArtifactStore,
  endpoint = 'https://latch-agent-receipts.web.app/api/quotes') {
  const latch = createLatchClient(options);
  const reserved = await latch.open(purchase);
  if (reserved.job.status === 'Refunded') return reserved;
  if (reserved.job.status === 'Accepted') {
    const payload = await artifacts.load(purchase.requestId);
    if (!payload || await canonicalHash(payload) !== reserved.job.resultHash)
      throw new Error('Accepted purchase found, but its committed artifact is unavailable. Restore the saved artifact; do not pay again.');
    return { ...reserved, payload };
  }
  // Save the exact artifact BEFORE an acceptance can broadcast. Reuse it on retry.
  const payload = await artifacts.load(purchase.requestId) ?? await fetchLiveQuote(purchase.policy, endpoint);
  await artifacts.save(purchase.requestId, payload);
  return { ...await latch.complete({ key: reserved.key, policy: purchase.policy, payload }), payload };
}
