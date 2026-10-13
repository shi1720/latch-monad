import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { encodeAbiParameters, encodeFunctionResult, keccak256 } from 'viem';
import { canonicalHash } from '../src/policy.ts';

// UI fixture only: references checked-in real testnet evidence, but does NOT replay,
// reverify, or create blockchain transactions. Each test gets isolated browser storage.
const evidence = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../public/live-evidence.json'), 'utf8'));
const acceptedHash = evidence.transactions.find((t: any) => t.label === 'accept').hash;
const refundHash = evidence.transactions.find((t: any) => t.label === 'refund').hash;
function receipt(status: 'Accepted' | 'Refunded') {
  const accepted = status === 'Accepted';
  return {
    key: evidence.assertions.find((a: any) => a.status.startsWith(accepted ? 'Accepted' : 'Refunded')).key,
    hash: accepted ? acceptedHash : refundHash,
    transactionHash: accepted ? acceptedHash : refundHash,
    reserveHash: evidence.transactions.filter((t: any) => t.label === 'open')[accepted ? 0 : 1].hash,
    resultHash: `0x${'a'.repeat(64)}`, policyHash: `0x${'b'.repeat(64)}`,
    requestId: `0x${(accepted ? 'c' : 'd').repeat(64)}`,
    chainId: evidence.chainId, contract: evidence.escrow,
    buyer: evidence.buyer, provider: evidence.provider,
    amount: '0.001', status, blockStatus: accepted ? 2 : 3,
    createdAt: evidence.completedAt,
    testFixture: 'Injected UI regression fixture; not a new onchain transaction',
  };
}
function normalizedReceipt(value: ReturnType<typeof receipt>) {
  const { blockStatus: _blockStatus, testFixture: _fixture, ...fields } = value;
  return { ...fields, accepted: value.status === 'Accepted' };
}

test.beforeEach(async ({ page }) => {
  // A regression suite must never fund accounts or write to a public RPC.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173').origin) await route.continue();
    else await route.abort('blockedbyclient');
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => { (window as any).__copied = text; },
    } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Valid quote', exact: true }).click();
});

const editor = (page: Page) => page.getByRole('textbox', { name: 'Agent result JSON' });
const run = async (page: Page) => {
  await page.getByRole('button', { name: /Run acceptance checks|Run again/ }).click();
  await expect(page.getByText(/Accepted\. Ready to settle\.|Rejected\. Keep your budget\./)).toBeVisible();
};
async function nav(page: Page, name: string) {
  const menu = page.getByRole('button', { name: 'Open navigation' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: false }).click();
}
async function injectReceipt(page: Page, value: ReturnType<typeof receipt>) {
  await page.evaluate(detail => window.dispatchEvent(new CustomEvent('latch-receipt', { detail })), value);
}

test('valid, stale and malformed scenarios produce real local policy verdicts', async ({ page }) => {
  await run(page);
  await expect(page.getByText('3/3 passed')).toBeVisible();
  await page.getByRole('button', { name: 'Stale result', exact: true }).click();
  await run(page);
  await expect(page.getByText('Rejected. Keep your budget.')).toBeVisible();
  await page.getByRole('button', { name: 'Malformed payload', exact: true }).click();
  await run(page);
  await expect(page.getByText('Rejected. Keep your budget.')).toBeVisible();
  await expect(page.locator('.metric').filter({ hasText: 'Checks this session' }).locator('strong')).toHaveText('03');
  await expect(page.locator('.metric').filter({ hasText: 'Onchain receipts' }).locator('strong')).toHaveText('00');
});

test('invalid JSON fails visibly without a verdict or a paid action', async ({ page }) => {
  await editor(page).fill('{not-json');
  await page.getByRole('button', { name: 'Run acceptance checks' }).click();
  await expect(page.getByRole('alert')).toContainText('not valid JSON');
  await expect(page.locator('.settlement-panel button')).toBeDisabled();
  await expect(page.locator('.metric').filter({ hasText: 'Checks this session' }).locator('strong')).toHaveText('00');
});

for (const [label, patch] of [
  ['wrong GPU', { gpu: 'NVIDIA A100 80GB' }],
  ['wrong region', { region: 'eu-west' }],
  ['excessive price', { priceUsdPerHour: 999 }],
  ['stale timestamp', { observedAt: '2020-01-01T00:00:00Z' }],
  ['future timestamp', { observedAt: '2099-01-01T00:00:00Z' }],
  ['non-numeric price', { priceUsdPerHour: '2.45' }],
] as const) {
  test(`rejects ${label} in edited supplier JSON`, async ({ page }) => {
    const payload = JSON.parse(await editor(page).inputValue());
    Object.assign(payload.quotes[0], patch);
    await editor(page).fill(JSON.stringify(payload));
    await run(page);
    await expect(page.getByText('Rejected. Keep your budget.')).toBeVisible();
    await expect(page.locator('.metric').filter({ hasText: 'Onchain receipts' }).locator('strong')).toHaveText('00');
  });
}

