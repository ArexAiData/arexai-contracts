import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import solc from 'solc';

const read = p => JSON.parse(readFileSync(p, 'utf8'));
const snapshot = read('verification/bsc-snapshot.json');
const registry = read('deployments/bsc-mainnet.json');
assert.equal(snapshot.chainId, 56);
assert.equal(snapshot.contracts.length, registry.contracts.length);
assert.match(solc.version(), /^0\.8\.24\+commit\.e11b9ed9/);
const cached = new Map();
const currentSources = Object.fromEntries([...new Set(registry.contracts.map(c => c.source))].map(p => [p, {content: readFileSync(p, 'utf8')}]));
const local = JSON.parse(solc.compile(JSON.stringify({language:'Solidity', sources:currentSources, settings:{optimizer:{enabled:true,runs:200},evmVersion:'paris',outputSelection:{'*':{'*':['evm.deployedBytecode']}}}}), {import:p => {try{return {contents:readFileSync('node_modules/'+p,'utf8')}}catch{return {error:'Missing import '+p}}}}));
assert(!local.errors?.some(e=>e.severity==='error'), JSON.stringify(local.errors));
function executable(hex) {
  const bytes = Buffer.from(hex.replace(/^0x/, ''), 'hex');
  assert(bytes.length > 2);
  const size = bytes.readUInt16BE(bytes.length - 2);
  assert(size > 0 && size + 2 < bytes.length, 'Invalid Solidity CBOR suffix length');
  return bytes.subarray(0, bytes.length - 2 - size);
}
for (const record of snapshot.contracts) {
  const entry = registry.contracts.find(c => c.address === record.address);
  assert(entry, record.address);
  assert.equal(entry.deploymentTransactionHash, record.transaction.hash);
  assert.equal(record.receipt.transactionHash, record.transaction.hash);
  assert.equal(record.receipt.contractAddress.toLowerCase(), entry.address);
  assert.equal(record.receipt.status, '0x1');
  assert.equal(record.transaction.to, null);
  assert.equal(Number(BigInt(record.receipt.blockNumber)), entry.deploymentBlock);
  assert.equal(record.transaction.blockHash, record.receipt.blockHash);
  assert.equal(Number(BigInt(record.transaction.chainId)), 56);
  assert.equal(record.sourcifyMatch.creation, 'exact_match');
  assert.equal(record.sourcifyMatch.runtime, 'exact_match');
  if (!cached.has(record.input)) {
    const input = read(record.input);
    input.settings.outputSelection = {'*':{'*':['evm.bytecode','evm.deployedBytecode']}};
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    assert(!output.errors?.some(e=>e.severity==='error'), JSON.stringify(output.errors));
    cached.set(record.input, output);
  }
  const [path, name] = record.fullyQualifiedName.split(':');
  const compiled = cached.get(record.input).contracts[path][name].evm;
  assert.equal('0x'+compiled.bytecode.object+record.constructorArguments.slice(2), record.transaction.input, `${entry.name}: complete creation bytecode and constructor arguments`);
  let runtime = compiled.deployedBytecode.object;
  // Only compiler-declared immutable positions may be replaced; metadata is retained.
  const refKey = refs => refs.map(r => `${r.start}:${r.length}`).sort().join(",");
  assert.deepEqual(Object.values(compiled.deployedBytecode.immutableReferences).map(refKey).sort(), Object.values(record.immutableReferences).map(refKey).sort());
  for (const [id, refs] of Object.entries(compiled.deployedBytecode.immutableReferences)) {
    const originalId = Object.entries(record.immutableReferences).find(([, originalRefs]) => refKey(originalRefs) === refKey(refs))?.[0];
    const value = record.immutableValues[originalId]?.replace(/^0x/, '');
    assert(value, `Missing immutable ${id}`);
    for (const ref of refs) {
      assert.equal(value.length, ref.length * 2);
      runtime = runtime.slice(0,ref.start*2)+value+runtime.slice((ref.start+ref.length)*2);
    }
  }
  assert.equal('0x'+runtime, record.runtimeBytecode, `${entry.name}: complete deployed runtime including metadata`);
  const mapped = local.contracts[entry.source][entry.contractName].evm.deployedBytecode.object;
  assert.deepEqual(executable(mapped), executable(compiled.deployedBytecode.object), `${entry.name}: current repository executable template`);
  console.log(`${entry.name}: creation receipt, exact original build/runtime and current executable template verified`);
}
console.log(`Snapshot verification passed for 6 contracts at BSC block ${snapshot.blockNumber}. No live RPC request or audit performed by this command.`);
