import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, CircleHelp, Code2, Copy, Download, FileCheck2, Fingerprint, Layers3, LoaderCircle, LockKeyhole, Menu, Play, ReceiptText, RotateCcw, ShieldCheck, Terminal, Wallet, X } from 'lucide-react';
import { canonicalHash, makeSample, validateResult } from './policy';
import './style.css';

type Policy = { maxAgeSeconds: number; maxPriceUsd: number; region: string };
type Validation = ReturnType<typeof validateResult>;
type Receipt = { key: string; hash?: string; resultHash?: string; transactionHash: string; amount: string; status: string; createdAt: string | number; accepted?: boolean };
type View = 'workbench' | 'receipts' | 'developers';
type Mode = 'valid' | 'stale' | 'malformed';
const EXPLORER = 'https://testnet.monadscan.com';
const short = (s: string) => s.length > 18 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s;
const loadReceipts = (): Receipt[] => { try { const stored = JSON.parse(localStorage.getItem('latch-receipts') || '[]'); return Array.isArray(stored) ? stored.filter(r => r && typeof r.transactionHash === 'string' && typeof r.key === 'string') : []; } catch { return []; } };
const download = (data: unknown, filename: string) => { const u = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = u; a.download = filename; a.click(); URL.revokeObjectURL(u); };

