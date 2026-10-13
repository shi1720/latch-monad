import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function compile(extraSources = {}) {
  const source = await fs.readFile(path.join(root, 'contracts/LatchEscrow.sol'), 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'LatchEscrow.sol': { content: source }, ...extraSources },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'paris',
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter(e => e.severity === 'error');
  if (errors.length) throw new Error(errors.map(e => e.formattedMessage).join('\n'));
  return output.contracts;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const contracts = await compile();
  const artifact = contracts['LatchEscrow.sol'].LatchEscrow;
  await fs.mkdir(path.join(root, 'public'), { recursive: true });
  await fs.writeFile(path.join(root, 'public/abi.json'), JSON.stringify(artifact.abi, null, 2) + '\n');
  await fs.writeFile(path.join(root, 'contracts/LatchEscrow.json'), JSON.stringify({ contractName: 'LatchEscrow', compiler: solc.version(), evmVersion: 'paris', abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}` }, null, 2) + '\n');
  console.log(`Compiled LatchEscrow: ${artifact.evm.deployedBytecode.object.length / 2} bytes; ABI and deployable artifact written.`);
}
