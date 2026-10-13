import {createPublicClient,createWalletClient,http,custom,parseEther,keccak256,encodeAbiParameters,type Hex,type Address} from 'viem';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {monadTestnet} from 'viem/chains';
import {canonicalHash,validateResult,type Policy} from './policy';
const reader=createPublicClient({chain:monadTestnet,transport:http('https://testnet-rpc.monad.xyz',{retryCount:2})});
let wallet:any;let address:Address;let deployment:any;let abi:any;let busy=false;
const emit=(name:string,detail:any)=>window.dispatchEvent(new CustomEvent(name,{detail}));
function ensureStorage(){try{localStorage.setItem('latch-storage-check','1');localStorage.removeItem('latch-storage-check');sessionStorage.setItem('latch-storage-check','1');sessionStorage.removeItem('latch-storage-check')}catch{throw Error('Site storage is blocked. Enable storage or use another browser before creating a wallet or payment.')}}
async function config(){if(!deployment){[deployment,abi]=await Promise.all([fetch('/deployment.json').then(r=>{if(!r.ok)throw Error('Deployment unavailable');return r.json()}),fetch('/abi.json').then(r=>r.json())]);}if(deployment.chainId!==10143)throw Error('Testnet only');}
async function job(key:Hex){return await reader.readContract({address:deployment.address,abi,functionName:'jobs',args:[key]}) as any;}
export function installChain(){
 window.addEventListener('latch-connect',()=>void(async()=>{try{ensureStorage();if(busy)throw Error('Wait for the current purchase to finish before reconnecting');await config();const injected=(window as any).ethereum;
 if(injected){wallet=createWalletClient({chain:monadTestnet,transport:custom(injected)});[address]=await wallet.requestAddresses();try{await wallet.switchChain({id:10143})}catch{await wallet.addChain({chain:monadTestnet});await wallet.switchChain({id:10143})}}
 else {let key=sessionStorage.getItem('latch-testnet-key') as Hex|null;if(!key){key=generatePrivateKey();sessionStorage.setItem('latch-testnet-key',key)}const account=privateKeyToAccount(key);address=account.address;wallet=createWalletClient({account,chain:monadTestnet,transport:http()});}
 emit('latch-wallet',{address,isDemo:!injected});
 }catch(e){emit('latch-error',{message:(e as Error).message})}})());
 window.addEventListener('latch-settle',((event:CustomEvent)=>void(async()=>{if(busy)return;busy=true;try{
 ensureStorage();if(!wallet)throw Error('Connect a wallet first');await config();
 const {payload,policy}=event.detail as {payload:unknown,policy:Policy};const policyHash=await canonicalHash(policy);const resultHash=await canonicalHash(payload);
 // Same artifact and policy are one purchase. Retrying reuses the same onchain key.
 const requestId=await canonicalHash({policyHash,resultHash});const key=keccak256(encodeAbiParameters([{type:'address'},{type:'bytes32'}],[address,requestId]));
 localStorage.setItem('latch-active-purchase',JSON.stringify({payload,policy}));
 const storageKey=`latch-operation:${deployment.address}:${address}:${requestId}`;let operation=JSON.parse(localStorage.getItem(storageKey)||'{}');const save=()=>localStorage.setItem(storageKey,JSON.stringify(operation));
 async function send(name:string,args:any[],value?:bigint){let hash=operation[name] as Hex|undefined;
 if(!hash){if(await wallet.getChainId()!==10143)throw Error('Switch back to Monad testnet');const accounts=wallet.account?[wallet.account.address]:await wallet.getAddresses();if(accounts[0]?.toLowerCase()!==address.toLowerCase())throw Error('Wallet account changed; reconnect after this operation');hash=await wallet.writeContract({address:deployment.address,abi,functionName:name,args,account:wallet.account||address,chain:monadTestnet,...(value?{value}:{})});operation[name]=hash;save();}
 const receipt=await reader.waitForTransactionReceipt({hash:hash!,timeout:90000});if(receipt.status!=='success'){delete operation[name];save();throw Error(`${name} reverted. Retry uses the same purchase ID.`)}await new Promise(r=>setTimeout(r,2000));return hash;}
 let current=await job(key);let state=Number(current[6]);
 const checkTerms=()=>{if(Number(current[6])>0&&(current[0].toLowerCase()!==address.toLowerCase()||current[1].toLowerCase()!==deployment.provider.toLowerCase()||current[2]!==parseEther('0.001')||current[3].toLowerCase()!==policyHash.toLowerCase()))throw Error('Existing purchase terms differ from this request. Inspect the contract before proceeding. No new payment was created.');if(Number(current[6])===2&&current[4].toLowerCase()!==resultHash.toLowerCase())throw Error('Existing accepted result commitment differs. No new payment was created.')};checkTerms();
 if(state===0){
 if(await reader.getBalance({address})<parseEther('0.15')) {emit('latch-progress',{message:'Funding test wallet with free testnet MON…'});const r=await fetch('https://agents.devnads.com/v1/faucet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chainId:10143,address})});if(!r.ok)throw Error(`Faucet unavailable. Fund ${address} at faucet.monad.xyz and retry.`);for(let i=0;i<15&&await reader.getBalance({address})<parseEther('0.15');i++)await new Promise(r=>setTimeout(r,2000));}
 await new Promise(r=>setTimeout(r,2500));
 if(await reader.getBalance({address})<parseEther('0.15'))throw Error(`Fund ${address} with testnet MON at faucet.monad.xyz.`);
 if(!operation.open){operation.deadline=String((await reader.getBlock()).timestamp+BigInt(validateResult(payload,policy).accepted?300:15));save();}
 emit('latch-progress',{message:'Reserving 0.001 testnet MON…'});await send('open',[requestId,deployment.provider,policyHash,BigInt(operation.deadline)],parseEther('0.001'));current=await job(key);state=Number(current[6]);}
 if(state===1){const deadline=BigInt(current[5]);const now=(await reader.getBlock()).timestamp;
 if(validateResult(payload,policy).accepted&&now<=deadline){emit('latch-progress',{message:'Checks passed. Authorizing provider credit…'});await send('accept',[key,resultHash]);}
 else {emit('latch-progress',{message:'Payment protected. Waiting for expiry, then recovering funds…'});while((await reader.getBlock()).timestamp<=deadline)await new Promise(r=>setTimeout(r,1500));await send('refund',[key]);}}
 current=await job(key);state=Number(current[6]);checkTerms();if(state===3){const credit=await reader.readContract({address:deployment.address,abi,functionName:'credits',args:[address]}) as bigint;if(credit>0n){if(operation.withdraw){await reader.waitForTransactionReceipt({hash:operation.withdraw});const remaining=await reader.readContract({address:deployment.address,abi,functionName:'credits',args:[address]}) as bigint;if(remaining>0n){delete operation.withdraw;save();await send('withdraw',[])}}else await send('withdraw',[]);}}
 const hash=state===2?operation.accept:operation.refund;if(!hash)throw Error('Existing receipt found; inspect contract events for transaction history. No new payment was created.');
 localStorage.removeItem('latch-active-purchase');
 emit('latch-receipt',{key,hash,transactionHash:hash,reserveHash:operation.open,withdrawalHash:operation.withdraw,resultHash,policyHash,requestId,chainId:10143,contract:deployment.address,buyer:address,provider:deployment.provider,amount:'0.001',status:state===2?'Accepted':'Refunded',createdAt:new Date().toISOString(),blockStatus:state,payload,policy});
 }catch(e){emit('latch-error',{message:(e as any).shortMessage||(e as Error).message})}finally{busy=false}})()) as EventListener);
}
