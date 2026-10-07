import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const args=process.argv.slice(2);
const registryIndex=args.indexOf('--registry');
const canonical=json(registryIndex>=0?args[registryIndex+1]:'deployments/staking-mainnet.json');
const live=args.includes('--live');
const dirIndex=args.indexOf('--site-dir');
assert(!(live&&dirIndex>=0),'Choose live or local website checks');
async function bytes(path){
 if(live){const response=await fetch('https://arexaidata.com/'+path,{signal:AbortSignal.timeout(30000)});assert(response.ok,`${path}: HTTP ${response.status}`);return Buffer.from(await response.arrayBuffer());}
 if(dirIndex>=0){assert(args[dirIndex+1],'Missing site directory');return readFileSync(resolve(args[dirIndex+1],'public',path));}
 const mirror={'listing-data.json':'listing-data.json','contracts.json':'contracts.json','reports/arxai-staking-mainnet-2026-10-07.json':'../../deployments/staking-mainnet.json'};
 return readFileSync(resolve('verification/staking',mirror[path]));
}
const listing=JSON.parse(await bytes('listing-data.json'));
const contracts=JSON.parse(await bytes('contracts.json'));
const evidence=JSON.parse(await bytes('reports/arxai-staking-mainnet-2026-10-07.json'));
const lower=x=>x.toLowerCase();
assert.equal(listing.chainId,56);assert.equal(contracts.chainId,56);
assert.equal(lower(listing.contractAddress),lower(canonical.token));
assert.equal(listing.staking.status,'live');
assert.equal(lower(listing.staking.contract),lower(canonical.stakingContract));
assert.equal(lower(listing.staking.governanceSafe),lower(canonical.governanceSafe));
assert.equal(listing.staking.fundedRewardBudget,115000000);
assert.deepEqual(listing.staking.simpleAPR,{flexible:2,days30:5,days60:8,days90:12});
assert.equal(listing.staking.yearDays,365);assert.equal(listing.staking.automaticCompounding,false);
assert.equal(listing.staking.flexiblePeriodHours,24);
assert.equal(listing.staking.signatureThreshold,'2 of 3');
assert.equal(listing.staking.independentAudit,'Pending');
assert.equal(listing.previewMarket.scheduledAt,'2026-11-27T18:00:00Z');
assert.equal(listing.previewMarket.status,'planned');
assert.equal(listing.maxSupply,1000000000);
assert.equal(listing.currentAllocation.reduce((n,x)=>n+x.amount,0),1000000000);
assert.equal(listing.currentAllocation.reduce((n,x)=>n+x.percentage,0),100);
const allocations=Object.fromEntries(listing.currentAllocation.map(x=>[x.name,x.amount]));
assert.equal(allocations['Staking rewards'],115000000);assert.equal(allocations['Exchange and ecosystem reserve'],460000000);
assert.equal(listing.allocationRevision.newTokensMinted,0);
const staking=contracts.contracts.find(x=>x.name==='ARXAI staking');assert(staking);
assert.equal(lower(staking.address),lower(canonical.stakingContract));assert.equal(lower(staking.governance),lower(canonical.governanceSafe));
assert.equal(staking.upgradeable,false);assert.equal(staking.independentAudit,'Pending');
assert.equal(contracts.stakingGovernance.threshold,2);assert.equal(contracts.stakingGovernance.ownerCount,3);
for(const key of ['stakingContract','token','governanceSafe','activationTransaction','deploymentTransaction','fundedRewardBudgetARXAI','remainingReserveARXAI'])assert.equal(lower(String(evidence[key])),lower(String(canonical[key])),key);
if(!args.includes('--skip-readme')){
const readme=readFileSync('README.md','utf8');
assert(readme.includes(canonical.stakingContract));assert(readme.includes(canonical.governanceSafe));
assert.match(readme,/115 million/);
assert(!/Staking prototype \(not live\)|budget has not been funded|No public testnet or mainnet staking address|Staking remains an unreleased prototype/.test(readme),'Obsolete global staking status');
assert.match(readme,/frozen|Frozen/,'Explain frozen deployment source');
}else assert(dirIndex>=0&&registryIndex>=0,'README exclusion is reserved for the website prepublish gate');
if(live||dirIndex>=0){
 const temp=mkdtempSync(join(tmpdir(),'arexai-whitepaper-'));
 try {
  const file=join(temp,'whitepaper.pdf');writeFileSync(file,await bytes('whitepaper.pdf'));
  const text=execFileSync('pdftotext',[file,'-'],{encoding:'utf8'}).replace(/\s+/g,' ');
  for(const address of [canonical.stakingContract,canonical.governanceSafe])assert(lower(text).includes(lower(address)),`Whitepaper address ${address}`);
  for(const pattern of [/115[ ,]?(?:000[ ,]?000|million)/i,/460[ ,]?(?:000[ ,]?000|million)/i,/Flexible:\s*2% simple APR/i,/5%\s*\/\s*8%\s*\/\s*12% simple APR/i])assert.match(text,pattern);
 } finally {rmSync(temp,{recursive:true,force:true});}
}
if(dirIndex>=0){
 const source=readFileSync(resolve(args[dirIndex+1],'lib/staking-contract.ts'),'utf8');
 for(const address of [canonical.stakingContract,canonical.token,canonical.governanceSafe])assert(lower(source).includes(lower(address)),`UI address ${address}`);
 assert.match(source,/rates\s*=\s*\[200n,500n,800n,1200n\]/);
}
console.log(`Project consistency passed: ${live?'published website and whitepaper':dirIndex>=0?'local website, whitepaper and UI':'recorded website metadata mirrors (not a live-site check)'}. No audit or current chain-state guarantee.`);
