import fs from 'node:fs';
import {createPublicClient,createWalletClient,http,parseEther} from 'viem';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {monadTestnet} from 'viem/chains';
import {compile} from './compile.mjs';
const compiled=(await compile())['LatchEscrow.sol'].LatchEscrow;
fs.writeFileSync('public/abi.json',JSON.stringify(compiled.abi,null,2));
fs.mkdirSync('work',{recursive:true});
const path='work/deployer.json';
let secret=process.env.DEPLOYER_PRIVATE_KEY?{privateKey:process.env.DEPLOYER_PRIVATE_KEY}:fs.existsSync(path)?JSON.parse(fs.readFileSync(path)): {privateKey:generatePrivateKey()};
if(!process.env.DEPLOYER_PRIVATE_KEY)fs.writeFileSync(path,JSON.stringify(secret),{mode:0o600});
const account=privateKeyToAccount(secret.privateKey);const rpc=process.env.MONAD_RPC_URL||'https://testnet-rpc.monad.xyz';
const client=createPublicClient({chain:monadTestnet,transport:http(rpc)});const wallet=createWalletClient({account,chain:monadTestnet,transport:http(rpc)});
if(await client.getChainId()!==10143)throw Error('Testnet only: unexpected chain');
console.log('Testnet deployment account:',account.address);
if(await client.getBalance({address:account.address})<parseEther('0.03')) {
 const faucet=await fetch('https://agents.devnads.com/v1/faucet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chainId:10143,address:account.address})});
 const reply=await faucet.text();console.log('Faucet status',faucet.status,reply);
 for(let n=0;n<15 && await client.getBalance({address:account.address})<parseEther('0.03');n++)await new Promise(r=>setTimeout(r,2000));
}
if(await client.getBalance({address:account.address})<parseEther('0.03'))throw Error(`Fund ${account.address} with testnet MON at https://faucet.monad.xyz then rerun npm run deploy`);
const artifact={abi:compiled.abi,bytecode:`0x${compiled.evm.bytecode.object}`};
const tx=await wallet.deployContract({abi:artifact.abi,bytecode:artifact.bytecode});const receipt=await client.waitForTransactionReceipt({hash:tx});if(receipt.status!=='success'||!receipt.contractAddress)throw Error('Deploy failed');
const deployment={chainId:10143,address:receipt.contractAddress,provider:account.address,deployer:account.address,transactionHash:tx,blockNumber:receipt.blockNumber.toString(),rpcUrl:rpc,explorer:'https://testnet.monadscan.com',deployedAt:new Date().toISOString()};
fs.writeFileSync('public/deployment.json',JSON.stringify(deployment,null,2));console.log(JSON.stringify(deployment,null,2));
