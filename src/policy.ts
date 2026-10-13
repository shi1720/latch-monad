import {keccak256,toHex} from 'viem';
export type Policy={maxAgeSeconds:number;maxPriceUsd:number;region:string};
export type Check={name:string;passed:boolean;detail:string};
export function validateResult(payload:unknown,policy:Policy,nowMs=Date.now()) {
 const p=payload as any; const validPolicy=Number.isFinite(policy.maxAgeSeconds)&&policy.maxAgeSeconds>0&&Number.isFinite(policy.maxPriceUsd)&&policy.maxPriceUsd>0&&!!policy.region;
 const schema=!!p&&typeof p==='object'&&typeof p.source==='string'&&Array.isArray(p.quotes)&&p.quotes.length>0&&p.quotes.length<=100&&p.quotes.every((q:any)=>q&&typeof q.id==='string'&&q.id.length>0&&typeof q.gpu==='string'&&typeof q.region==='string'&&typeof q.observedAt==='string'&&Number.isFinite(q.priceUsdPerHour)&&q.priceUsdPerHour>0);
 const checks:Check[]=[{name:'Schema & unique records',passed:schema&&new Set(p.quotes.map((q:any)=>q.id)).size===p.quotes.length,detail:schema?'Required fields, finite prices, nonempty records, unique IDs.':'Missing or invalid quote fields.'},{name:'Freshness window',passed:schema&&p.quotes.every((q:any)=>{const age=nowMs-Date.parse(q.observedAt);return Number.isFinite(age)&&age>=-5000&&age<=policy.maxAgeSeconds*1000}),detail:`Every observation must be within ${policy.maxAgeSeconds}s; timestamps are supplier claims.`},{name:'H100, region & price ceiling',passed:validPolicy&&schema&&p.quotes.every((q:any)=>q.gpu==='NVIDIA H100 80GB'&&q.region===policy.region&&q.priceUsdPerHour<=policy.maxPriceUsd),detail:`NVIDIA H100 80GB, ${policy.region}, at most $${policy.maxPriceUsd}/GPU-hour.`}];
 const accepted=validPolicy&&checks.every(x=>x.passed);return {accepted,checks,reason:accepted?undefined:checks.filter(x=>!x.passed).map(x=>x.name).join(', ')};
}
export function makeSample(mode:'valid'|'stale'|'malformed') {return {source:'Latch sample supplier: illustrative quotes, not a live market feed',quotes:[{id:'quote-h100-01',gpu:'NVIDIA H100 80GB',region:'us-east',priceUsdPerHour:2.45,observedAt:new Date(Date.now()-(mode==='stale'?3600000:1000)).toISOString()},...(mode==='malformed'?[{id:'quote-h100-02',gpu:'NVIDIA H100',region:'us-east',priceUsdPerHour:'unknown'}]:[])]};}
function stable(v:any):any {if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
export function canonicalJSON(value:unknown){return JSON.stringify(stable(value));}
export async function canonicalHash(value:unknown):Promise<`0x${string}`>{return keccak256(toHex(canonicalJSON(value)));}
