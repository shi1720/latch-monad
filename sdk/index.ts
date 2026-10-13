export {validateResult,canonicalHash,canonicalJSON} from '../src/policy';
export type {Policy,Check} from '../src/policy';
import {createPublicClient,http,encodeAbiParameters,keccak256,type Address,type Hex} from 'viem';
import {monadTestnet} from 'viem/chains';
/** Request IDs must be persistent across retries, unique for distinct purchases. */
export function receiptKey(buyer:Address,requestId:Hex){return keccak256(encodeAbiParameters([{type:'address'},{type:'bytes32'}],[buyer,requestId]));}
export function monadReader(rpc='https://testnet-rpc.monad.xyz'){return createPublicClient({chain:monadTestnet,transport:http(rpc)});}
/** Reproducible acceptance receipt. This is buyer validation, not a truth oracle. */
export type AcceptanceReceipt={chainId:10143;escrow:Address;key:Hex;policyHash:Hex;resultHash:Hex;transactionHash:Hex;status:'Accepted'|'Refunded'};
export {createLatchClient,LatchPendingTransactionError} from './client.ts';
export type {LatchJob,LatchClientOptions,Broadcast} from './client.ts';

export {fetchLiveQuote} from "./quotes.ts";
