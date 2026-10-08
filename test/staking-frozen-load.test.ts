import assert from 'node:assert/strict';
import {test} from 'node:test';
import {writeFileSync} from 'node:fs';
import {network} from 'hardhat';
import {frozenArtifact} from './helpers/frozen-staking.js';
const U=10n**18n,CAP=115_000_000n*U,DAY=86400;
const measurements:object[]=[];
for(const scenario of [{kind:'delayed-30-days',count:64,days:30,amount:100n},{kind:'dense-1024',count:1024,days:2,amount:100n},{kind:'exhaustion',count:256,days:365000,amount:100000n},{kind:'emergency',count:256,days:2,amount:100n}])test(`Frozen deployment load: ${scenario.kind}`,async()=>{
 const {ethers,provider}=await network.create('hardhatMainnet');const [treasury,a,b,c]=await ethers.getSigners();
 const token=await ethers.deployContract('contracts/verified/ArexAIToken.sol:ArexAIToken',[treasury.address]);
 const safe=await ethers.deployContract('StakingSafeHarness',[a.address,b.address,c.address]);
 const factory=new ethers.ContractFactory(frozenArtifact.abi,frozenArtifact.bytecode,treasury);
 const s:any=await factory.deploy(await token.getAddress(),await safe.getAddress());await s.waitForDeployment();
 await token.approve(await s.getAddress(),CAP);await s.fundAndActivate();await token.transfer(a.address,400000000n*U);await token.connect(a).approve(await s.getAddress(),ethers.MaxUint256);
 const amount=scenario.amount*U;
 for(let i=0;i<scenario.count;i++)await s.connect(a).stake(amount,0);
 const last=await s.positions(scenario.count);await provider.send('evm_setNextBlockTimestamp',[Number(last.started)+scenario.days*DAY+3600]);await provider.send('evm_mine',[]);
 const invariant=async()=>{assert.equal(await s.freeRewards()+await s.reservedLocked()+await s.owedFlexible()+await s.paidRewards()+await s.burnedRewards(),CAP);assert.equal(await token.balanceOf(await s.getAddress()),await s.totalPrincipal()+await s.freeRewards()+await s.reservedLocked()+await s.owedFlexible());};
 if(scenario.kind==='emergency'){
  const to=await s.getAddress(),data=s.interface.encodeFunctionData('emergencyClose');await safe.connect(a).confirm(to,data);await safe.connect(b).confirm(to,data);await safe.execute(to,data);
  const before=await token.balanceOf(a.address);await s.connect(a).withdrawPrincipal(1);assert.equal(await token.balanceOf(a.address)-before,amount);await invariant();
 }
 const gases:bigint[]=[];let checkpointAt=0n;
 do{const receipt=await(await s.checkpoint(64)).wait();gases.push(receipt!.gasUsed);assert(receipt!.gasUsed<8000000n);if(!checkpointAt)checkpointAt=await s.checkpointAt();assert.equal(await s.checkpointAt(),checkpointAt);await invariant();assert(gases.length<100);}while(await s.phase()!==0n);
 const expectedCalls=scenario.kind==='exhaustion'?12:scenario.kind==='emergency'?8:Math.ceil(scenario.count/64);assert.equal(gases.length,expectedCalls);
 if(scenario.kind==='exhaustion'){
  assert.equal(await s.freeRewards(),0n);assert.equal(await s.flexPaused(),true);const share=CAP/BigInt(scenario.count);
  assert.equal((await s.positions(1)).reward,share);assert.equal((await s.positions(128)).reward,share);assert.equal((await s.positions(256)).reward,CAP-share*255n);
 }else if(scenario.kind==='emergency')assert.equal(await s.shutdownFinalized(),true);
 else for(const id of [1,scenario.count]){const p=await s.positions(id);const complete=(checkpointAt-p.started)/BigInt(DAY);assert.equal(p.settledDays,complete);assert.equal(p.reward,await s.quote(amount,0)*complete);}
 const claim=await(await s.connect(a).claim(scenario.count)).wait();assert(claim!.gasUsed>0n);const paid=await s.paidRewards();await assert.rejects(s.connect(a).claim(scenario.count));assert.equal(await s.paidRewards(),paid);
 const before=await token.balanceOf(a.address);const principal=await(await s.connect(a).withdrawPrincipal(scenario.count)).wait();assert.equal(await token.balanceOf(a.address)-before,amount);await assert.rejects(s.connect(a).withdrawPrincipal(scenario.count));await invariant();
 measurements.push({kind:scenario.kind,positions:scenario.count,delayDays:scenario.days,batchWork:64,transactions:gases.length,gasByTransaction:gases.map(String),maximumGas:String(gases.reduce((a,b)=>a>b?a:b)),totalGas:String(gases.reduce((a,b)=>a+b)),claimGas:String(claim!.gasUsed),principalExitGas:String(principal!.gasUsed),checkpointAt:String(checkpointAt),accountingInvariantPassed:true});
 if(process.env.STAKING_FROZEN_LOAD_REPORT)writeFileSync(process.env.STAKING_FROZEN_LOAD_REPORT,JSON.stringify({scope:'Local EDR receipts from hash-pinned frozen mainnet compiler input. Safe harness, synthetic token and positions. Not a mainnet transaction, audit or live gas quote.',batchWork:64,measurements},null,2)+'\n');
});
