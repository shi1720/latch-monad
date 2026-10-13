import test from 'node:test';
import assert from 'node:assert/strict';
import ganache from 'ganache';
import { createPublicClient, createWalletClient, custom, parseEther, keccak256, stringToHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { compile } from '../scripts/compile.mjs';
import { createLatchClient, LatchPendingTransactionError } from '../sdk/client.ts';
import { purchaseLiveQuote } from '../scripts/example-live-quote-agent.ts';
import { makeSample } from '../src/policy.ts';

test('SDK reuses committed requests, validates policy, rejects bad data, refunds and recovers from confirmation timeout', async () => {
  const compiled = await compile();
  const artifact = compiled['LatchEscrow.sol'].LatchEscrow;
  const provider = ganache.provider({ logging: { quiet: true }, chain: { chainId: 1337 }, wallet: { totalAccounts: 2 } });
  try {
    const transport = custom(provider);
    const publicClient = createPublicClient({ transport });
    const accounts = Object.values(provider.getInitialAccounts());
    const walletClient = createWalletClient({ transport, account: privateKeyToAccount(accounts[0].secretKey as `0x${string}`) });
    const seller = privateKeyToAccount(accounts[1].secretKey as `0x${string}`).address;
    const deployment = await walletClient.deployContract({ abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}` });
    const escrow = (await publicClient.waitForTransactionReceipt({ hash: deployment })).contractAddress!;
    const broadcasts: any[] = [];
    const client = createLatchClient({ walletClient, publicClient, escrow, abi: artifact.abi, onBroadcast: b => { broadcasts.push(b); } });
    const policy = { maxAgeSeconds: 120, maxPriceUsd: 3, region: 'us-east' };
    const input = { requestId: keccak256(stringToHex('sdk-persisted-request')), provider: seller, amount: parseEther('0.001'), policy, deadline: (await publicClient.getBlock()).timestamp + 100n };
    const opened = await client.open(input);
    assert.equal(opened.reused, false);
    assert.equal((await client.open(input)).reused, true);
    assert.equal(broadcasts.length, 1);
    await assert.rejects(client.open({ ...input, amount: parseEther('0.002') }), /different terms/);
    await assert.rejects(client.complete({ key: opened.key, policy: { ...policy, maxPriceUsd: 9 }, payload: makeSample('valid') }), /Policy differs/);
    const invalid = await client.complete({ key: opened.key, policy, payload: makeSample('malformed') });
    assert.equal(invalid.accepted, false);
    assert.equal((await client.readReceipt(opened.key))?.status, 'Open');
    await assert.rejects(client.refundExpired(opened.key), /not expired/);
    const payload = makeSample('valid');
    const completed = await client.complete({ key: opened.key, policy, payload });
    assert.equal(completed.job.status, 'Accepted');
    assert.equal((await client.complete({ key: opened.key, policy, payload })).alreadySettled, true);
    assert.equal(broadcasts.length, 2);
    const recovered = await purchaseLiveQuote({walletClient, publicClient, escrow, abi:artifact.abi}, input, {load:async()=>payload,save:async()=>{throw Error('Accepted recovery must not overwrite artifact')}});
    assert.deepEqual((recovered as any).payload,payload);
    await assert.rejects(purchaseLiveQuote({walletClient, publicClient, escrow, abi:artifact.abi},input,{load:async()=>null,save:async()=>{}}),/committed artifact is unavailable/);
    await assert.rejects(client.complete({ key: opened.key, policy, payload: { ...payload, source: 'different' } }), /different result/);

    // Force timeout AFTER real open broadcast; retry must find the same mined request.
    const timeoutReader = new Proxy(publicClient, { get(target, property) {
      if (property === 'waitForTransactionReceipt') return async () => { throw new Error('simulated RPC timeout'); };
      return Reflect.get(target, property);
    } });
    const timeoutClient = createLatchClient({ walletClient, publicClient: timeoutReader, escrow, abi: artifact.abi, onBroadcast: b => { broadcasts.push(b); } });
    const retryInput = { ...input, requestId: keccak256(stringToHex('sdk-retry-request')), deadline: (await publicClient.getBlock()).timestamp + 100n };
    await assert.rejects(timeoutClient.open(retryInput), e => e instanceof LatchPendingTransactionError && !!e.transaction.hash);
    const resumed = await client.open(retryInput);
    assert.equal(resumed.reused, true);
    assert.equal(broadcasts.length, 3);
    await provider.request({ method: 'evm_setTime', params: [Number(retryInput.deadline + 1n) * 1000] });
    await provider.request({ method: 'evm_mine', params: [] });
    assert.equal((await client.refundExpired(resumed.key)).job.status, 'Refunded');
    assert.equal((await client.refundExpired(resumed.key)).alreadySettled, true);
    assert.equal((await client.open(retryInput)).job.status, 'Refunded');
    assert.equal((await client.withdraw()).amount, input.amount);
    assert.equal((await client.withdraw()).amount, 0n);
    assert.equal(broadcasts.length, 5);
  } finally { await provider.disconnect(); }
});