function Mark({ small = false }: { small?: boolean }) { return <span className={`latch-mark ${small ? 'small' : ''}`} aria-hidden="true"><span /><span /></span>; }
function App() {
  const [view, setView] = useState<View>('workbench');
  const [mode, setMode] = useState<Mode>('valid');
  const [payloadText, setPayloadText] = useState(() => JSON.stringify(makeSample('valid'), null, 2));
  const [policy, setPolicy] = useState<Policy>({ maxAgeSeconds: 300, maxPriceUsd: 4, region: 'us-east' });
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
    const onReceipt = (event: Event) => { const d = (event as CustomEvent).detail as Receipt; if (!d || !d.transactionHash) return; const next = { ...d, createdAt: d.createdAt || Date.now() }; setReceipts(old => [next, ...old.filter(r => r.transactionHash !== next.transactionHash)].slice(0, 100)); setLastReceipt(next); setPending(false); setNotice('Settlement confirmed. Your receipt is ready to inspect.'); setProgress(''); };
    const onProgress = (event: Event) => { setProgress((event as CustomEvent).detail?.message || 'Waiting for confirmation…'); };
    const onError = (event: Event) => { setError((event as CustomEvent).detail?.message || 'The transaction could not be completed. Try again.'); setPending(false); setConnecting(false); };
    window.addEventListener('latch-progress', onProgress); window.addEventListener('latch-wallet', onWallet); window.addEventListener('latch-receipt', onReceipt); window.addEventListener('latch-error', onError);
    return () => { window.removeEventListener('latch-progress', onProgress); window.removeEventListener('latch-wallet', onWallet); window.removeEventListener('latch-receipt', onReceipt); window.removeEventListener('latch-error', onError); };
  }, []);
  useEffect(() => { localStorage.setItem('latch-receipts', JSON.stringify(receipts)); }, [receipts]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(t); }, [notice]);
  const acceptedReceipts = useMemo(() => receipts.filter(r => r.status.toLowerCase().includes('accept') || r.status.toLowerCase().includes('settle') || r.accepted === true), [receipts]);
  const invalidate = () => { setValidation(null); setDigest(''); setLastReceipt(null); setError(''); };
  const chooseSample = (next: Mode) => { setMode(next); setPayloadText(JSON.stringify(makeSample(next), null, 2)); invalidate(); };
  const updatePolicy = (key: keyof Policy, value: string) => { setPolicy(p => ({ ...p, [key]: key === 'region' ? value : Number(value) })); invalidate(); };
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
  region: 'us-east',
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
      <div className="workspace-label"><span className="workspace-avatar">SG</span><div>Shivam’s workspace<small>Builder edition</small></div><span className="workspace-dot" /></div>
      <div className="nav-caption">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{nav.map(({ id, icon: Icon, label }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => { setView(id); setMenu(false); }}><Icon size={18} strokeWidth={1.7} /><span>{label}</span>{id === 'receipts' && receipts.length > 0 && <span className="nav-count">{receipts.length}</span>}{view === id && <span className="nav-active-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><ShieldCheck size={23} strokeWidth={1.4} /><h3>Trust the condition.<br />Verify the payment.</h3><p>Every settlement leaves a receipt you can take anywhere.</p><button onClick={() => setView('developers')}>How Latch works <ArrowUpRight size={15} /></button></div><div className="sidebar-footer"><span className="live-dot" /> Monad testnet<span>v0.1</span></div></div>
    </aside>
    {menu && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenu(false)} />}
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><button className="mobile-menu" onClick={() => setMenu(!menu)} aria-label="Open navigation"><Menu size={20} /></button><span>Workspace</span><ChevronRight size={14} /><strong>{view === 'workbench' ? 'Acceptance workbench' : view === 'receipts' ? 'Settlement receipts' : 'Developer kit'}</strong></div><div className="topbar-actions"><span className="network-pill"><span className="live-dot" />Monad testnet</span><button title="Connect your wallet, or create a test-only wallet in this browser session" className={`wallet-button ${wallet ? 'connected' : ''}`} onClick={connect} disabled={connecting || pending}>{connecting ? <LoaderCircle size={15} className="spin" /> : <Wallet size={15} />}<span>{connecting ? 'Connecting…' : wallet ? short(wallet) : 'Connect wallet'}</span>{wallet && <span className="live-dot" />}</button></div></header>
      <main>
        {error && <div className="alert error" role="alert"><CircleHelp size={18} /><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}
        {notice && <div className="alert success" role="status"><Check size={18} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16} /></button></div>}
        {view === 'workbench' && <>
          <section className="page-heading"><div><div className="eyebrow"><span /> THE ACCEPTANCE LAYER FOR AI WORK</div><h1>Pay for checked results<span>.</span></h1><p>Your agent has a budget. Give it a definition of done.</p></div><div className="hero-seal"><Fingerprint size={30} strokeWidth={1.3} /><span>CHECK FIRST.<br /><strong>SETTLE SECOND.</strong></span></div></section>
          <section className="metrics" aria-label="Workspace activity"><div className="metric"><span>Checks this session<Layers3 size={15} /></span><strong>{runCount.toString().padStart(2, '0')}</strong><small>Run locally against your policy</small></div><div className="metric"><span>Onchain receipts<FileCheck2 size={15} /></span><strong>{receipts.length.toString().padStart(2, '0')}</strong><small>Saved in this browser</small></div><div className="metric"><span>Accepted payments<ArrowUpRight size={15} /></span><strong>{acceptedReceipts.length.toString().padStart(2, '0')}</strong><small>Confirmed testnet settlements</small></div><div className="metric accent"><span>Settlement network<LockKeyhole size={15} /></span><strong>Monad <span>↗</span></strong><small>Testnet · no real-money payments</small></div></section>
          <div className="section-title"><div><span className="step-index">01</span><h2>Define what earns the payment</h2></div><span className="small-muted">A real policy. A testnet payment.</span></div>
          <section className="workbench-grid">
            <div className="panel request-panel"><div className="panel-heading"><div className="panel-icon"><Terminal size={18} /></div><div><h3>GPU quote request</h3><p>An agent buys a structured price quote</p></div><span className="sample-badge">Sample data</span></div>
              <div className="request-summary"><span className="request-label">THE JOB</span><p>Find an H100 hourly quote in <strong>{policy.region || 'your region'}</strong>, within the price ceiling, with a fresh timestamp.</p><div className="job-meta"><span><span className="tiny-square" /> Structured JSON</span><span>One result → one receipt</span></div></div>
              <div className="policy-form"><div className="form-heading"><h4>Acceptance policy</h4><span>Buyer defined</span></div><label htmlFor="region">Compute region</label><select id="region" value={policy.region} disabled={pending} onChange={e => updatePolicy('region', e.target.value)}><option value="us-east">US East · us-east</option><option value="eu-west">Europe West · eu-west</option><option value="ap-south">Asia Pacific · ap-south</option></select><div className="field-row"><div><label htmlFor="max-price">Price ceiling</label><div className="input-with-unit"><span>$</span><input id="max-price" type="number" min="0.01" step="0.25" value={policy.maxPriceUsd} disabled={pending} onChange={e => updatePolicy('maxPriceUsd', e.target.value)} /><span>/ hr</span></div></div><div><label htmlFor="max-age">Maximum age</label><div className="input-with-unit"><input id="max-age" type="number" min="1" max="86400" step="30" value={policy.maxAgeSeconds} disabled={pending} onChange={e => updatePolicy('maxAgeSeconds', e.target.value)} /><span>sec</span></div></div></div><div className="payment-budget"><div><span>Test payment</span><strong>0.001 <small>MON</small></strong></div><span className="budget-tag">Escrowed onchain</span></div></div>
              <div className="trust-note"><LockKeyhole size={15} /><p>The contract enforces who gets paid. The buyer is responsible for validating the result.</p></div>
            </div>
            <div className="panel result-panel"><div className="panel-heading"><div className="panel-icon"><Code2 size={18} /></div><div><h3>Put the result to the test</h3><p>Try a happy path. Then break it.</p></div><span className="live-label"><span className="live-dot" />Interactive</span></div><div className="scenario-picker" role="group" aria-label="Sample result scenario">{([{ key: 'valid', label: 'Valid quote' }, { key: 'stale', label: 'Stale result' }, { key: 'malformed', label: 'Malformed payload' }] as { key: Mode; label: string }[]).map(s => <button key={s.key} className={mode === s.key ? 'selected' : ''} onClick={() => chooseSample(s.key)} disabled={pending}>{s.key === 'valid' && <span className="live-dot" />}{s.label}</button>)}</div><div className="code-label"><span><span className="file-dot" />agent-result.json</span><div><button onClick={() => chooseSample(mode)} disabled={pending} title="Regenerate sample with a current timestamp" aria-label="Refresh sample"><RotateCcw size={13} /></button><button aria-label={resultOpen ? 'Collapse JSON editor' : 'Expand JSON editor'} onClick={() => setResultOpen(!resultOpen)}>{resultOpen ? 'Collapse' : 'Expand'}</button></div></div>{resultOpen && <textarea className="json-editor" aria-label="Agent result JSON" spellCheck={false} value={payloadText} disabled={pending} onChange={e => { setPayloadText(e.target.value); invalidate(); }} />}
              <div className={`validation-area ${validation ? validation.accepted ? 'is-accepted' : 'is-rejected' : ''}`} aria-live="polite">{!validation ? <div className="validation-placeholder"><ShieldCheck size={22} strokeWidth={1.5} /><div><strong>Does this result deserve the payment?</strong><p>Run the policy to find out. Nothing is paid yet.</p></div></div> : <><div className="verdict-heading"><span className={`verdict-icon ${validation.accepted ? 'pass' : 'fail'}`}>{validation.accepted ? <Check size={16} /> : <X size={16} />}</span><div><strong>{validation.accepted ? 'Accepted. Ready to settle.' : 'Rejected. Keep your budget.'}</strong><p>{validation.accepted ? 'The submitted result passes every policy check.' : 'The result failed your policy. No provider payment.'}</p></div><span className={`verdict-badge ${validation.accepted ? 'pass' : 'fail'}`}>{validation.checks.filter(c => c.passed).length}/{validation.checks.length} passed</span></div><div className="check-list">{validation.checks.map((check, i) => <div key={i} className="check-row"><span className={check.passed ? 'check-pass' : 'check-fail'}>{check.passed ? <Check size={13} /> : <X size={13} />}</span><span>{check.name}<small>{check.detail}</small></span><span className="check-status">{check.passed ? 'PASS' : 'FAIL'}</span></div>)}</div></> }</div>
              <div className="result-actions"><span>{validation ? 'Change any input to check again.' : 'Checks run locally · no gas required'}</span><button className="button primary" onClick={runChecks} disabled={checking || pending}>{checking ? <LoaderCircle size={15} className="spin" /> : <Play size={14} fill="currentColor" />}{validation ? 'Run again' : 'Run acceptance checks'}</button></div>
            </div>
          </section>
          <section className={`settlement-panel ${validation ? 'ready' : ''}`}><div className="settlement-intro"><div className="panel-icon"><ArrowDownLeft size={19} /></div><div><h3>From a checked result to a payment.</h3><p>{pending ? (progress || 'Confirm the reserve transaction, then settlement in your wallet.') : lastReceipt ? 'Confirmed on Monad. The payment now has a portable audit trail.' : 'Reserve the fee, commit the policy, then settle or return it.'}</p></div></div><div className="lifecycle"><div className={pending || lastReceipt ? 'current' : ''}><span>1</span>Reserve</div><i /><div className={validation ? 'current' : ''}><span>{validation ? <Check size={11} /> : '2'}</span>Check</div><i /><div className={lastReceipt ? 'current' : ''}><span>{lastReceipt ? <Check size={11} /> : '3'}</span>Settle</div></div><button className={`button dark ${validation && !validation.accepted ? 'refund-action' : ''}`} onClick={settle} disabled={!validation || pending || !!lastReceipt}>{pending ? <LoaderCircle className="spin" size={16} /> : lastReceipt ? <CheckCheck size={16} /> : <Wallet size={16} />}{pending ? 'Waiting for wallet…' : lastReceipt ? 'Settlement confirmed' : !wallet ? 'Connect to settle' : validation && !validation.accepted ? 'Keep payment protected' : 'Reserve & settle on Monad'}{!pending && !lastReceipt && <ArrowUpRight size={15} />}</button></section>
          {(isDemoWallet || (validation && !validation.accepted)) && <div className="settlement-disclosure">{isDemoWallet && <span><LockKeyhole size={12} /> Test wallet · key stored for this browser session only. Never send real assets.</span>}{validation && !validation.accepted && <span>Rejected flow: reserve → 15-second expiry → refund. Allow about 20 seconds and two confirmations.</span>}</div>}
          {validation && <div className="hash-strip"><Fingerprint size={14} /><span>Result commitment</span><code title={digest}>{short(digest)}</code><button aria-label="Copy full result hash" onClick={() => copy(digest, 'hash')}>{copied === 'hash' ? <Check size={13} /> : <Copy size={13} />}</button><span className="hash-note">Only hashes and payment metadata go onchain.</span></div>}
          <section className="recent-section"><div className="section-title"><div><span className="step-index">02</span><h2>A receipt for every outcome</h2></div><button className="text-link" onClick={() => setView('receipts')}>View all receipts <ArrowRight size={15} /></button></div>{receipts.length ? <ReceiptTable receipts={receipts.slice(0, 3)} /> : <div className="empty-receipts"><div className="empty-icon"><ReceiptText size={23} strokeWidth={1.5} /></div><div><strong>Your first receipt starts here.</strong><p>Run a check and settle on Monad to create a verifiable payment record.</p></div><span>NO TRANSACTIONS YET</span></div>}</section>
          <div className="bottom-note"><ShieldCheck size={14} /><span>Testnet prototype · Sample quotes are not verified market data · Policy checks do not prove a provider’s claims are true.</span><span>Built by Shivam Gupta</span></div>
        </>}
        {view === 'receipts' && <><section className="page-heading"><div><div className="eyebrow"><span /> PORTABLE PAYMENT EVIDENCE</div><h1>Every outcome. On record<span>.</span></h1><p>Inspect the transactions behind your agent’s work.</p></div><button className="button outline" onClick={() => download(receipts, 'latch-receipts.json')} disabled={!receipts.length}><Download size={16} />Export receipts</button></section><div className="receipts-summary"><div className="panel-icon"><ReceiptText size={22} /></div><div><strong>{receipts.length} onchain {receipts.length === 1 ? 'receipt' : 'receipts'}</strong><p>This browser’s transaction history. Use the explorer to independently verify each record.</p></div></div>{receipts.length ? <ReceiptTable receipts={receipts} /> : <div className="large-empty"><div className="empty-icon"><ReceiptText size={32} /></div><h2>Good work deserves a paper trail.</h2><p>Complete your first testnet settlement in the workbench.<br />Your result hash, outcome, and transaction will appear here.</p><button className="button primary" onClick={() => setView('workbench')}>Open workbench <ArrowRight size={16} /></button></div>}<div className="information-note"><CircleHelp size={17} /><p>Receipts in this view are saved locally, not a global usage count. Clearing your browser removes this list; confirmed transactions remain on Monad.</p></div></>}
        {view === 'developers' && <><section className="page-heading"><div><div className="eyebrow"><span /> AN ACCEPTANCE PRIMITIVE, NOT ANOTHER AGENT</div><h1>Your agent. Your rules<span>.</span></h1><p>A small settlement layer for applications that buy AI work.</p></div><span className="developer-tag"><Code2 size={16} />Developer preview</span></section><div className="developer-grid"><div><div className="panel developer-overview"><span className="request-label">HOW IT WORKS</span><h2>Turn “done” into<br />a payment condition.</h2><p>Agree on the policy before execution. Reserve a fee in escrow. Validate the delivered output, then explicitly accept or reject it.</p><div className="dev-step"><span>01</span><div><strong>Commit the rules</strong><p>A policy hash ties a job to the buyer’s acceptance criteria.</p></div></div><div className="dev-step"><span>02</span><div><strong>Check the result</strong><p>Schema, freshness, region, and price checks run in the buyer application.</p></div></div><div className="dev-step"><span>03</span><div><strong>Settle with evidence</strong><p>Accepted work pays the provider. Rejected work returns the escrow. Acceptance commits the result hash. Refunds preserve the policy commitment; rejected result hashes stay in local receipts.</p></div></div></div><div className="dev-trust"><ShieldCheck size={22} /><div><h3>Explicit about the trust boundary.</h3><p>Latch is buyer-authorized escrow. The contract does not execute the JavaScript validator or verify real-world quote accuracy. Providers rely on the buyer’s acceptance; timeouts prevent funds being locked forever.</p></div></div></div><div className="panel sdk-panel"><div className="panel-heading"><div className="panel-icon"><Code2 size={18} /></div><div><h3>Integration pattern</h3><p>Actual SDK exports · integration example</p></div><button className="copy-button" onClick={() => copy(sdk, 'sdk')}>{copied === 'sdk' ? <Check size={15} /> : <Copy size={15} />}{copied === 'sdk' ? 'Copied' : 'Copy'}</button></div><pre className="sdk-code"><code>{sdk}</code></pre><div className="sdk-footnote"><span className="live-dot" />EVM compatible · Native MON escrow · No token required</div></div></div><div className="integration-banner"><div><span className="eyebrow">THE FIRST USE CASE</span><h2>Start where bad outputs already cost money.</h2><p>GPU quote agents, paid data APIs, and structured research services. Integrate one acceptance policy before replacing an entire workflow.</p></div><button className="button dark" onClick={() => setView('workbench')}>Try the working flow <ArrowRight size={16} /></button></div></>}
      </main>
      <footer className="main-footer"><span><Mark small /> Latch · Acceptance before settlement.</span><span>Built on Monad <ArrowUpRight size={12} /></span></footer>
    </div>
  </div>;
}
function ReceiptTable({ receipts }: { receipts: Receipt[] }) { return <div className="receipt-table-wrap"><table className="receipt-table"><thead><tr><th>Job / result</th><th>Outcome</th><th>Test payment</th><th>Recorded</th><th>Evidence</th></tr></thead><tbody>{receipts.map((r, i) => { const accepted = r.accepted === true || /accept|settle/i.test(r.status); const date = new Date(r.createdAt); return <tr key={r.transactionHash + i}><td><div className="receipt-job"><span className="receipt-mini-icon"><FileCheck2 size={16} /></span><div><strong title={r.key}>{short(r.key)}</strong><code title={r.resultHash}>{r.resultHash ? short(r.resultHash) : 'GPU quote request'}</code></div></div></td><td><span className={`receipt-status ${accepted ? 'accepted' : 'refunded'}`}>{accepted ? <Check size={12} /> : <RotateCcw size={12} />}{accepted ? 'Provider credited' : 'Buyer refunded'}</span></td><td><strong className="receipt-amount">{r.amount || '0.001'} <span>MON</span></strong>{accepted && <small className="withdrawable-label">Withdrawable by provider</small>}</td><td className="date-cell">{Number.isNaN(date.getTime()) ? 'Confirmed' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<small>{Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString([], { day: 'numeric', month: 'short' })}</small></td><td><a className="explorer-link" href={`${EXPLORER}/tx/${r.transactionHash}`} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={14} /></a></td></tr>; })}</tbody></table></div>; }
export default App;
