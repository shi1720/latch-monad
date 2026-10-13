import type { Address, Hex } from 'viem';
import { createLatchClient, type LatchClientOptions } from '../sdk/client.ts';
import type { Policy } from '../src/policy.ts';

/** Integrating application supplies its own clients, wallet, and durable purchase ID. */
export async function purchaseQuotes(
  options: LatchClientOptions,
  savedPurchase: { requestId: Hex; provider: Address; amount: bigint; policy: Policy; deadline: bigint },
  supplierUrl: string,
) {
  const latch = createLatchClient(options);
  const reserved = await latch.open(savedPurchase);
  if (reserved.job.status === 'Refunded') return { status: 'Refunded', receipt: reserved.job };
  if (reserved.job.status === 'Accepted') return { status: 'Accepted', receipt: reserved.job };
  const response = await fetch(supplierUrl, { signal: AbortSignal.timeout(10000), headers: { 'X-Latch-Request-Id': savedPurchase.requestId } });
  if (!response.ok) throw new Error(`Supplier returned ${response.status}. Preserve this purchase and retry or refund after expiry.`);
  const result = await latch.complete({ key: reserved.key, policy: savedPurchase.policy, payload: await response.json() });
  // A failed policy check leaves the original escrow open; do not make a second purchase.
  return result;
}