test('editing payload or policy invalidates the previous verdict and settlement readiness', async ({ page }) => {
  await run(page);
  await page.getByLabel('Price ceiling', { exact: true }).fill('3');
  await expect(page.getByText('Accepted. Ready to settle.')).toHaveCount(0);
  await expect(page.locator('.settlement-panel button')).toBeDisabled();
  await run(page);
  await editor(page).fill('{}');
  await expect(page.getByText('Accepted. Ready to settle.')).toHaveCount(0);
  await expect(page.locator('.settlement-panel button')).toBeDisabled();
});

for (const [field, value] of [['Maximum age', '0'], ['Price ceiling', '-1']] as const) {
  test(`invalid ${field} prevents acceptance`, async ({ page }) => {
    await page.getByLabel(field, { exact: true }).fill(value);
    await page.getByRole('button', { name: 'Run acceptance checks' }).click();
    await expect(page.getByRole('alert')).toContainText('positive');
    await expect(page.locator('.settlement-panel button')).toBeDisabled();
  });
}

test('result commitment copy exposes full bytes32 hash, without sending a transaction', async ({ page }) => {
  await run(page);
  await page.getByRole('button', { name: 'Copy full result hash' }).click();
  const copied = await page.evaluate(() => (window as any).__copied);
  expect(copied).toMatch(/^0x[0-9a-f]{64}$/);
  await expect(page.locator('.hash-strip code')).toHaveAttribute('title', copied);
});

