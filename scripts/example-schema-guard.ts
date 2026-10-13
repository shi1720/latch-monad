import type { Hex } from 'viem';
import { createLatchClient, type LatchClientOptions } from '../sdk/client.ts';
import { validateResult, type Policy } from '../src/policy.ts';

/** A second integration: gate an already-reserved supplier response before your agent uses it. */
export async function guardSupplierResponse(options: LatchClientOptions, key: Hex, policy: Policy, response: unknown) {
  const latch = createLatchClient(options);
  const decision = validateResult(response, policy);
  if (!decision.accepted) {
    // No automatic sleep or fresh request: the caller schedules recovery using this same key.
    return { usable: false, decision, receipt: await latch.readReceipt(key), refundAfter: (await latch.readReceipt(key))?.deadline };
  }
  const settlement = await latch.complete({ key, policy, payload: response });
  return { usable: true, settlement, response };
}

/** Explicit recovery stage, called strictly after the original deadline. */
export async function recoverExpiredPurchase(options: LatchClientOptions, key: Hex) {
  const latch = createLatchClient(options);
  const refund = await latch.refundExpired(key);
  const withdrawal = await latch.withdraw();
  return { refund, withdrawal };
}
