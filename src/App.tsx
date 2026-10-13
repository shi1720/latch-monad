import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, CircleHelp, Code2, Copy, Download, FileCheck2, Fingerprint, Layers3, LoaderCircle, LockKeyhole, Menu, Play, ReceiptText, RotateCcw, ShieldCheck, Terminal, Wallet, X } from 'lucide-react';
import { canonicalHash, makeSample, validateResult } from './policy';
import { countryLabel, parseQuoteSnapshot, type LiveQuote, type QuoteSnapshot } from './quotes';
import './style.css';

type Policy = { maxAgeSeconds: number; maxPriceUsd: number; region: string };
type Validation = ReturnType<typeof validateResult>;
type Receipt = { key: string; hash?: string; resultHash?: string; policyHash?: string; requestId?: string; reserveHash?: string; withdrawalHash?: string; transactionHash: string; buyer?: string; provider?: string; contract?: string; chainId?: number; amount: string; status: string; createdAt: string | number; accepted?: boolean; payload?: unknown; policy?: Policy };
type View = 'workbench' | 'receipts' | 'developers';
type Mode = 'live' | 'valid' | 'stale' | 'malformed';
const EXPLORER = 'https://testnet.monadscan.com';
const short = (s: string) => s.length > 18 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s;
const validHash = (value: unknown): value is string => typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
const validAddress = (value: unknown): value is string => typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
function normalizeReceipt(value: unknown): Receipt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  if (!validHash(r.key) || !validHash(r.transactionHash) || typeof r.status !== 'string' || !/^(accepted|refunded|settled)$/i.test(r.status) || typeof r.amount !== 'string' || !/^\d{1,12}(\.\d{1,18})?$/.test(r.amount) || (typeof r.createdAt !== 'string' && typeof r.createdAt !== 'number') || Number.isNaN(new Date(r.createdAt).getTime()) || (r.chainId !== undefined && r.chainId !== 10143)) return null;
  const next: Receipt = { key: r.key, transactionHash: r.transactionHash, amount: r.amount, status: r.status, createdAt: r.createdAt, accepted: /^(accepted|settled)$/i.test(r.status), chainId: 10143 };
  for (const field of ['hash', 'resultHash', 'policyHash', 'requestId', 'reserveHash', 'withdrawalHash'] as const) if (validHash(r[field])) next[field] = r[field];
  for (const field of ['buyer', 'provider', 'contract'] as const) if (validAddress(r[field])) next[field] = r[field];
  if (r.payload !== undefined) next.payload = r.payload;
  if (isPolicy(r.policy)) next.policy = r.policy;
  return next;
}
function isPolicy(value: unknown): value is Policy { if (!value || typeof value !== 'object') return false; const p = value as Policy; return typeof p.region === 'string' && p.region.length > 0 && p.region.length < 64 && Number.isFinite(p.maxAgeSeconds) && p.maxAgeSeconds > 0 && Number.isFinite(p.maxPriceUsd) && p.maxPriceUsd > 0; }
const loadReceipts = (): Receipt[] => { try { const stored: unknown = JSON.parse(localStorage.getItem('latch-receipts') || '[]'); return Array.isArray(stored) ? stored.slice(0, 100).map(normalizeReceipt).filter((r): r is Receipt => r !== null) : []; } catch { return []; } };
const download = (data: unknown, filename: string) => { const u = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = u; a.download = filename; a.click(); URL.revokeObjectURL(u); };