test('injected receipt events preserve credit semantics, deduplicate, persist and export exact metadata', async ({ page }) => {
  const accepted = receipt('Accepted');
  const refunded = receipt('Refunded');
  await injectReceipt(page, accepted);
  await injectReceipt(page, accepted);
  await injectReceipt(page, refunded);
  await expect(page.locator('.metric').filter({ hasText: 'Onchain receipts' }).locator('strong')).toHaveText('02');
  await expect(page.locator('.metric').filter({ hasText: 'Accepted payments' }).locator('strong')).toHaveText('01');
  await expect(page.getByText('Provider credited', { exact: true })).toBeVisible();
  await expect(page.getByText('Withdrawable by provider', { exact: true })).toBeVisible();
  await expect(page.getByText('Buyer refunded', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.metric').filter({ hasText: 'Onchain receipts' }).locator('strong')).toHaveText('02');
  await expect(page.locator('.metric').filter({ hasText: 'Checks this session' }).locator('strong')).toHaveText('00');
  await nav(page, 'Receipts');
  const links = page.getByRole('link', { name: 'View transaction' });
  await expect(links).toHaveCount(2);
  await expect(page.locator(`a[href="https://testnet.monadscan.com/tx/${acceptedHash}"]`)).toHaveCount(1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export receipts' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('latch-receipts.json');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(exported).toHaveLength(2);
  expect(exported.find((r: any) => r.status === 'Accepted')).toEqual(normalizedReceipt(accepted));
  expect(exported.find((r: any) => r.status === 'Refunded')).toEqual(normalizedReceipt(refunded));
});

test('receipt details expose full commitments, trust boundaries and a portable copy', async ({ page }) => {
  const value = receipt('Accepted');
  await injectReceipt(page, value);
  await page.getByRole('button', { name: 'Inspect receipt', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'The evidence behind the payment.' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(value.key);
  await expect(dialog).toContainText(value.policyHash);
  await expect(dialog).toContainText('does not prove the quote is true');
  await expect(dialog.getByRole('link', { name: value.transactionHash, exact: true })).toHaveAttribute('href', `https://testnet.monadscan.com/tx/${value.transactionHash}`);
  await dialog.getByRole('button', { name: 'Copy receipt', exact: true }).click();
  expect(JSON.parse(await page.evaluate(() => (window as any).__copied))).toEqual(normalizedReceipt(value));
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('incomplete receipt event is rejected and corrupt persisted data never crashes the UI', async ({ page }) => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('latch-receipt', { detail: { transactionHash: 'not-a-hash' } })));
  await expect(page.getByRole('alert')).toContainText('incomplete');
  await expect(page.locator('.metric').filter({ hasText: 'Onchain receipts' }).locator('strong')).toHaveText('00');
  await page.evaluate(() => localStorage.setItem('latch-receipts', JSON.stringify([{ key: 'bad', transactionHash: 'bad', status: null }])));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pay for checked results.' })).toBeVisible();
  await expect(page.locator('.metric').filter({ hasText: 'Onchain receipts' }).locator('strong')).toHaveText('00');
});

for (const [status, conflict] of [['Accepted', false], ['Refunded', false], ['Accepted', true]] as const) test(`mocked RPC ${conflict ? 'rejects conflicting accepted output' : 'reconciles an already '+status.toLowerCase()+' purchase using the original key'} without another transaction`, async ({ page }) => {
  const accepted = status === 'Accepted';
  const deployment = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../public/deployment.json'), 'utf8'));
  const abi = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../public/abi.json'), 'utf8'));
  const payload = JSON.parse(await editor(page).inputValue());
  const policy = { maxAgeSeconds: 300, maxPriceUsd: 4, region: 'us-east' };
  const policyHash = await canonicalHash(policy);
  const resultHash = await canonicalHash(payload);
  const requestId = await canonicalHash({ policyHash, resultHash });
  const key = keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [evidence.buyer, requestId]));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (accepted ? 300 : -15));
  await page.evaluate(({ buyer, operationKey, operation }) => {
    (window as any).__walletWrites = 0;
    (window as any).ethereum = { request: async ({ method }: { method: string }) => {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [buyer];
      if (method === 'eth_chainId') return '0x279f';
      if (method === 'wallet_switchEthereumChain') return null;
      if (method === 'eth_sendTransaction') { (window as any).__walletWrites++; throw new Error('Browser regression forbids transaction submission'); }
      throw new Error(`Unexpected wallet request: ${method}`);
    } };
    localStorage.setItem(operationKey, JSON.stringify(operation));
  }, {
    buyer: evidence.buyer,
    operationKey: `latch-operation:${deployment.address}:${evidence.buyer}:${requestId}`,
    operation: { open: receipt(status).reserveHash, ...(accepted ? { accept: acceptedHash } : { refund: refundHash }), deadline: deadline.toString() },
  });
  const jobData = encodeFunctionResult({ abi, functionName: 'jobs', result: [evidence.buyer, deployment.provider, 1000000000000000n, policyHash, accepted && !conflict ? resultHash : `0x${'0'.repeat(64)}`, deadline, accepted ? 2 : 3] });
  const zeroCredit = encodeFunctionResult({ abi, functionName: 'credits', result: 0n });
  let readCalls = 0;
  await page.route('https://testnet-rpc.monad.xyz/**', async route => {
    const request = route.request().postDataJSON();
    const reply = (rpc: any) => {
      if (rpc.method !== 'eth_call') throw new Error(`Unexpected RPC method during reconciliation: ${rpc.method}`);
      const isJobRead = rpc.params[0].data.toLowerCase().includes(key.slice(2).toLowerCase());
      if (!isJobRead) expect(rpc.params[0].data.toLowerCase()).toContain(evidence.buyer.slice(2).toLowerCase());
      readCalls++;
      return { jsonrpc: '2.0', id: rpc.id, result: isJobRead ? jobData : zeroCredit };
    };
    await route.fulfill({ json: Array.isArray(request) ? request.map(reply) : reply(request) });
  });
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  await expect(page.locator('.wallet-button')).toContainText(evidence.buyer.slice(0, 8));
  await run(page);
  await page.getByRole('button', { name: 'Reserve & settle on Monad' }).click();
  if (conflict) {
    await expect(page.locator('.alert.error')).toContainText('Existing accepted result commitment differs');
    expect(await page.evaluate(() => (window as any).__walletWrites)).toBe(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('latch-receipts') || '[]'))).toHaveLength(0);
    return;
  }
  await expect(page.getByRole('button', { name: 'Settlement confirmed', exact: true })).toBeVisible();
  expect(readCalls).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(() => (window as any).__walletWrites)).toBe(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('latch-receipts')!));
  expect(stored).toHaveLength(1);
  expect(stored[0].key).toBe(key);
  expect(stored[0].transactionHash).toBe(accepted ? acceptedHash : refundHash);
  expect(stored[0].status).toBe(status);
  expect(stored[0].requestId).toBe(requestId);
  expect(await page.evaluate(() => localStorage.getItem('latch-active-purchase'))).toBeNull();
});

test('saved interrupted input restores exactly after reload without starting a transaction', async ({ page }) => {
  const payload = JSON.parse(await editor(page).inputValue());
  payload.quotes[0].priceUsdPerHour = 1.75;
  const policy = { maxAgeSeconds: 180, maxPriceUsd: 2.5, region: 'us-east' };
  await page.evaluate(p => localStorage.setItem('latch-active-purchase', JSON.stringify(p)), { payload, policy });
  await page.reload();
  expect(JSON.parse(await editor(page).inputValue())).toEqual(payload);
  await expect(page.getByLabel('Price ceiling', { exact: true })).toHaveValue('2.5');
  await expect(page.getByLabel('Maximum age', { exact: true })).toHaveValue('180');
  await expect(page.locator('.settlement-panel button')).toBeDisabled();
});

for (const width of [390, 768, 1440]) {
  test(`all primary views fit ${width}px viewport without document overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await injectReceipt(page, receipt('Accepted'));
    await page.getByRole('button', { name: 'Inspect receipt', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.getByRole('button', { name: 'Close receipt details' }).click();
    for (const name of ['Workbench', 'Receipts', 'Developer kit']) {
      await nav(page, name);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
  });
}
