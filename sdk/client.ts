import { encodeAbiParameters, keccak256, type Address, type Hex } from 'viem';
import { canonicalHash, validateResult, type Policy } from '../src/policy.ts';

export type LatchJob = {
  key: Hex; buyer: Address; provider: Address; amount: bigint; policyHash: Hex;
  resultHash: Hex; deadline: bigint; status: 'Open' | 'Accepted' | 'Refunded';
};
export type Broadcast = { operation: 'open' | 'accept' | 'refund' | 'withdraw'; key?: Hex; hash: Hex };
export type LatchClientOptions = {
  // Clients are supplied by the application: the SDK never generates or stores keys.
  walletClient: any; publicClient: any; escrow: Address; abi: readonly unknown[];
  receiptTimeoutMs?: number;
  /** Persist hashes here BEFORE receipt polling. A callback failure does not undo a broadcast. */
  onBroadcast?: (transaction: Broadcast) => void | Promise<void>;
};
export class LatchPendingTransactionError extends Error {
  constructor(public readonly transaction: Broadcast, public readonly cause: unknown) {
    super(`Transaction broadcast; confirmation unavailable. Reconcile ${transaction.hash} and the same receipt key before retrying.`);
    this.name = 'LatchPendingTransactionError';
  }
}

/** Native-currency escrow client. Acceptance proves buyer approval, not supplier truth. */
export function createLatchClient(options: LatchClientOptions) {
  const { walletClient: wallet, publicClient: reader, escrow, abi } = options;
  const active = new Set<string>();
  async function locked<T>(id: string, operation: () => Promise<T>): Promise<T> {
    if (active.has(id)) throw new Error('An operation for this receipt is already in progress.');
    active.add(id);
    try { return await operation(); } finally { active.delete(id); }
  }
  async function identity() {
    const [walletChain, readChain] = await Promise.all([wallet.getChainId(), reader.getChainId()]);
    if (walletChain !== readChain) throw new Error('Wallet and public client networks differ.');
    const configured = wallet.account;
    const buyer = (typeof configured === 'string' ? configured : configured?.address) ?? (await wallet.getAddresses())[0];
    if (!buyer) throw new Error('Connect a buyer account first.');
    return { buyer: buyer as Address, chainId: readChain as number };
  }
  async function rawJob(key: Hex) {
    return await reader.readContract({ address: escrow, abi, functionName: 'jobs', args: [key] }) as readonly [Address, Address, bigint, Hex, Hex, bigint, number];
  }
  async function readReceipt(key: Hex): Promise<LatchJob | null> {
    const j = await rawJob(key);
    if (Number(j[6]) === 0) return null;
    const status = (['', 'Open', 'Accepted', 'Refunded'] as const)[Number(j[6])];
    if (!status) throw new Error('Unknown escrow status.');
    return { key, buyer: j[0], provider: j[1], amount: j[2], policyHash: j[3], resultHash: j[4], deadline: j[5], status };
  }
  async function ownedJob(key: Hex, buyer: Address) {
    const job = await readReceipt(key);
    if (!job) throw new Error('Receipt does not exist.');
    if (job.buyer.toLowerCase() !== buyer.toLowerCase()) throw new Error('Connected account is not this receipt’s buyer.');
    return job;
  }
  async function send(operation: Broadcast['operation'], args: unknown[], buyer: Address, key?: Hex, value?: bigint) {
    // Recheck identity directly before submission, including after asynchronous validation.
    const current = await identity();
    if (current.buyer.toLowerCase() !== buyer.toLowerCase()) throw new Error('Buyer account changed; retry with the original account.');
    const { request } = await reader.simulateContract({ address: escrow, abi, functionName: operation, args, account: buyer, ...(value === undefined ? {} : { value }) });
    const hash = await wallet.writeContract({ ...request, account: wallet.account ?? buyer });
    const transaction: Broadcast = { operation, key, hash };
    try {
      await options.onBroadcast?.(transaction);
      const receipt = await reader.waitForTransactionReceipt({ hash, timeout: options.receiptTimeoutMs ?? 90000 });
      if (receipt.status !== 'success') throw new Error(`Escrow transaction reverted: ${hash}`);
      return hash as Hex;
    } catch (cause) {
      // A reverted receipt is final. Other failures may have happened after successful mining.
      if (cause instanceof Error && cause.message.startsWith('Escrow transaction reverted:')) throw cause;
      throw new LatchPendingTransactionError(transaction, cause);
    }
  }

  return {
    readReceipt,
    /** Caller MUST durably persist requestId before the first call and reuse it on retries. */
    async open(input: { requestId: Hex; provider: Address; amount: bigint; policy: Policy; deadline: bigint }) {
      const { buyer } = await identity();
      const key = keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [buyer, input.requestId]));
      return locked(key, async () => {
        const policyHash = await canonicalHash(input.policy);
        const existing = await readReceipt(key);
        if (existing) {
          if (existing.provider.toLowerCase() !== input.provider.toLowerCase() || existing.amount !== input.amount || existing.policyHash !== policyHash || existing.deadline !== input.deadline)
            throw new Error('Request ID already exists with different terms. Never reuse an ID for a different purchase.');
          return { key, requestId: input.requestId, policyHash, job: existing, reused: true, transactionHash: undefined };
        }
        const transactionHash = await send('open', [input.requestId, input.provider, policyHash, input.deadline], buyer, key, input.amount);
        return { key, requestId: input.requestId, policyHash, job: (await readReceipt(key))!, reused: false, transactionHash };
      });
    },
    /** Invalid output remains Open: buyer may call refundExpired after its deadline. */
    async complete(input: { key: Hex; policy: Policy; payload: unknown }) {
      return locked(input.key, async () => {
        const { buyer } = await identity();
        const job = await ownedJob(input.key, buyer);
        if (await canonicalHash(input.policy) !== job.policyHash) throw new Error('Policy differs from the onchain commitment.');
        const resultHash = await canonicalHash(input.payload);
        if (job.status === 'Accepted') {
          if (job.resultHash !== resultHash) throw new Error('Receipt already accepted a different result.');
          return { accepted: true, alreadySettled: true, job, resultHash, transactionHash: undefined };
        }
        if (job.status !== 'Open') throw new Error('Receipt has already been refunded.');
        const checked = validateResult(input.payload, input.policy);
        if (!checked.accepted) return { ...checked, alreadySettled: false, job, resultHash, transactionHash: undefined };
        if ((await reader.getBlock()).timestamp > job.deadline) throw new Error('Acceptance deadline passed. Call refundExpired with this receipt key.');
        const transactionHash = await send('accept', [input.key, resultHash], buyer, input.key);
        return { ...checked, alreadySettled: false, job: (await readReceipt(input.key))!, resultHash, transactionHash };
      });
    },
    async refundExpired(key: Hex) {
      return locked(key, async () => {
        const { buyer } = await identity();
        const job = await ownedJob(key, buyer);
        if (job.status === 'Refunded') return { job, alreadySettled: true, transactionHash: undefined };
        if (job.status !== 'Open') throw new Error('Accepted receipts cannot be refunded.');
        if ((await reader.getBlock()).timestamp <= job.deadline) throw new Error('Receipt has not expired. Refund is allowed strictly after its deadline.');
        const transactionHash = await send('refund', [key], buyer, key);
        return { job: (await readReceipt(key))!, alreadySettled: false, transactionHash };
      });
    },
    /** Withdraws ALL connected-account credits, not a single purchase’s allocation. */
    async withdraw() {
      return locked('withdraw', async () => {
        const { buyer } = await identity();
        const amount = await reader.readContract({ address: escrow, abi, functionName: 'credits', args: [buyer] }) as bigint;
        if (amount === 0n) return { amount, transactionHash: undefined };
        return { amount, transactionHash: await send('withdraw', [], buyer) };
      });
    },
  };
}
