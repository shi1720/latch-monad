import { test, expect, type Page } from '@playwright/test';

function snapshot() {
  const now = new Date().toISOString();
  return { source:'Vast.ai', retrievedAt:now, observedAtBasis:'proxy-retrieval-time', quotes:[
    {id:'vast-expensive',gpu:'NVIDIA H100 80GB',region:'US',location:'Virginia, US',priceUsdPerHour:2.8,observedAt:now,numGpus:8,totalPriceUsdPerHour:22.4,sourceUrl:'https://cloud.vast.ai/'},
    {id:'vast-cheapest',gpu:'NVIDIA H100 80GB',region:'DE',location:'Frankfurt, Germany',priceUsdPerHour:2.1,observedAt:now,numGpus:4,totalPriceUsdPerHour:8.4,sourceUrl:'https://cloud.vast.ai/'},
  ]};
}
const editor = (page: Page) => page.getByRole('textbox',{name:'Agent result JSON'});
async function fetchSuccess(page: Page) { await page.route('**/api/quotes',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(snapshot())})); await page.getByRole('button',{name:'Fetch live quotes',exact:true}).click(); await expect(page.locator('.offer-card')).toHaveCount(2); }

test.beforeEach(async ({page}) => {
  // No public RPC writes, account funding, third-party source calls, or unmocked API access.
  const base = new URL(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173').origin;
  await page.route('**/*',route=>new URL(route.request().url()).origin === base ? route.continue() : route.abort('blockedbyclient'));
  await page.route('**/api/quotes',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Mock source unavailable'})}));
  await page.goto('/');
});

test('starts without invented offers or a silently loaded fixture',async ({page})=>{
  await expect(editor(page)).toHaveValue('');
  await expect(page.getByRole('button',{name:'Run acceptance checks',exact:true})).toBeDisabled();
  await expect(page.locator('.settlement-panel button')).toBeDisabled();
  await expect(page.locator('.offer-card')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Fetch live quotes',exact:true})).toBeVisible();
  await expect(page.locator('.sandbox-label')).toContainText('Sandbox fixtures');
  await expect(page.locator('#region')).toHaveValue('any');
});

test('fetches provenance, sorts by per-GPU price, and separates full-machine cost',async ({page})=>{
  await fetchSuccess(page);
  await expect(page.locator('.offer-price').first()).toContainText('$2.10');
  await expect(page.locator('.offer-machine-price').first()).toContainText('$8.40');
  await expect(page.locator('.offer-card').first()).toContainText('4 GPUs / machine');
  await expect(page.locator('.source-provenance')).toContainText('Vast.ai');
  await expect(page.locator('.source-provenance')).toContainText('Retrieved');
  expect(await page.locator('.source-provenance time').getAttribute('datetime')).toMatch(/^\d{4}-/);
  await expect(page.locator('.offer-card').first().getByRole('link')).toHaveAttribute('href','https://cloud.vast.ai/');
  await expect(page.locator('.live-offers-disclosure')).toContainText('not reservations');
  await expect(page.locator('.live-offers-disclosure')).toContainText('not the provider’s last update');
  await expect(page.locator('.live-offers-disclosure')).toContainText('does not rent a GPU');
});

test('country filters and quote selection feed the real validator without rewriting source data',async ({page})=>{
  await fetchSuccess(page);
  await page.getByLabel('Country',{exact:true}).selectOption('US');
  await expect(page.locator('.offer-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Use this quote',exact:true}).click();
  const payload=JSON.parse(await editor(page).inputValue());
  expect(payload.source).toBe('Vast.ai'); expect(payload.observedAtBasis).toBe('proxy-retrieval-time'); expect(payload.quotes).toHaveLength(1); expect(payload.quotes[0].id).toBe('vast-expensive'); expect(payload.quotes[0].priceUsdPerHour).toBe(2.8);
  await page.getByLabel('Compute region',{exact:true}).selectOption('US');
  await page.getByRole('button',{name:'Run acceptance checks',exact:true}).click();
  await expect(page.getByText('Accepted. Ready to settle.')).toBeVisible();
  await page.getByLabel('Compute region',{exact:true}).selectOption('DE');
  await page.getByRole('button',{name:'Run acceptance checks',exact:true}).click();
  await expect(page.getByText('Rejected. Keep your budget.')).toBeVisible();
});

test('display price filter yields an honest empty state, then clears without changing policy',async ({page})=>{
  await fetchSuccess(page); await page.getByLabel('Max /GPU-hour',{exact:true}).fill('1');
  await expect(page.locator('.offer-card')).toHaveCount(0);
  await expect(page.getByText('No offers match these filters.')).toBeVisible();
  await expect(page.getByLabel('Price ceiling',{exact:true})).toHaveValue('4');
  await page.getByRole('button',{name:'Show all retrieved offers'}).click();
  await expect(page.locator('.offer-card')).toHaveCount(2);
  await expect(editor(page)).toHaveValue('');
});

test('failure is visible with no fake fallback and retry can recover',async ({page})=>{
  await page.getByRole('button',{name:'Fetch live quotes',exact:true}).click();
  await expect(page.locator('.live-fetch-error')).toContainText('Mock source unavailable');
  await expect(page.locator('.live-fetch-error')).toContainText('No sample data has been substituted');
  await expect(page.locator('.offer-card')).toHaveCount(0); await expect(editor(page)).toHaveValue('');
  await page.route('**/api/quotes',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(snapshot())}));
  await page.getByRole('button',{name:'Retry',exact:true}).click();
  await expect(page.locator('.offer-card')).toHaveCount(2); await expect(page.locator('.live-fetch-error')).toHaveCount(0);
});

test('invalid source response cannot become an offer or enable settlement',async ({page})=>{
  const invalid=snapshot();invalid.quotes[0].sourceUrl='https://untrusted.example/offer';
  await page.route('**/api/quotes',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(invalid)}));
  await page.getByRole('button',{name:'Fetch live quotes',exact:true}).click();
  await expect(page.locator('.live-fetch-error')).toContainText('incomplete or unsafe offer data');
  await expect(page.locator('.offer-card')).toHaveCount(0); await expect(editor(page)).toHaveValue('');
  await expect(page.locator('.settlement-panel button')).toBeDisabled();
});

