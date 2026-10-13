import fs from 'node:fs';
import {createPublicClient,http,parseEther} from 'viem';
import {monadTestnet} from 'viem/chains';
import {canonicalHash} from '../src/policy.ts';
const path=process.argv[2] || 'public/live-pricing-evidence.json';
const evidence=JSON.parse(fs.readFileSync(path,'utf8'));
const abi=JSON.parse(fs.readFileSync('public/abi.json','utf8'));
const reader=createPublicClient({chain:monadTestnet,transport:http()});
for(const r of evidence.receipts){
 const job=await reader.readContract({address:r.contract,abi,functionName:'jobs',args:[r.key]}) as any;
 if(job[0].toLowerCase()!==r.buyer.toLowerCase()||job[1].toLowerCase()!==r.provider.toLowerCase()||job[2]!==parseEther(r.amount)||job[3]!==await canonicalHash(r.policy)||Number(job[6])!==(r.status==='Accepted'?2:3))throw Error('Receipt terms/state mismatch');
 if(r.status==='Accepted'&&(r.payload.source!=='Vast.ai'||job[4]!==await canonicalHash(r.payload)))throw Error('Live artifact commitment mismatch');
 for(const hash of [r.reserveHash,r.transactionHash,r.withdrawalHash].filter(Boolean)){
  const tx=await reader.getTransactionReceipt({hash});if(tx.status!=='success')throw Error('Evidence transaction failed');
 }
 console.log(r.status,r.key,'commitment and transactions verified');
}