function Mark({ small = false }: { small?: boolean }) { return <span className={`latch-mark ${small ? 'small' : ''}`} aria-hidden="true"><span /><span /></span>; }
function recovery(): {payload: unknown; policy: Policy} | null { try { const r = JSON.parse(localStorage.getItem('latch-active-purchase') || 'null'); return r && r.payload !== undefined && isPolicy(r.policy) ? {payload: r.payload, policy: r.policy} : null; } catch { return null; } }
function App() {
  const [restored, setRestored] = useState(recovery);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [view, setView] = useState<View>('workbench');
  const [mode, setMode] = useState<Mode>('live');
  const [payloadText, setPayloadText] = useState(() => restored ? JSON.stringify(restored.payload, null, 2) : '');
  const [policy, setPolicy] = useState<Policy>(()=>restored?.policy ||{ maxAgeSeconds: 300, maxPriceUsd: 4, region: 'any' });
  const protectedPurchase = useRef(!!restored);
  const [liveCountries, setLiveCountries] = useState<string[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<LiveQuote | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [digest, setDigest] = useState('');
  const [policyDigest, setPolicyDigest] = useState('');
  const [checkedPayload, setCheckedPayload] = useState<unknown>(null);
  const [wallet, setWallet] = useState('');
  const [isDemoWallet, setIsDemoWallet] = useState(false);
  const [progress, setProgress] = useState('');
  const [pending, setPending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>(loadReceipts);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [runCount, setRunCount] = useState(0);
  const [copied, setCopied] = useState('');
  const [menu, setMenu] = useState(false);
  const [resultOpen, setResultOpen] = useState(true);
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    const onWallet = (event: Event) => { const d = (event as CustomEvent).detail; setWallet(d?.address || ''); setIsDemoWallet(!!d?.isDemo); setConnecting(false); };
    const onReceipt = (event: Event) => { const next = normalizeReceipt((event as CustomEvent).detail); if (!next) { setError('The settlement response was incomplete. Check your wallet transaction history before retrying.'); setPending(false); return; } setRestored(null); protectedPurchase.current = false; setReceipts(old => [next, ...old.filter(r => r.transactionHash !== next.transactionHash)].slice(0, 100)); setLastReceipt(next); setPending(false); setNotice('Settlement confirmed. Your receipt is ready to inspect.'); setProgress(''); };
    const onProgress = (event: Event) => { setProgress((event as CustomEvent).detail?.message || 'Waiting for confirmation…'); };
    const onError = (event: Event) => { setError((event as CustomEvent).detail?.message || 'The transaction could not be completed. Try again.'); setPending(false); setConnecting(false); };
    window.addEventListener('latch-progress', onProgress); window.addEventListener('latch-wallet', onWallet); window.addEventListener('latch-receipt', onReceipt); window.addEventListener('latch-error', onError);
    return () => { window.removeEventListener('latch-progress', onProgress); window.removeEventListener('latch-wallet', onWallet); window.removeEventListener('latch-receipt', onReceipt); window.removeEventListener('latch-error', onError); };
  }, []);
  useEffect(() => { try { localStorage.setItem('latch-receipts', JSON.stringify(receipts)); setStorageUnavailable(false); } catch { setStorageUnavailable(true); } }, [receipts]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(t); }, [notice]);
  const acceptedReceipts = useMemo(() => receipts.filter(r => r.status.toLowerCase().includes('accept') || r.status.toLowerCase().includes('settle') || r.accepted === true), [receipts]);
  const invalidate = () => { setValidation(null); setDigest(''); setLastReceipt(null); setError(''); };
  const chooseSample = (next: Exclude<Mode, 'live'>) => { if (pending || protectedPurchase.current) return; setMode(next); setSelectedOffer(null); setPolicy(p => ({...p, region:'us-east'})); setPayloadText(JSON.stringify(makeSample(next), null, 2)); invalidate(); };
  const chooseOffer = (quote: LiveQuote, snapshot: QuoteSnapshot) => { if (pending || protectedPurchase.current) return; setMode('live'); setSelectedOffer(quote); setPayloadText(JSON.stringify({...snapshot,quotes:[quote]},null,2)); invalidate(); };
  const updatePolicy = (key: keyof Policy, value: string) => { if (protectedPurchase.current) return; setPolicy(p => ({ ...p, [key]: key === 'region' ? value : Number(value) })); invalidate(); };
  async function runChecks() {
    setChecking(true); setError(''); setLastReceipt(null);
    try {
      const payload: unknown = JSON.parse(payloadText);
      if (!Number.isFinite(policy.maxAgeSeconds) || policy.maxAgeSeconds <= 0 || !Number.isFinite(policy.maxPriceUsd) || policy.maxPriceUsd <= 0 || !policy.region.trim()) throw new Error('Set a positive freshness limit and price ceiling, and choose a region.');
      const next = validateResult(payload, policy);
      setValidation(next); setCheckedPayload(payload); setDigest(await canonicalHash(payload)); setPolicyDigest(await canonicalHash(policy)); setRunCount(n => n + 1);
    } catch (e) { setError(e instanceof SyntaxError ? 'The result is not valid JSON. Fix the payload before checking it.' : e instanceof Error ? e.message : 'Could not validate this result.'); setValidation(null); }
    finally { setChecking(false); }
  }
  function connect() { setConnecting(true); setError(''); window.dispatchEvent(new CustomEvent('latch-connect')); }
  function settle() {
    if (!validation || !digest) return;
    if (!wallet) { connect(); return; }
    protectedPurchase.current = true;
    setPending(true); setError(''); setProgress('Preparing your testnet settlement…');
    window.dispatchEvent(new CustomEvent('latch-settle', { detail: { payload: checkedPayload, policy, accepted: validation.accepted, resultHash: digest, policyHash: policyDigest, requestId: `latch-${crypto.randomUUID()}` } }));
  }
  async function copy(text: string, key: string) { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000); } catch { setError('Clipboard unavailable. Select and copy the text manually.'); } }
  const sdk = `import { validateResult, canonicalHash, receiptKey }
  from './sdk/index';

// Reserve first with escrow.open(...).
// walletClient, escrow, abi, buyer, and requestId
// come from your application's setup.
const key = receiptKey(buyer, requestId);
const policy = {
  region: 'any',
  maxAgeSeconds: 300,
  maxPriceUsd: 4
};

const verdict = validateResult(payload, policy);
const policyHash = await canonicalHash(policy);
const resultHash = await canonicalHash(payload);

// Buyer authorizes payment after checking.
if (verdict.accepted) {
  await walletClient.writeContract({
    address: escrow, abi,
    functionName: 'accept',
    args: [key, resultHash]
  });
}
// If rejected: refund after the job deadline.`;
  const nav = [{ id: 'workbench' as View, icon: Layers3, label: 'Workbench' }, { id: 'receipts' as View, icon: ReceiptText, label: 'Receipts' }, { id: 'developers' as View, icon: Code2, label: 'Developer kit' }];

  return <div className="app-shell">
    <aside className={`sidebar ${menu ? 'mobile-open' : ''}`}>
      <a href="#" className="brand" onClick={e => { e.preventDefault(); setView('workbench'); setMenu(false); }}><Mark /><span>latch<span className="brand-dot">.</span></span></a>
      <div className="workspace-label"><span className="workspace-avatar">L</span><div>Your workspace<small>Builder edition</small></div><span className="workspace-dot" /></div>
      <div className="nav-caption">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{nav.map(({ id, icon: Icon, label }) => <button key={id} aria-label={label} aria-current={view === id ? 'page' : undefined} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => { setView(id); setMenu(false); }}><Icon size={18} strokeWidth={1.7} /><span>{label}</span>{id === 'receipts' && receipts.length > 0 && <span className="nav-count">{receipts.length}</span>}{view === id && <span className="nav-active-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><ShieldCheck size={23} strokeWidth={1.4} /><h3>Trust the condition.<br />Verify the payment.</h3><p>Every settlement leaves a receipt you can take anywhere.</p><button onClick={() => setView('developers')}>How Latch works <ArrowUpRight size={15} /></button></div><div className="sidebar-footer"><span className="live-dot" /> Monad testnet<span>v0.1</span></div></div>
    </aside>
    {menu && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenu(false)} />}
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><button className="mobile-menu" onClick={() => setMenu(!menu)} aria-label="Open navigation"><Menu size={20} /></button><span>Workspace</span><ChevronRight size={14} /><strong>{view === 'workbench' ? 'Acceptance workbench' : view === 'receipts' ? 'Settlement receipts' : 'Developer kit'}</strong></div><div className="topbar-actions"><span className="network-pill"><span className="live-dot" />Monad testnet</span><button title="Connect your wallet, or create a test-only wallet in this browser session" className={`wallet-button ${wallet ? 'connected' : ''}`} onClick={connect} disabled={connecting || pending}>{connecting ? <LoaderCircle size={15} className="spin" /> : <Wallet size={15} />}<span>{connecting ? 'Connecting…' : wallet ? short(wallet) : 'Connect wallet'}</span>{wallet && <span className="live-dot" />}</button></div></header>
      <main>
        {restored && <div className="recovery-notice" role="status"><RotateCcw size={19} /><div><strong>Unfinished purchase restored.</strong><p>Your original result and policy are back. Run the checks, connect the same wallet, and retry settlement. Latch reuses the existing purchase so you are not charged twice. An expired job can be refunded.</p></div><button aria-label="Dismiss restored purchase notice" onClick={() => setRestored(null)}><X size={16} /></button></div>}
        {storageUnavailable && <div className="alert error" role="status"><CircleHelp size={17} /><span>Browser storage is unavailable. Receipts remain visible for this session; export them to keep a copy. Enable site storage to restore unfinished purchases.</span></div>}
        {error && <div className="alert error" role="alert"><CircleHelp size={18} /><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}
        {notice && <div className="alert success" role="status"><Check size={18} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16} /></button></div>}
        {view === 'workbench' && <>
          <section className="page-heading"><div><div className="eyebrow"><span /> THE ACCEPTANCE LAYER FOR AI WORK</div><h1>Pay for checked results<span>.</span></h1><p>Your agent has a budget. Give it a definition of done.</p></div><div className="hero-seal"><Fingerprint size={30} strokeWidth={1.3} /><span>CHECK FIRST.<br /><strong>SETTLE SECOND.</strong></span></div></section>
          <section className="metrics" aria-label="Workspace activity"><div className="metric"><span>Checks this session<Layers3 size={15} /></span><strong>{runCount.toString().padStart(2, '0')}</strong><small>Run locally against your policy</small></div><div className="metric"><span>Onchain receipts<FileCheck2 size={15} /></span><strong>{receipts.length.toString().padStart(2, '0')}</strong><small>Saved in this browser</small></div><div className="metric"><span>Accepted payments<ArrowUpRight size={15} /></span><strong>{acceptedReceipts.length.toString().padStart(2, '0')}</strong><small>Confirmed testnet settlements</small></div><div className="metric accent"><span>Settlement network<LockKeyhole size={15} /></span><strong>Monad <span>↗</span></strong><small>Testnet · no real-money payments</small></div></section>
          <LiveOffers onSelect={chooseOffer} onRegions={setLiveCountries} disabled={pending || protectedPurchase.current} selectedId={selectedOffer?.id} />
          <div className="section-title"><div><span className="step-index">01</span><h2>Define what earns the payment</h2></div><span className="small-muted">A real policy. A testnet payment.</span></div>
          <section className="workbench-grid">
            <div className="panel request-panel"><div className="panel-heading"><div className="panel-icon"><Terminal size={18} /></div><div><h3>GPU quote request</h3><p>An agent buys a structured price quote</p></div><span className="sample-badge">{mode === 'live' ? selectedOffer ? 'Live offer selected' : restored ? 'Restored purchase' : 'Awaiting a quote' : 'Sandbox fixture'}</span></div>
              <div className="request-summary"><span className="request-label">THE JOB</span><p>Find an H100 hourly quote in <strong>{countryLabel(policy.region || 'any')}</strong>, within the price ceiling, with a fresh timestamp.</p><div className="job-meta"><span><span className="tiny-square" /> Structured JSON</span><span>One result → one receipt</span></div></div>
              <div className="policy-form"><div className="form-heading"><h4>Acceptance policy</h4><span>Buyer defined</span></div><label htmlFor="region">Compute region</label><select id="region" value={policy.region} disabled={pending || protectedPurchase.current} onChange={e => updatePolicy('region', e.target.value)}><option value="any">Any country</option>{liveCountries.map(code => <option key={code} value={code}>{countryLabel(code)} · {code}</option>)}{selectedOffer && !liveCountries.includes(selectedOffer.region) && <option value={selectedOffer.region}>{countryLabel(selectedOffer.region)} · {selectedOffer.region}</option>}<option value="us-east">US East · sandbox</option><option value="eu-west">Europe West · eu-west</option><option value="ap-south">Asia Pacific · ap-south</option></select><div className="field-row"><div><label htmlFor="max-price">Price ceiling</label><div className="input-with-unit"><span>$</span><input id="max-price" type="number" min="0.01" step="0.25" value={policy.maxPriceUsd} disabled={pending || protectedPurchase.current} onChange={e => updatePolicy('maxPriceUsd', e.target.value)} /><span>/ hr</span></div></div><div><label htmlFor="max-age">Maximum age</label><div className="input-with-unit"><input id="max-age" type="number" min="1" max="86400" step="30" value={policy.maxAgeSeconds} disabled={pending || protectedPurchase.current} onChange={e => updatePolicy('maxAgeSeconds', e.target.value)} /><span>sec</span></div></div></div><div className="payment-budget"><div><span>Test payment</span><strong>0.001 <small>MON</small></strong></div><span className="budget-tag">Quote adapter fee</span></div></div>
              <div className="trust-note"><LockKeyhole size={15} /><p>This test fee pays the Latch quote adapter after acceptance. It does not reserve a GPU or pay Vast.ai. The buyer validates the result.</p></div>
            </div>
            <div className="panel result-panel"><div className="panel-heading"><div className="panel-icon"><Code2 size={18} /></div><div><h3>Put the result to the test</h3><p>{mode === 'live' ? 'Select a live offer above, then check its terms.' : 'Explicit sandbox data for testing failure paths.'}</p></div><span className="live-label"><span className="live-dot" />Interactive</span></div><div className="sandbox-label">Sandbox fixtures <span>Illustrative data, never a live feed</span></div><div className="scenario-picker" role="group" aria-label="Sample result scenario">{([{ key: 'valid', label: 'Valid quote' }, { key: 'stale', label: 'Stale result' }, { key: 'malformed', label: 'Malformed payload' }] as { key: Exclude<Mode, 'live'>; label: string }[]).map(s => <button key={s.key} className={mode === s.key ? 'selected' : ''} onClick={() => chooseSample(s.key)} disabled={pending || protectedPurchase.current}>{s.key === 'valid' && <span className="live-dot" />}{s.label}</button>)}</div><div className="code-label"><span><span className="file-dot" />agent-result.json</span><div><button onClick={() => { if (mode !== 'live') chooseSample(mode); }} disabled={pending || mode === 'live' || protectedPurchase.current} title="Regenerate sample with a current timestamp" aria-label="Refresh sample"><RotateCcw size={13} /></button><button aria-label={resultOpen ? 'Collapse JSON editor' : 'Expand JSON editor'} onClick={() => setResultOpen(!resultOpen)}>{resultOpen ? 'Collapse' : 'Expand'}</button></div></div>{resultOpen && <textarea className="json-editor" aria-label="Agent result JSON" placeholder="Fetch live quotes and select an offer to inspect its original JSON. Or choose an explicit sandbox fixture above." spellCheck={false} value={payloadText} disabled={pending || protectedPurchase.current} onChange={e => { setPayloadText(e.target.value); invalidate(); }} />}
              <div className={`validation-area ${validation ? validation.accepted ? 'is-accepted' : 'is-rejected' : ''}`} aria-live="polite">{!validation ? <div className="validation-placeholder"><ShieldCheck size={22} strokeWidth={1.5} /><div><strong>Does this result deserve the payment?</strong><p>Run the policy to find out. Nothing is paid yet.</p></div></div> : <><div className="verdict-heading"><span className={`verdict-icon ${validation.accepted ? 'pass' : 'fail'}`}>{validation.accepted ? <Check size={16} /> : <X size={16} />}</span><div><strong>{validation.accepted ? 'Accepted. Ready to settle.' : 'Rejected. Keep your budget.'}</strong><p>{validation.accepted ? 'The submitted result passes every policy check.' : 'The result failed your policy. No provider payment.'}</p></div><span className={`verdict-badge ${validation.accepted ? 'pass' : 'fail'}`}>{validation.checks.filter(c => c.passed).length}/{validation.checks.length} passed</span></div><div className="check-list">{validation.checks.map((check, i) => <div key={i} className="check-row"><span className={check.passed ? 'check-pass' : 'check-fail'}>{check.passed ? <Check size={13} /> : <X size={13} />}</span><span>{check.name}<small>{check.detail}</small></span><span className="check-status">{check.passed ? 'PASS' : 'FAIL'}</span></div>)}</div></> }</div>
              <div className="result-actions"><span>{validation ? 'Change any input to check again.' : 'Checks run locally · no gas required'}</span><button className="button primary" onClick={runChecks} disabled={checking || pending || !payloadText.trim()}>{checking ? <LoaderCircle size={15} className="spin" /> : <Play size={14} fill="currentColor" />}{validation ? 'Run again' : 'Run acceptance checks'}</button></div>
            </div>
          </section>
          <section className={`settlement-panel ${validation ? 'ready' : ''}`}><div className="settlement-intro"><div className="panel-icon"><ArrowDownLeft size={19} /></div><div><h3>From a checked result to a payment.</h3><p>{pending ? (progress || 'Confirm the reserve transaction, then settlement in your wallet.') : lastReceipt ? 'Confirmed on Monad. The payment now has a portable audit trail.' : 'Reserve the fee, commit the policy, then settle or return it.'}</p></div></div><div className="lifecycle"><div className={pending || lastReceipt ? 'current' : ''}><span>1</span>Reserve</div><i /><div className={validation ? 'current' : ''}><span>{validation ? <Check size={11} /> : '2'}</span>Check</div><i /><div className={lastReceipt ? 'current' : ''}><span>{lastReceipt ? <Check size={11} /> : '3'}</span>Settle</div></div><button className={`button dark ${validation && !validation.accepted ? 'refund-action' : ''}`} onClick={settle} disabled={!validation || pending || !!lastReceipt}>{pending ? <LoaderCircle className="spin" size={16} /> : lastReceipt ? <CheckCheck size={16} /> : <Wallet size={16} />}{pending ? (isDemoWallet ? 'Processing on Monad…' : 'Waiting for wallet…') : lastReceipt ? 'Settlement confirmed' : !wallet ? 'Connect to settle' : validation && !validation.accepted ? 'Keep payment protected' : 'Reserve & settle on Monad'}{!pending && !lastReceipt && <ArrowUpRight size={15} />}</button></section>
          {(isDemoWallet || (validation && !validation.accepted)) && <div className="settlement-disclosure">{isDemoWallet && <span><LockKeyhole size={12} /> Test wallet · key stored for this browser session only. Never send real assets.</span>}{validation && !validation.accepted && <span>Rejected flow: reserve → 15-second expiry → refund. Allow about 20 seconds and three confirmations.</span>}</div>}
          {validation && <div className="hash-strip"><Fingerprint size={14} /><span>Result commitment</span><code title={digest}>{short(digest)}</code><button aria-label="Copy full result hash" onClick={() => copy(digest, 'hash')}>{copied === 'hash' ? <Check size={13} /> : <Copy size={13} />}</button><span className="hash-note">Only hashes and payment metadata go onchain.</span></div>}
          <section className="recent-section"><div className="section-title"><div><span className="step-index">02</span><h2>A receipt for every outcome</h2></div><button className="text-link" onClick={() => setView('receipts')}>View all receipts <ArrowRight size={15} /></button></div>{receipts.length ? <ReceiptTable receipts={receipts.slice(0, 3)} onSelect={setSelectedReceipt} /> : <div className="empty-receipts"><div className="empty-icon"><ReceiptText size={23} strokeWidth={1.5} /></div><div><strong>Your first receipt starts here.</strong><p>Run a check and settle on Monad to create a verifiable payment record.</p></div><span>NO TRANSACTIONS YET</span></div>}</section>
          <div className="bottom-note"><ShieldCheck size={14} /><span>Monad testnet · Live listings are snapshots, not reservations · Sandbox fixtures are illustrative · Policy checks do not prove source claims.</span><span>Built by Shivam Gupta</span></div>
        </>}
        {view === 'receipts' && <><section className="page-heading"><div><div className="eyebrow"><span /> PORTABLE PAYMENT EVIDENCE</div><h1>Every outcome. On record<span>.</span></h1><p>Inspect the transactions behind your agent’s work.</p></div><button className="button outline" onClick={() => download(receipts, 'latch-receipts.json')} disabled={!receipts.length}><Download size={16} />Export receipts</button></section><div className="receipts-summary"><div className="panel-icon"><ReceiptText size={22} /></div><div><strong>{receipts.length} onchain {receipts.length === 1 ? 'receipt' : 'receipts'}</strong><p>This browser’s transaction history. Use the explorer to independently verify each record.</p></div></div>{receipts.length ? <ReceiptTable receipts={receipts} onSelect={setSelectedReceipt} /> : <div className="large-empty"><div className="empty-icon"><ReceiptText size={32} /></div><h2>Good work deserves a paper trail.</h2><p>Complete your first testnet settlement in the workbench.<br />Your result hash, outcome, and transaction will appear here.</p><button className="button primary" onClick={() => setView('workbench')}>Open workbench <ArrowRight size={16} /></button></div>}<div className="information-note"><CircleHelp size={17} /><p>Receipts in this view are saved locally, not a global usage count. Clearing your browser removes this list; confirmed transactions remain on Monad.</p></div></>}
        {view === 'developers' && <><section className="page-heading"><div><div className="eyebrow"><span /> AN ACCEPTANCE PRIMITIVE, NOT ANOTHER AGENT</div><h1>Your agent. Your rules<span>.</span></h1><p>A small settlement layer for applications that buy AI work.</p></div><a className="developer-tag" href="https://github.com/shi1720/latch-monad" target="_blank" rel="noreferrer"><Code2 size={16} />Source & SDK ↗</a></section><div className="developer-grid"><div><div className="panel developer-overview"><span className="request-label">HOW IT WORKS</span><h2>Turn “done” into<br />a payment condition.</h2><p>Agree on the policy before execution. Reserve a fee in escrow. Validate the delivered output, then explicitly accept or reject it.</p><div className="dev-step"><span>01</span><div><strong>Commit the rules</strong><p>A policy hash ties a job to the buyer’s acceptance criteria.</p></div></div><div className="dev-step"><span>02</span><div><strong>Check the result</strong><p>Schema, freshness, region, and price checks run in the buyer application.</p></div></div><div className="dev-step"><span>03</span><div><strong>Settle with evidence</strong><p>Accepted work pays the provider. Rejected work returns the escrow. Acceptance commits the result hash. Refunds preserve the policy commitment; rejected result hashes stay in local receipts.</p></div></div></div><div className="dev-trust"><ShieldCheck size={22} /><div><h3>Explicit about the trust boundary.</h3><p>Latch is buyer-authorized escrow. The contract does not execute the JavaScript validator or verify real-world quote accuracy. Providers rely on the buyer’s acceptance; timeouts prevent funds being locked forever.</p></div></div></div><div className="panel sdk-panel"><div className="panel-heading"><div className="panel-icon"><Code2 size={18} /></div><div><h3>Integration pattern</h3><p>Actual SDK exports · integration example</p></div><button className="copy-button" onClick={() => copy(sdk, 'sdk')}>{copied === 'sdk' ? <Check size={15} /> : <Copy size={15} />}{copied === 'sdk' ? 'Copied' : 'Copy'}</button></div><pre className="sdk-code"><code>{sdk}</code></pre><div className="sdk-footnote"><span className="live-dot" />EVM compatible · Native MON escrow · No token required</div><div className="developer-resources"><a href="https://github.com/shi1720/latch-monad/tree/main/sdk" target="_blank" rel="noreferrer">Browse the SDK <ArrowUpRight size={13} /></a><a href="https://github.com/shi1720/latch-monad/tree/main/docs" target="_blank" rel="noreferrer">Read the documentation <ArrowUpRight size={13} /></a></div></div></div><div className="integration-banner"><div><span className="eyebrow">THE FIRST USE CASE</span><h2>Start where bad outputs already cost money.</h2><p>GPU quote agents, paid data APIs, and structured research services. Integrate one acceptance policy before replacing an entire workflow.</p></div><button className="button dark" onClick={() => setView('workbench')}>Try the working flow <ArrowRight size={16} /></button></div></>}
        {selectedReceipt && <ReceiptDetails receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}
      </main>
      <footer className="main-footer"><span><Mark small /> Latch · Acceptance before settlement.</span><span>Built on Monad <ArrowUpRight size={12} /></span></footer>
    </div>
  </div>;
}
function ReceiptTable({ receipts, onSelect }: { receipts: Receipt[]; onSelect: (receipt: Receipt) => void }) { return <div className="receipt-table-wrap"><table className="receipt-table"><thead><tr><th>Job / result</th><th>Outcome</th><th>Test payment</th><th>Recorded</th><th>Evidence</th></tr></thead><tbody>{receipts.map((r, i) => { const accepted = r.accepted === true || /accept|settle/i.test(r.status); const date = new Date(r.createdAt); return <tr key={r.transactionHash + i}><td><div className="receipt-job"><span className="receipt-mini-icon"><FileCheck2 size={16} /></span><div><button className="receipt-details-trigger" title={r.key} onClick={() => onSelect(r)}>{short(r.key)}</button><code title={r.resultHash}>{r.resultHash ? short(r.resultHash) : 'GPU quote request'}</code></div></div></td><td><span className={`receipt-status ${accepted ? 'accepted' : 'refunded'}`}>{accepted ? <Check size={12} /> : <RotateCcw size={12} />}{accepted ? 'Provider credited' : 'Buyer refunded'}</span></td><td><strong className="receipt-amount">{r.amount || '0.001'} <span>MON</span></strong>{accepted && <small className="withdrawable-label">Withdrawable by provider</small>}</td><td className="date-cell">{Number.isNaN(date.getTime()) ? 'Confirmed' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<small>{Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString([], { day: 'numeric', month: 'short' })}</small></td><td><button className="receipt-inspect" onClick={() => onSelect(r)}>Inspect receipt <ArrowRight size={12} /></button><a className="explorer-link" href={`${EXPLORER}/tx/${r.transactionHash}`} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={14} /></a></td></tr>; })}</tbody></table></div>; }
export default App;

function ReceiptDetails({ receipt: r, onClose }: { receipt: Receipt; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copyState, setCopyState] = useState('');
  const accepted = /^(accepted|settled)$/i.test(r.status);
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function copyReceipt() { try { await navigator.clipboard.writeText(JSON.stringify(r, null, 2)); setCopyState('Copied'); } catch { setCopyState('Copy unavailable. Use export.'); } }
  const fields = [
    { label: 'Receipt key', value: r.key },
    { label: 'Request ID', value: r.requestId },
    { label: 'Policy commitment', value: r.policyHash },
    { label: accepted ? 'Result commitment, onchain' : 'Result digest, offchain only', value: r.resultHash },
    { label: 'Buyer', value: r.buyer, address: true },
    { label: 'Provider', value: r.provider, address: true },
    { label: 'Escrow contract', value: r.contract, address: true },
  ];
  let artifact: QuoteSnapshot | null = null;
  try { if (r.payload) artifact = parseQuoteSnapshot(r.payload); } catch { /* Older or sandbox receipts may not contain live provenance. */ }
  const transactions = [
    { label: 'Reserve payment', hash: r.reserveHash, description: 'Fee committed to escrow' },
    { label: accepted ? 'Accept result' : 'Refund escrow', hash: r.transactionHash, description: accepted ? 'Provider withdrawal credit created' : 'Buyer withdrawal credit created' },
    { label: accepted ? 'Provider withdrawal' : 'Buyer withdrawal', hash: r.withdrawalHash, description: accepted ? 'Only shown when recorded for this receipt' : 'Refund transferred back to the buyer' },
  ];
  return <dialog ref={dialog} className="receipt-dialog" aria-labelledby="receipt-dialog-title" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="receipt-dialog-content"><div className="receipt-dialog-heading"><div><div className="eyebrow"><span /> MONAD TESTNET RECEIPT</div><h2 id="receipt-dialog-title">The evidence behind the payment.</h2></div><button className="dialog-close" aria-label="Close receipt details" onClick={onClose} autoFocus><X size={19} /></button></div>
      <div className="receipt-detail-summary"><span className={`receipt-status ${accepted ? 'accepted' : 'refunded'}`}>{accepted ? <Check size={13} /> : <RotateCcw size={13} />}{accepted ? 'Provider credited' : 'Buyer refunded'}</span><strong>{r.amount} <span>testnet MON</span></strong><span>Chain ID {r.chainId || 10143}</span></div>
      <p className="receipt-detail-note">{accepted ? 'Acceptance creates a withdrawal credit for the provider. It does not prove the quote is true or that the provider has withdrawn its funds.' : 'The result was not accepted. The policy commitment and refund are onchain; the rejected result digest is saved only in this browser receipt.'}</p>
      {artifact && <div className="receipt-detail-section receipt-artifact"><h3>Purchased quote artifact</h3><div className="receipt-artifact-source"><span className="live-dot" /><strong>{artifact.source}</strong><span>Retrieved {new Date(artifact.retrievedAt).toLocaleString()}</span></div>{artifact.quotes.map(q=><div key={q.id} className="receipt-artifact-quote"><div><strong>{q.gpu}</strong><span>Offer {typeof q.sourceOfferId === 'string' ? q.sourceOfferId : q.id} · {q.location}</span></div><div className="receipt-artifact-prices"><strong>${q.priceUsdPerHour.toFixed(2)}<small> / GPU-hour</small></strong><span>{q.numGpus} GPUs · ${q.totalPriceUsdPerHour.toFixed(2)} / machine-hour</span></div><a href={q.sourceUrl} target="_blank" rel="noreferrer">Open Vast.ai marketplace <ArrowUpRight size={12} /></a></div>)}<p>Provider claims captured at retrieval. This receipt records a quote adapter payment, not a GPU rental. Availability and final charges must be verified on the marketplace.</p></div>}
      {r.payload !== undefined && <details className="receipt-raw-payload"><summary>Inspect original result JSON</summary><pre>{JSON.stringify(r.payload,null,2)}</pre></details>}
      <div className="receipt-detail-section"><h3>Commitments & participants</h3><dl>{fields.map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value ? f.address ? <a href={`${EXPLORER}/address/${f.value}`} target="_blank" rel="noreferrer"><code>{f.value}</code><ArrowUpRight size={12} /></a> : <code>{f.value}</code> : <span className="missing-evidence">Not recorded in this receipt</span>}</dd></div>)}</dl></div>
      <div className="receipt-detail-section"><h3>Transaction trail</h3><div className="transaction-trail">{transactions.map((tx, i) => <div key={tx.label}><span className={`trail-number ${tx.hash ? 'confirmed' : ''}`}>{tx.hash ? <Check size={12} /> : i + 1}</span><div><strong>{tx.label}</strong><p>{tx.description}</p>{tx.hash ? <a href={`${EXPLORER}/tx/${tx.hash}`} target="_blank" rel="noreferrer"><code>{tx.hash}</code><ArrowUpRight size={13} /></a> : <span className="missing-evidence">No transaction recorded</span>}</div></div>)}</div></div>
      <div className="receipt-dialog-actions"><span role="status">{copyState === 'Copy unavailable. Use export.' ? copyState : 'Independently verifiable on Monad.'}</span><button className="button outline" onClick={copyReceipt}>{copyState === 'Copied' ? <Check size={14} /> : <Copy size={14} />}{copyState === 'Copied' ? 'Copied' : 'Copy receipt'}</button><button className="button primary" onClick={() => download(r, `latch-receipt-${r.key.slice(2, 10)}.json`)}><Download size={14} />Export JSON</button></div>
    </div>
  </dialog>;
}

