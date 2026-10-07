import assert from "node:assert/strict";
import {test} from "node:test";
import {writeFileSync} from "node:fs";
import {network} from "hardhat";
const U=10n**18n,CAP=115_000_000n*U,DAY=86400;
const measurements:object[]=[];
async function setup(){
 const {ethers,provider}=await network.create("hardhatMainnet");const [t,a,b,c]=await ethers.getSigners();
 const token=await ethers.deployContract("contracts/verified/ArexAIToken.sol:ArexAIToken",[t.address]);
 const safe=await ethers.deployContract("StakingSafeHarness",[a.address,b.address,c.address]);
 const s=await ethers.deployContract("ArexAIStaking",[await token.getAddress(),await safe.getAddress()]);
 await token.approve(await s.getAddress(),CAP);await s.fundAndActivate();await token.transfer(a.address,400_000_000n*U);await token.connect(a).approve(await s.getAddress(),ethers.MaxUint256);
 const jump=async(at:number)=>{await provider.send("evm_setNextBlockTimestamp",[at]);await provider.send("evm_mine",[]);};
 const invariant=async()=>{assert.equal(await s.freeRewards()+await s.reservedLocked()+await s.owedFlexible()+await s.paidRewards()+await s.burnedRewards(),CAP);assert.equal(await token.balanceOf(await s.getAddress()),await s.totalPrincipal()+await s.freeRewards()+await s.reservedLocked()+await s.owedFlexible());};
 return{ethers,provider,token,safe,s,a,b,jump,invariant};
}
function save(){if(process.env.STAKING_SCALE_REPORT)writeFileSync(process.env.STAKING_SCALE_REPORT,JSON.stringify({scope:"Local simulated receipts; sparse/dense 1,024-position fixtures, not a production gas forecast",measurements},null,2)+"\n");}
test("Sparse deadlines: only two due positions are visited among 1,026 queued positions",async()=>{
 const f=await setup(),{s,a}=f;await s.connect(a).stake(100n*U,0);await s.connect(a).stake(100n*U,0);const early=await s.positions(2);
 await f.jump(Number(early.started)+DAY/2);
 for(let i=0;i<1024;i++)await s.connect(a).stake(100n*U,0);
 await f.jump(Number(early.started)+DAY+3600);
 const gas:bigint[]=[];do{const r=await(await s.checkpoint(1)).wait();gas.push(r!.gasUsed);await f.invariant();}while(await s.phase()!==0n);
 assert.equal(gas.length,2);assert.equal(await s.checkpointCursor(),2n);assert.equal(await s.checkpointFullBudget(),true);
 for(const id of [3,500,1026])assert.equal((await s.positions(id)).settledDays,0n);
 assert.equal((await s.positions(1)).reward,await s.quote(100n*U,0));
 measurements.push({kind:"sparse-normal",positions:1026,duePositions:2,transactions:gas.length,totalGas:String(gas.reduce((a,b)=>a+b,0n)),maximumGas:String(gas.reduce((a,b)=>a>b?a:b))});save();
});
test("Dense 1,024-position normal settlement uses one pass; emergency and simultaneous exits conserve rewards",async()=>{
 const f=await setup(),{s,a}=f;
 for(let i=0;i<1024;i++)await s.connect(a).stake(100n*U,0);
 const last=await s.positions(1024);await f.jump(Number(last.started)+2*DAY+3600);
 const gas:bigint[]=[];do{const r=await(await s.checkpoint(64)).wait();gas.push(r!.gasUsed);assert(r!.gasUsed<8_000_000n);await f.invariant();}while(await s.phase()!==0n);
 assert.equal(gas.length,16);assert.equal(await s.checkpointFullBudget(),true);
 const to=await s.getAddress(),data=s.interface.encodeFunctionData("emergencyClose");await f.safe.connect(a).confirm(to,data);await f.safe.connect(f.b).confirm(to,data);await f.safe.execute(to,data);
 for(let id=1;id<=32;id++)await s.connect(a).withdrawPrincipal(id);
 let emergency=0;do{const r=await(await s.checkpoint(64)).wait();assert(r!.gasUsed<8_000_000n);emergency++;await f.invariant();}while(await s.phase()!==0n);
 assert.equal(emergency,32);assert.equal(await s.shutdownFinalized(),true);
 for(let id=1;id<=32;id++){await s.connect(a).claim(id);await s.connect(a).withdraw(id);}
 await f.invariant();measurements.push({kind:"dense-normal-and-emergency",positions:1024,normalTransactions:gas.length,totalGas:String(gas.reduce((a,b)=>a+b,0n)),maximumGas:String(gas.reduce((a,b)=>a>b?a:b)),emergencyTransactions:emergency,principalExitsDuringEmergency:32});save();
});
test("1,024-position exhaustion falls back to proportional allocation independent of claim order",async()=>{
 const f=await setup(),{s,a}=f;const amount=100_000n*U;
 for(let i=0;i<1024;i++)await s.connect(a).stake(amount,0);
 const last=await s.positions(1024);await f.jump(Number(last.started)+1000*365*DAY+3600);
 let transactions=0;const gas:bigint[]=[];
 do{const r=await(await s.checkpoint(64)).wait();gas.push(r!.gasUsed);assert(r!.gasUsed<8_000_000n);transactions++;await f.invariant();}while(await s.phase()!==0n);
 assert.equal(await s.checkpointFullBudget(),false);assert.equal(transactions,48);assert.equal(await s.freeRewards(),0n);
 const share=CAP/1024n;assert.equal((await s.positions(1)).reward,share);assert.equal((await s.positions(500)).reward,share);assert.equal((await s.positions(1024)).reward,CAP-share*1023n);
 await s.connect(a).claim(1024);await s.connect(a).claim(1);await s.connect(a).withdrawPrincipal(500);await f.invariant();
 measurements.push({kind:"dense-exhaustion",positions:1024,transactions,totalGas:String(gas.reduce((a,b)=>a+b,0n)),maximumGas:String(gas.reduce((a,b)=>a>b?a:b)),proportionalSharesVerified:true});save();
});
