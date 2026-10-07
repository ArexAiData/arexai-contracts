import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const script=resolve('scripts/verify-project-consistency.mjs');
function fixture(mutate){
 const root=mkdtempSync(join(tmpdir(),'arexai-consistency-'));
 mkdirSync(join(root,'deployments'));mkdirSync(join(root,'verification/staking'),{recursive:true});
 const listing=JSON.parse(readFileSync('verification/staking/listing-data.json'));
 const contracts=JSON.parse(readFileSync('verification/staking/contracts.json'));
 let readme=readFileSync('README.md','utf8');
 const changes=mutate?.({listing,contracts,readme});if(changes?.readme)readme=changes.readme;
 writeFileSync(join(root,'README.md'),readme);
 writeFileSync(join(root,'deployments/staking-mainnet.json'),readFileSync('deployments/staking-mainnet.json'));
 writeFileSync(join(root,'verification/staking/listing-data.json'),JSON.stringify(listing));
 writeFileSync(join(root,'verification/staking/contracts.json'),JSON.stringify(contracts));
 try {return spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'});}finally{rmSync(root,{recursive:true,force:true});}
}
test('consistent recorded metadata passes without claiming live verification',()=>{const r=fixture();assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/not a live-site check/);});
for(const [name,mutate] of [
 ['wrong staking address',({listing})=>{listing.staking.contract='0x0000000000000000000000000000000000000001';}],
 ['wrong token address',({listing})=>{listing.contractAddress='0x0000000000000000000000000000000000000001';}],
 ['APR drift',({listing})=>{listing.staking.simpleAPR.days90=20;}],
 ['wrong reward budget',({listing})=>{listing.staking.fundedRewardBudget=575000000;}],
 ['historical reserve presented as current',({listing})=>{listing.currentAllocation[0].amount=575000000;}],
 ['wrong public trading date',({listing})=>{listing.previewMarket.scheduledAt='2026-11-26T18:00:00Z';}],
 ['APY or compounding substituted',({listing})=>{listing.staking.automaticCompounding=true;}],
 ['audit falsely marked complete',({listing})=>{listing.staking.independentAudit='Complete';}],
 ['wrong governance',({contracts})=>{contracts.stakingGovernance.threshold=1;}],
 ['obsolete README staking status',({readme})=>({readme:readme+'\nStaking remains an unreleased prototype.'})],
 ['unfunded listing status',({listing})=>{listing.staking.status='preparing';}],
 ])test(`rejects ${name}`,()=>{const r=fixture(mutate);assert.notEqual(r.status,0);assert.match(r.stderr,/AssertionError/);});
