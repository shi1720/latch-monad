import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import ganache from 'ganache';
import { createPublicClient, createWalletClient, custom, keccak256, stringToHex, encodeAbiParameters, encodeFunctionData, decodeErrorResult, toHex, parseEther, zeroAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { compile } from '../scripts/compile.mjs';

const h = text => keccak256(stringToHex(text));
const value = parseEther('0.01');
let provider, publicClient, wallets, escrow, abi, receiverArtifact;
let sequence = 0;
const receiverSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface IEscrow { function withdraw() external; }
contract Receiver {
  IEscrow public escrow;
  bool public rejectPayment;
  bool public reentryBlocked;
  constructor(address target) { escrow = IEscrow(target); }
  function setReject(bool value) external { rejectPayment = value; }
  function claim() external { escrow.withdraw(); }
  receive() external payable {
    require(!rejectPayment, "reject");
    (bool ok,) = address(escrow).call(abi.encodeWithSignature("withdraw()"));
    require(!ok, "reentry succeeded");
    reentryBlocked = true;
  }
}`;

before(async () => {
  const compiled = await compile({ 'Receiver.sol': { content: receiverSource } });
  const artifact = compiled['LatchEscrow.sol'].LatchEscrow;
  receiverArtifact = compiled['Receiver.sol'].Receiver;
  abi = artifact.abi;
  provider = ganache.provider({ logging: { quiet: true }, wallet: { totalAccounts: 4 }, chain: { hardfork: 'shanghai', chainId: 1337 } });
  const transport = custom(provider);
  publicClient = createPublicClient({ transport });
  wallets = Object.values(provider.getInitialAccounts()).map(a => createWalletClient({ account: privateKeyToAccount(a.secretKey), transport }));
  const hash = await wallets[0].deployContract({ abi, bytecode: `0x${artifact.evm.bytecode.object}` });
  escrow = (await publicClient.waitForTransactionReceipt({ hash })).contractAddress;
});
after(async () => { await provider?.disconnect(); });

const read = (functionName, args = []) => publicClient.readContract({ address: escrow, abi, functionName, args });
async function tx(wallet, functionName, args = [], payment) {
  const { request } = await publicClient.simulateContract({ address: escrow, abi, functionName, args, account: wallet.account, ...(payment === undefined ? {} : { value: payment }) });
  const hash = await wallet.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, 'success');
  return receipt;
}
async function rejects(wallet, functionName, args, error, payment) {
  await assert.rejects(provider.request({ method: 'eth_call', params: [{ to: escrow, from: wallet.account.address, data: encodeFunctionData({ abi, functionName, args }), ...(payment === undefined ? {} : { value: toHex(payment) }) }, 'latest'] }), e => {
    assert.equal(decodeErrorResult({ abi, data: e.data }).errorName, error);
    return true;
  });
}
async function open({ buyer = wallets[0], seller = wallets[1].account.address, duration = 3600n } = {}) {
  const id = h(`request-${++sequence}`);
  const policy = h('policy-v1');
  const deadline = (await publicClient.getBlock()).timestamp + duration;
  const key = await read('receiptKey', [buyer.account.address, id]);
  await tx(buyer, 'open', [id, seller, policy, deadline], value);
  return { id, key, deadline, policy, buyer, seller };
}
async function advanceTo(timestamp) {
  await provider.request({ method: 'evm_setTime', params: [Number(timestamp) * 1000] });
  await provider.request({ method: 'evm_mine', params: [] });
  assert.equal((await publicClient.getBlock()).timestamp, timestamp);
}

test('escrow records committed terms; key is scoped ABI-encoded buyer/request', async () => {
  const job = await open();
  assert.equal(job.key, keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [job.buyer.account.address, job.id])));
  const stored = await read('jobs', [job.key]);
  assert.equal(stored[0].toLowerCase(), job.buyer.account.address.toLowerCase());
  assert.equal(stored[1].toLowerCase(), job.seller.toLowerCase());
  assert.equal(stored[2], value);
  assert.equal(stored[3], job.policy);
  assert.equal(stored[5], job.deadline);
  assert.equal(stored[6], 1);
});

test('validation rejects empty deposit, addresses, commitments and deadlines', async () => {
  const now = (await publicClient.getBlock()).timestamp;
  const args = [h('validation'), wallets[1].account.address, h('policy'), now + 1000n];
  await rejects(wallets[0], 'open', args, 'InvalidAmount', 0n);
  await rejects(wallets[0], 'open', [args[0], zeroAddress, args[2], args[3]], 'InvalidProvider', value);
  await rejects(wallets[0], 'open', [args[0], escrow, args[2], args[3]], 'InvalidProvider', value);
  await rejects(wallets[0], 'open', [h('validation'), args[1], `0x${'0'.repeat(64)}`, args[3]], 'InvalidCommitment', value);
  await rejects(wallets[0], 'open', [`0x${'0'.repeat(64)}`, args[1], args[2], args[3]], 'InvalidCommitment', value);
  await rejects(wallets[0], 'open', [args[0], args[1], args[2], now], 'InvalidDeadline', value);
  await rejects(wallets[0], 'open', [args[0], args[1], args[2], now + 604801n], 'InvalidDeadline', value);
});

test('duplicates cannot escrow twice; another buyer can use the same request ID', async () => {
  const j = await open();
  await rejects(j.buyer, 'open', [j.id, j.seller, j.policy, j.deadline], 'DuplicateRequest', value);
  await tx(wallets[2], 'open', [j.id, j.seller, j.policy, j.deadline], value);
  assert.notEqual(await read('receiptKey', [wallets[2].account.address, j.id]), j.key);
});

test('only buyer accepts/refunds; accepted purchase creates exactly one provider credit', async () => {
  const j = await open();
  await rejects(wallets[1], 'accept', [j.key, h('result')], 'NotBuyer');
  await rejects(wallets[2], 'refund', [j.key], 'NotBuyer');
  await rejects(j.buyer, 'refund', [j.key], 'NotExpired');
  await rejects(j.buyer, 'accept', [j.key, `0x${'0'.repeat(64)}`], 'InvalidCommitment');
  const before = await read('credits', [j.seller]);
  await tx(j.buyer, 'accept', [j.key, h('result')]);
  assert.equal(await read('credits', [j.seller]), before + value);
  assert.equal((await read('jobs', [j.key]))[4], h('result'));
  assert.equal((await read('jobs', [j.key]))[6], 2);
  await rejects(j.buyer, 'accept', [j.key, h('other')], 'NotOpen');
  await rejects(j.buyer, 'refund', [j.key], 'NotOpen');
  await rejects(j.buyer, 'open', [j.id, j.seller, j.policy, j.deadline], 'DuplicateRequest', value);
});

test('acceptance allowed exactly at deadline; refund allowed only afterward', async () => {
  const j = await open();
  await advanceTo(j.deadline);
  await publicClient.simulateContract({ address: escrow, abi, functionName: 'accept', args: [j.key, h('boundary')], account: j.buyer.account });
  await rejects(j.buyer, 'refund', [j.key], 'NotExpired');
  await advanceTo(j.deadline + 1n);
  await rejects(j.buyer, 'accept', [j.key, h('late')], 'Expired');
  const credit = await read('credits', [j.buyer.account.address]);
  await tx(j.buyer, 'refund', [j.key]);
  assert.equal(await read('credits', [j.buyer.account.address]), credit + value);
  assert.equal((await read('jobs', [j.key]))[6], 3);
  await rejects(j.buyer, 'refund', [j.key], 'NotOpen');
  await rejects(j.buyer, 'open', [j.id, j.seller, j.policy, j.deadline + 100n], 'DuplicateRequest', value);
});

test('withdraw empties credit and transfers precisely the outstanding amount', async () => {
  const j = await open({ seller: wallets[3].account.address });
  await tx(j.buyer, 'accept', [j.key, h('paid')]);
  const credit = await read('credits', [j.seller]);
  const balance = await publicClient.getBalance({ address: j.seller });
  const receipt = await tx(wallets[3], 'withdraw');
  const afterBalance = await publicClient.getBalance({ address: j.seller });
  assert.equal(afterBalance, balance + credit - receipt.gasUsed * receipt.effectiveGasPrice);
  assert.equal(await read('credits', [j.seller]), 0n);
  await rejects(wallets[3], 'withdraw', [], 'NoCredit');
});

test('rejecting recipient cannot block acceptance; failed withdraw preserves credit; reentry is blocked', async () => {
  const hash = await wallets[0].deployContract({ abi: receiverArtifact.abi, bytecode: `0x${receiverArtifact.evm.bytecode.object}`, args: [escrow] });
  const receiver = (await publicClient.waitForTransactionReceipt({ hash })).contractAddress;
  async function receiverTx(functionName, args = []) {
    const txHash = await wallets[0].writeContract({ address: receiver, abi: receiverArtifact.abi, functionName, args });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    assert.equal(receipt.status, 'success');
  }
  await receiverTx('setReject', [true]);
  const j = await open({ seller: receiver });
  await tx(j.buyer, 'accept', [j.key, h('receiver-result')]);
  assert.equal(await read('credits', [receiver]), value);
  await assert.rejects(publicClient.simulateContract({ address: receiver, abi: receiverArtifact.abi, functionName: 'claim', account: wallets[0].account }));
  const failedHash = await wallets[0].writeContract({ address: receiver, abi: receiverArtifact.abi, functionName: 'claim', gas: 200000n });
  assert.equal((await publicClient.waitForTransactionReceipt({ hash: failedHash })).status, 'reverted');
  assert.equal(await read('credits', [receiver]), value);
  await receiverTx('setReject', [false]);
  await receiverTx('claim');
  assert.equal(await read('credits', [receiver]), 0n);
  assert.equal(await publicClient.getBalance({ address: receiver }), value);
  assert.equal(await publicClient.readContract({ address: receiver, abi: receiverArtifact.abi, functionName: 'reentryBlocked' }), true);
});