test('failed refresh preserves the prior snapshot and explicitly labels it as not refreshed',async ({page})=>{
  await fetchSuccess(page);
  await page.route('**/api/quotes',route=>route.fulfill({status:502,contentType:'application/json',body:'{"error":"Source temporarily unavailable"}'}));
  await page.getByRole('button',{name:'Refresh live quotes',exact:true}).click();
  await expect(page.locator('.live-fetch-error')).toContainText('previous snapshot remains below; it was not refreshed');
  await expect(page.locator('.offer-card')).toHaveCount(2);
});

for (const width of [390,1440]) test(`live offer browser stays inside a ${width}px viewport`,async ({page})=>{
  await page.setViewportSize({width,height:1000}); await fetchSuccess(page);
  await expect(page.locator('.offer-card').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.locator('.offer-card').first().getByRole('button',{name:'Use this quote'}).click();
  await expect(editor(page)).not.toHaveValue('');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('sandbox fixtures stay explicit and select the fixture policy region',async ({page})=>{
  await page.getByRole('button',{name:'Valid quote',exact:true}).click();
  await expect(page.locator('#region')).toHaveValue('us-east');
  expect(JSON.parse(await editor(page).inputValue()).source).toContain('illustrative');
  await page.getByRole('button',{name:'Run acceptance checks',exact:true}).click();
  await expect(page.getByText('Accepted. Ready to settle.')).toBeVisible();
});

test('live artifact provenance remains inspectable in a portable receipt',async ({page})=>{
  const payload=snapshot();payload.quotes=payload.quotes.slice(0,1);
  await page.evaluate(payload=>{const hash='0x'+'a'.repeat(64);window.dispatchEvent(new CustomEvent('latch-receipt',{detail:{key:hash,transactionHash:hash,resultHash:hash,policyHash:hash,amount:'0.001',status:'Accepted',createdAt:new Date().toISOString(),chainId:10143,payload}}));},payload);
  await page.getByRole('button',{name:'Inspect receipt'}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByText('Purchased quote artifact')).toBeVisible();
  await expect(dialog.locator('.receipt-artifact-source')).toContainText('Vast.ai');
  await expect(dialog.locator('.receipt-artifact-quote')).toContainText('Virginia, US');
  await expect(dialog.locator('.receipt-artifact-prices')).toContainText('$22.40');
  await expect(dialog.getByRole('link',{name:'Open Vast.ai marketplace'})).toHaveAttribute('href','https://cloud.vast.ai/');
  await dialog.getByText('Inspect original result JSON').click();
  await expect(dialog.locator('.receipt-raw-payload pre')).toContainText('proxy-retrieval-time');
  await expect(dialog.locator('.receipt-raw-payload pre')).toContainText('vast-expensive');
});

test('restored purchase locks its original artifact and policy until a receipt confirms completion',async ({page})=>{
  const original=snapshot();
  await page.evaluate(payload=>localStorage.setItem('latch-active-purchase',JSON.stringify({payload,policy:{region:'any',maxAgeSeconds:300,maxPriceUsd:4}})),original);
  await page.reload();
  await expect(page.getByText('Unfinished purchase restored.')).toBeVisible();
  await expect(editor(page)).toBeDisabled();
  await expect(page.getByLabel('Compute region',{exact:true})).toBeDisabled();
  await expect(page.getByLabel('Price ceiling',{exact:true})).toBeDisabled();
  await expect(page.getByLabel('Maximum age',{exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Valid quote',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Dismiss restored purchase notice'}).click();
  await expect(editor(page)).toBeDisabled();
  await expect(page.locator('.live-selection-locked')).toContainText('retry settlement');
  await page.getByRole('button',{name:'Run acceptance checks',exact:true}).click();
  await expect(page.getByText('Accepted. Ready to settle.')).toBeVisible();
  expect(JSON.parse(await editor(page).inputValue())).toEqual(original);
  await page.evaluate(()=>{const hash='0x'+'a'.repeat(64);window.dispatchEvent(new CustomEvent('latch-receipt',{detail:{key:hash,transactionHash:hash,amount:'0.001',status:'Accepted',createdAt:new Date().toISOString(),chainId:10143}}));});
  await expect(editor(page)).toBeEnabled();
  await expect(page.getByLabel('Compute region',{exact:true})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Valid quote',exact:true})).toBeEnabled();
});

test('a settlement error keeps artifact and policy locked for a safe retry',async ({page})=>{
  await page.getByRole('button',{name:'Valid quote',exact:true}).click();
  await page.getByRole('button',{name:'Run acceptance checks',exact:true}).click();
  // Inject UI connection state only. No chain wallet exists, so the adapter rejects
  // before RPC submission. This tests the safe retry UI without a public write.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('latch-wallet',{detail:{address:'0x'+'1'.repeat(40),isDemo:true}})));
  await page.locator('.settlement-panel button').click();
  await expect(page.getByRole('alert')).toContainText('Connect a wallet first');
  await expect(editor(page)).toBeDisabled();
  await expect(page.getByLabel('Price ceiling',{exact:true})).toBeDisabled();
  await expect(page.locator('.settlement-panel button')).toBeEnabled();
});
