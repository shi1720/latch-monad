import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchLiveQuote} from '../sdk/quotes.ts';
const quote=(id:string,region:string,price:number)=>({id,gpu:'NVIDIA H100 80GB',region,location:`Location, ${region}`,priceUsdPerHour:price,totalPriceUsdPerHour:price*4,numGpus:4,observedAt:new Date().toISOString(),sourceUrl:'https://cloud.vast.ai/'});
const snapshot=()=>{const time=new Date().toISOString();return ({source:'Vast.ai',retrievedAt:time,observedAtBasis:'proxy-retrieval-time',quotes:[quote('expensive','US',9),quote('cheap','CZ',2),quote('target','US',3)].map(q=>({...q,observedAt:time}))})};
const policy={region:'US',maxPriceUsd:4,maxAgeSeconds:300};
test('live adapter selects cheapest conforming exact-country offer and preserves provenance',async()=>{const result=await fetchLiveQuote(policy,'https://example.test',async()=>Response.json(snapshot()));assert.equal(result.quotes[0].id,'target');assert.equal(result.observedAtBasis,'proxy-retrieval-time');assert.equal(result.quotes[0].totalPriceUsdPerHour,12)});
test('live adapter refuses source failures, stale data, malformed data and absent matches without sample fallback',async()=>{await assert.rejects(fetchLiveQuote(policy,'https://example.test',async()=>new Response('',{status:503})),/HTTP 503/);for(const data of [{bad:true},{...snapshot(),quotes:[]},{...snapshot(),quotes:[{...quote('old','US',2),observedAt:'2020-01-01T00:00:00Z'}]}])await assert.rejects(fetchLiveQuote(policy,'https://example.test',async()=>Response.json(data)));});

test('live policy rejects inconsistent machine prices and retrieval timestamps',async()=>{for(const patch of [{totalPriceUsdPerHour:100},{observedAt:'2026-01-01T00:00:00Z'}]){const d=snapshot();d.quotes=[{...d.quotes[2],...patch}];await assert.rejects(fetchLiveQuote(policy,'https://example.test',async()=>Response.json(d)));}});