function LiveOffers({ onSelect, onRegions, disabled, selectedId }: { onSelect: (quote: LiveQuote, snapshot: QuoteSnapshot) => void; onRegions: (regions: string[]) => void; disabled: boolean; selectedId?: string }) {
  const [snapshot, setSnapshot] = useState<QuoteSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [country, setCountry] = useState('any');
  const [ceiling, setCeiling] = useState('4');
  const [limit, setLimit] = useState(6);
  const [clock, setClock] = useState(Date.now());
  const request = useRef<AbortController | null>(null);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => { clearInterval(timer); request.current?.abort(); }; }, []);
  const countries = useMemo(() => snapshot ? [...new Set(snapshot.quotes.map(q => q.region))].sort((a,b) => countryLabel(a).localeCompare(countryLabel(b))) : [], [snapshot]);
  const offers = useMemo(() => (snapshot?.quotes || []).filter(q => (country === 'any' || q.region === country) && (ceiling === '' || q.priceUsdPerHour <= Number(ceiling))).sort((a,b) => a.priceUsdPerHour - b.priceUsdPerHour || a.totalPriceUsdPerHour - b.totalPriceUsdPerHour), [snapshot, country, ceiling]);
  const sourceCache = snapshot?.cache && typeof snapshot.cache === 'object' ? snapshot.cache as {hit?: boolean; ttlSeconds?: number} : null;
  const age = snapshot ? Math.max(0, Math.floor((clock - Date.parse(snapshot.retrievedAt)) / 1000)) : 0;
  async function fetchQuotes() {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setFetchError(''); let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
    try {
      const response = await fetch('/api/quotes', { signal: controller.signal, headers:{Accept:'application/json'}, cache:'no-store' });
      if (!response.ok) { let message = ''; try { const body = await response.json(); message = typeof body.error === 'string' ? body.error.slice(0, 200) : ''; } catch { /* Show HTTP status if no JSON error exists. */ } throw new Error(message || `The live quote service returned HTTP ${response.status}. Please retry.`); }
      const next = parseQuoteSnapshot(await response.json());
      if (request.current !== controller) return;
      setSnapshot(next); setClock(Date.now()); setLimit(6); onRegions([...new Set(next.quotes.map(q=>q.region))].sort());
      if (country !== 'any' && !next.quotes.some(q=>q.region === country)) setCountry('any');
    } catch (e) { if (request.current !== controller) return; if (controller.signal.aborted && !timedOut) return; setFetchError(timedOut ? 'The source took too long to respond. Retry to request a new live snapshot.' : e instanceof Error ? e.message : 'Could not retrieve live quotes. Please retry.'); }
    finally { clearTimeout(timeout); if (request.current === controller) { setLoading(false); request.current = null; } }
  }
  return <section className="live-offers panel" aria-labelledby="live-offers-title"><div className="live-offers-heading"><div className="panel-icon"><Terminal size={19} /></div><div><div className="eyebrow">LIVE COMPUTE DISCOVERY</div><h2 id="live-offers-title">Find the quote worth accepting.</h2><p>Browse actual H100 offers. Inspect the source. Pay only for a checked result.</p></div><button className="button primary" onClick={fetchQuotes} disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <RotateCcw size={15} />}{loading ? 'Fetching live quotes…' : snapshot ? 'Refresh live quotes' : 'Fetch live quotes'}</button></div>
    {fetchError && <div className="live-fetch-error" role="alert"><CircleHelp size={16} /><div><strong>Live quotes unavailable.</strong><p>{fetchError}{snapshot ? ' The previous snapshot remains below; it was not refreshed.' : ' No sample data has been substituted.'}</p></div><button onClick={fetchQuotes} disabled={loading}>Retry <RotateCcw size={12} /></button></div>}
    {!snapshot ? <div className="live-empty"><div><span className="live-source-icon"><Layers3 size={23} strokeWidth={1.5} /></span><div><strong>A real source, not a seeded price table.</strong><p>Fetch current listings from Vast.ai, choose one offer, then check its price, region, and retrieval age against your policy.</p></div></div><span className="source-chip">SOURCE <strong>Vast.ai</strong><ArrowUpRight size={12} /></span></div> : <>
      <div className="live-toolbar"><div className="source-provenance"><span className="live-dot" /><strong>{snapshot.source}</strong><span>Retrieved {age < 60 ? `${age}s` : `${Math.floor(age/60)}m ${age%60}s`} ago</span>{sourceCache?.hit && <span className="source-cache-label">Cached snapshot</span>}<time dateTime={snapshot.retrievedAt} title={snapshot.retrievedAt}>{new Date(snapshot.retrievedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time><button className="export-quotes" onClick={() => download(snapshot,'latch-live-quotes.json')} aria-label="Export live quote snapshot"><Download size={13} /></button></div><div className="live-filters"><label htmlFor="offer-country">Country<select aria-label="Country" id="offer-country" value={country} onChange={e=>{setCountry(e.target.value);setLimit(6);}}><option value="any">All countries</option>{countries.map(code=><option key={code} value={code}>{countryLabel(code)}</option>)}</select></label><label htmlFor="offer-price">Max /GPU-hour<div><span>$</span><input aria-label="Max /GPU-hour" id="offer-price" type="number" min="0" step="0.25" placeholder="Any" value={ceiling} onChange={e=>{setCeiling(e.target.value);setLimit(6);}} /></div></label></div></div>
      <div className="offer-results-heading"><span>{offers.length} {offers.length === 1 ? 'offer' : 'offers'} match your filters <small>of {snapshot.quotes.length} retrieved</small></span><span>Lowest per-GPU price first</span></div>
      {offers.length ? <div className="offer-grid">{offers.slice(0,limit).map((q,i)=><article className={`offer-card ${selectedId === q.id ? 'selected' : ''}`} key={`${q.id}-${i}`}><div className="offer-card-top"><span>H100 <small>80GB</small></span><span className="offer-gpu-count">{q.numGpus} {q.numGpus === 1 ? 'GPU' : 'GPUs'} / machine</span></div><div className="offer-price"><strong>${q.priceUsdPerHour.toFixed(2)}</strong><span>per GPU / hour</span></div><div className="offer-machine-price"><span>Full machine</span><strong>${q.totalPriceUsdPerHour.toFixed(2)} <small>/ hr</small></strong></div><div className="offer-id">OFFER <code>{typeof q.sourceOfferId === 'string' ? q.sourceOfferId : q.id}</code><span>Find this ID on the marketplace</span></div><div className="offer-location"><span className="tiny-square" /><strong>{countryLabel(q.region)}</strong><span title={q.location}>{q.location}</span></div><div className="offer-card-actions"><a href={q.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View Vast.ai offer ${q.id}`}>Marketplace <ArrowUpRight size={12} /></a><button className={selectedId === q.id ? 'offer-selected' : ''} onClick={()=>onSelect(q,snapshot)} disabled={disabled}>{selectedId === q.id ? <Check size={12} /> : <ArrowRight size={12} />}{selectedId === q.id ? 'Selected' : 'Use this quote'}</button></div></article>)}</div> : <div className="no-live-matches"><CircleHelp size={22} /><strong>{snapshot.quotes.length ? 'No offers match these filters.' : 'The source returned no H100 offers.'}</strong><p>{snapshot.quotes.length ? 'Try another country or increase the display price ceiling. Your acceptance policy remains separate.' : 'Live availability changes. Refresh to request a new snapshot; no offers are invented.'}</p>{snapshot.quotes.length > 0 && <button className="text-link" onClick={()=>{setCountry('any');setCeiling('');}}>Show all retrieved offers <ArrowRight size={13} /></button>}</div>}
      {offers.length > limit && <button className="show-more-offers" onClick={()=>setLimit(n=>n+6)}>Show {Math.min(6,offers.length-limit)} more offers <ArrowDownLeft size={13} /></button>}
    </>}
    <div className="live-offers-disclosure"><ShieldCheck size={15} /><p>Listings are availability snapshots, not reservations. Freshness measures Latch’s retrieval time, not the provider’s last update. Usage-dependent charges, taxes, and final billing may differ. Verify final terms on Vast.ai. The 0.001 testnet MON settlement pays the Latch quote adapter; it does not rent a GPU.</p></div>
    {disabled && <div className="live-selection-locked"><LockKeyhole size={12} />Active purchase protected. Keep the original result and policy, connect the same wallet, run checks, and retry settlement before starting another purchase.</div>}
  </section>;
}
