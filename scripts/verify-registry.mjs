import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const registry = JSON.parse(readFileSync('deployments/bsc-mainnet.json', 'utf8'));
const config = readFileSync('hardhat.config.ts', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(registry.chainId, 56);
assert.equal(registry.contracts.length, 6);
assert.equal(pkg.devDependencies.solc, '0.8.24');
assert.equal(registry.compiler, 'v0.8.24+commit.e11b9ed9');
assert.equal(registry.evmVersion, 'paris');
assert.deepEqual(registry.optimizer, { enabled: true, runs: 200 });
assert.match(config, /version:\s*"0\.8\.24"/);
assert.match(config, /evmVersion:\s*"paris"/);
assert.match(config, /optimizer:\s*\{\s*enabled:\s*true,\s*runs:\s*200/);
const addresses = new Set();
for (const record of registry.contracts) {
  assert.match(record.address, /^0x[0-9a-f]{40}$/);
  assert(!addresses.has(record.address), 'duplicate deployment address');
  addresses.add(record.address);
  const explorer = new URL(record.bscscan);
  assert.equal(explorer.hostname, 'bscscan.com');
  assert.equal(explorer.protocol, 'https:');
  assert(explorer.pathname.endsWith(record.address));
  assert(['exact', 'similar'].includes(record.verification));
  assert.match(record.deploymentTransactionHash, /^0x[0-9a-f]{64}$/);
  assert(Number.isSafeInteger(record.deploymentBlock) && record.deploymentBlock > 0);
  for (const [field, hashField] of [['source', 'sourceSha256'], ['artifact', 'artifactSha256']]) {
    assert.match(record[field], /^(contracts|artifacts)\/[A-Za-z0-9_./-]+$/);
    assert(!record[field].includes('..'));
    assert(existsSync(record[field]), record[field]);
    const digest = createHash('sha256').update(readFileSync(record[field])).digest('hex');
    assert.equal(digest, record[hashField], `${record.name}: ${field} integrity`);
  }
  const source = readFileSync(record.source, 'utf8');
  assert(source.includes(`contract ${record.contractName} `), record.contractName);
  const artifact = JSON.parse(readFileSync(record.artifact, 'utf8'));
  assert(Array.isArray(artifact.abi) && artifact.abi.length > 0);
  assert.equal(typeof artifact.bytecode, 'string');
}
assert.equal(registry.contracts[0].address, '0xeaa12b3be7cdec7749b972ed5c342f4e933ccbb3');
console.log('Verified 6 registry entries: file integrity, unique addresses and compiler settings. No live-chain verification performed.');
