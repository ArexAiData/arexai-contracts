import assert from "node:assert/strict";
import { test } from "node:test";
import { network } from "hardhat";
import { frozenArtifact } from "./helpers/frozen-staking.js";

export function registerStakingBehavior(frozen = false) {
const label = frozen ? "Frozen mainnet: " : "Development: ";
const behaviorTest = (name: string, fn: () => Promise<void>) => test(label + name, fn);
const unit = 10n ** 18n;
const cap = 115_000_000n * unit;
const day = 86400;
const year = 365n * 86400n;
async function setup(fund = true) {
  const connection = await network.create("hardhatMainnet");
  const {ethers} = connection;
  const [treasury, a, b, c, outsider] = await ethers.getSigners();
  const token = await ethers.deployContract("contracts/verified/ArexAIToken.sol:ArexAIToken", [treasury.address]);
  const safe = await ethers.deployContract("StakingSafeHarness", [a.address,b.address,c.address]);
  const factory = frozen
    ? new ethers.ContractFactory(frozenArtifact.abi, frozenArtifact.bytecode, treasury)
    : await ethers.getContractFactory("ArexAIStaking", treasury);
  const staking = await factory.deploy(await token.getAddress(), await safe.getAddress());
  await staking.waitForDeployment();
  if (fund) { await token.approve(await staking.getAddress(), cap); await staking.fundAndActivate(); }
  await token.transfer(a.address, 400_000_000n*unit);
  await token.transfer(b.address, 400_000_000n*unit);
  for (const user of [a,b]) await token.connect(user).approve(await staking.getAddress(),ethers.MaxUint256);
  return {connection, ethers, factory, treasury,a,b,c,outsider,token,safe,staking};
}
type Fixture = Awaited<ReturnType<typeof setup>>;
async function time(f:Fixture, timestamp:number) {
  await f.connection.provider.send("evm_setNextBlockTimestamp",[timestamp]);
  await f.connection.provider.send("evm_mine",[]);
}
async function settle(f:Fixture, batch=64) {
  const block = await f.connection.provider.send("eth_getBlockByNumber",["latest",false]) as {timestamp:string};
  if (await f.staking.phase() === 0n && (await f.staking.shutdownFinalized() || BigInt(block.timestamp) < await f.staking.nextFlexibleDue())) return;
  do { await f.staking.checkpoint(batch); } while (await f.staking.phase() !== 0n);
}
async function close(f:Fixture) {
  const to=await f.staking.getAddress(), data=f.staking.interface.encodeFunctionData("emergencyClose");
  await f.safe.connect(f.a).confirm(to,data);
  await f.safe.connect(f.b).confirm(to,data);
  await f.safe.execute(to,data);
}
async function invariant(f:Fixture) {
  const {staking:s,token}=f;
  assert.equal(await s.freeRewards()+await s.reservedLocked()+await s.owedFlexible()+await s.paidRewards()+await s.burnedRewards(), cap);
  const liabilities=await s.totalPrincipal()+await s.freeRewards()+await s.reservedLocked()+await s.owedFlexible();
  assert((await token.balanceOf(await s.getAddress()))>=liabilities);
}

behaviorTest("Staking rejects EOAs as governance, requires full funding and has immutable rates",async()=>{
  const f=await setup(false),s=f.staking;
  await assert.rejects(f.factory.deploy(await f.token.getAddress(),f.a.address),/InvalidConfiguration/);
  await assert.rejects(s.activate(),/NotReady/);
  await assert.rejects(s.connect(f.a).stake(unit,0),/NotReady/);
  await f.token.transfer(await s.getAddress(),cap-1n);
  await assert.rejects(s.activate(),/NotReady/);
  await f.token.transfer(await s.getAddress(),1n);
  await s.activate();
  await assert.rejects(s.activate(),/NotReady/);
  assert.deepEqual(await Promise.all([0,1,2,3].map(m=>s.aprBps(m))),[200n,500n,800n,1200n]);
  for(const fn of ["setRate(uint256)","upgradeTo(address)","withdrawRewards(uint256)"])assert.equal(s.interface.hasFunction(fn),false);
  await invariant(f);
});

behaviorTest("Staking quotes all agreed terms using a 365-day simple APR",async()=>{
  const f=await setup(), amount=10_000_000n*unit;
  for(const [m,bps,seconds]of [[0,200,day],[1,500,30*day],[2,800,60*day],[3,1200,90*day]]) {
    assert.equal(await f.staking.quote(amount,m),amount*BigInt(bps)*BigInt(seconds)/(10000n*year));
  }
  assert.equal(await f.staking.quote(amount,3),295890410958904109589041n);
});

behaviorTest("Staking allows independent deposits without a 5M cap and protects holder ownership",async()=>{
  const f=await setup(),s=f.staking;
  await assert.rejects(s.connect(f.a).stake(0n,0),/InvalidAmount/);
  await s.connect(f.a).stake(10_000_000n*unit,3);
  const first=await s.positions(1);
  await s.connect(f.a).stake(unit,1);
  await s.connect(f.a).stake(1n,0);
  assert.equal((await s.positions(1)).ends,first.ends);
  assert.equal(await s.activeCount(),3n);
  await assert.rejects(s.connect(f.b).withdraw(1),/NotHolder/);
  await invariant(f);
});

behaviorTest("Locked staking early exit returns principal only and recycles the entire reserved reward",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  await s.connect(f.a).stake(amount,3);
  const before=await f.token.balanceOf(f.a.address),p=await s.positions(1);
  await time(f,Number(p.started)+20*day);
  await s.connect(f.a).withdraw(1);
  assert.equal(await f.token.balanceOf(f.a.address),before+amount);
  assert.equal(await s.freeRewards(),cap);
  assert.equal(await s.paidRewards(),0n);
  await assert.rejects(s.connect(f.a).withdraw(1),/InvalidPosition/);
  await invariant(f);
});

behaviorTest("All locked terms pay their fixed reward at maturity and stop accruing afterwards",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  for(const mode of [1,2,3])await s.connect(f.a).stake(amount,mode);
  const p=await s.positions(3);await time(f,Number(p.ends)+180*day);
  const before=await f.token.balanceOf(f.a.address);
  let rewards=0n;for(const id of [1,2,3]){rewards+=(await s.positions(id)).reward;await s.connect(f.a).withdraw(id);}
  assert.equal(await f.token.balanceOf(f.a.address),before+3n*amount+rewards);
  await invariant(f);
});

behaviorTest("Flexible staking has no first-day reward and supports claims without resetting its clock",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  await s.connect(f.a).stake(amount,0);const p=await s.positions(1);
  await time(f,Number(p.started)+day-2);
  await assert.rejects(s.connect(f.a).claim(1),/NoReward/);
  await time(f,Number(p.started)+day);
  await assert.rejects(s.connect(f.a).claim(1),/NoReward/);
  await settle(f);const daily=await s.quote(amount,0);
  await s.connect(f.a).claim(1);
  assert.equal(await s.paidRewards(),daily);
  assert.equal((await s.positions(1)).started,p.started);
  await time(f,Number(p.started)+2*day);await settle(f);
  const before=await f.token.balanceOf(f.a.address);await s.connect(f.a).withdraw(1);
  assert.equal(await f.token.balanceOf(f.a.address),before+amount+daily);
  await invariant(f);
});

behaviorTest("Flexible exit before 24h pays only principal",async()=>{
  const f=await setup(),s=f.staking,amount=unit;
  await s.connect(f.a).stake(amount,0);const before=await f.token.balanceOf(f.a.address);
  await s.connect(f.a).withdraw(1);
  assert.equal(await f.token.balanceOf(f.a.address),before+amount);
  assert.equal(await s.paidRewards(),0n);await invariant(f);
});

behaviorTest("Exhausted flexible allocation is pro rata independent of claim order and locked promises survive",async()=>{
  const f=await setup(),s=f.staking;
  await s.connect(f.a).stake(10_000_000n*unit,3);
  const locked=await s.positions(1);
  await s.connect(f.a).stake(100_000_000n*unit,0);
  await s.connect(f.b).stake(200_000_000n*unit,0);
  const p=await s.positions(3);await time(f,Number(p.started)+1000*365*day);
  await settle(f,1);
  assert.equal(await s.freeRewards(),0n);
  assert.equal(await s.reservedLocked(),locked.reward);
  const pa=await s.positions(2),pb=await s.positions(3);
  assert.equal(pa.reward+pb.reward,cap-locked.reward);
  assert(pb.reward>pa.reward);
  await assert.rejects(s.connect(f.a).stake(unit,1),/InsufficientRewards/);
  await s.connect(f.b).claim(3);await s.connect(f.a).claim(2);
  assert.equal(await s.owedFlexible(),0n);
  await s.connect(f.a).withdraw(1);await invariant(f);
});

behaviorTest("Bounded checkpoints freeze mutation and anyone may complete settlement",async()=>{
  const f=await setup(),s=f.staking;
  for(let i=0;i<4;i++)await s.connect(f.a).stake(unit,0);
  const p=await s.positions(4);await time(f,Number(p.started)+day);
  await assert.rejects(s.checkpoint(0),/InvalidBatch/);await assert.rejects(s.checkpoint(65),/InvalidBatch/);
  await s.connect(f.outsider).checkpoint(1);
  await assert.rejects(s.connect(f.a).withdraw(1),/CheckpointRequired/);
  await assert.rejects(s.connect(f.a).stake(unit,1),/CheckpointRequired/);
  await settle(f,1);await s.connect(f.a).withdraw(1);await invariant(f);
});

behaviorTest("Emergency closure needs two harness approvals and permanently burns only surplus",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  await s.connect(f.a).stake(amount,3);const p=await s.positions(1);
  await time(f,Number(p.started)+20*day+6*3600);
  await assert.rejects(s.connect(f.a).emergencyClose(),/NotGovernance/);
  const to=await s.getAddress(),data=s.interface.encodeFunctionData("emergencyClose");
  await f.safe.connect(f.a).confirm(to,data);
  await assert.rejects(f.safe.execute(to,data),/two approvals required/);
  await f.safe.connect(f.b).confirm(to,data);const supply=await f.token.totalSupply();await f.safe.execute(to,data);
  await settle(f,1);
  const at=await s.shutdownAt(),earned=amount*1200n*(at-p.started)/(10000n*year);
  assert.equal((await s.positions(1)).reward,earned);
  assert.equal(await s.burnedRewards(),cap-earned);
  assert.equal(await f.token.totalSupply(),supply-(cap-earned));
  await assert.rejects(s.connect(f.a).stake(unit,0),/Closed/);
  const before=await f.token.balanceOf(f.a.address);await s.connect(f.a).withdraw(1);
  assert.equal(await f.token.balanceOf(f.a.address),before+amount+earned);await invariant(f);
});

behaviorTest("Emergency flexible reward remains daily, preserves prior claims and protects delayed withdrawals",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  await s.connect(f.a).stake(amount,0);const p=await s.positions(1);
  await time(f,Number(p.started)+day);await settle(f);await s.connect(f.a).claim(1);
  await s.connect(f.b).stake(amount,0);
  await close(f);await settle(f);
  assert.equal((await s.positions(2)).reward,0n);
  const at=await s.shutdownAt();await time(f,Number(at)+1000*day);
  await s.connect(f.a).withdraw(1);await s.connect(f.b).withdraw(2);await invariant(f);
});

behaviorTest("Direct donations never enlarge the reward cap",async()=>{
  const f=await setup(),s=f.staking;
  await f.token.transfer(await s.getAddress(),unit);
  assert.equal(await s.freeRewards(),cap);
  await close(f);assert.equal(await s.shutdownFinalized(),true);
  assert.equal(await s.burnedRewards(),cap);
  assert.equal(await f.token.balanceOf(await s.getAddress()),unit);
  await invariant(f);
});

behaviorTest("Recycled locked rewards reopen admissions without paying the flexible paused interval",async()=>{
  const f=await setup(),s=f.staking,amount=100_000_000n*unit;
  await s.connect(f.a).stake(amount,0);await s.connect(f.b).stake(amount,0);
  const p=await s.positions(2),daily=2n*await s.quote(amount,0);
  const daysToReserve=(cap-100_000n*unit)/daily;
  await time(f,Number(p.started)+Number(daysToReserve)*day);await settle(f);
  await s.connect(f.a).stake(100_000n*unit,3);
  const lock=await s.positions(3);
  const extraDays=Number(await s.freeRewards()/daily)+2;
  await time(f,Number(lock.started)+extraDays*day);await settle(f);
  assert.equal(await s.freeRewards(),0n);
  assert(BigInt(Number(lock.started)+extraDays*day)<lock.ends);
  const pausedReward=(await s.positions(1)).reward;
  await time(f,Number(lock.started)+(extraDays+1)*day);
  await s.checkpoint(1);
  await s.connect(f.a).withdrawPrincipal(3);
  assert.equal(await s.flexPaused(),true);
  await settle(f,1);
  assert.equal(await s.flexPaused(),false);
  assert.equal((await s.positions(1)).reward,pausedReward);
  assert.equal(await s.freeRewards(),lock.reward);
  const before=(await s.positions(1)).reward;
  await s.connect(f.a).stake(unit,1);
  assert.equal((await s.positions(1)).reward,before);
  await invariant(f);
});

behaviorTest("Zero-rounded flexible positions do not enlarge daily checkpoint work",async()=>{
  const f=await setup(),s=f.staking;
  await s.connect(f.a).stake(1n,0);const p=await s.positions(1);
  assert.equal(await s.nextFlexibleDue(),f.ethers.MaxUint256);
  await time(f,Number(p.started)+5*day);await s.connect(f.a).withdraw(1);await invariant(f);
});

behaviorTest("More than one batch of positions closes without an unbounded transaction",async()=>{
  const f=await setup(),s=f.staking;
  for(let i=0;i<70;i++)await s.connect(f.a).stake(unit,1);
  await close(f);
  await s.checkpoint(64);assert.equal(await s.shutdownFinalized(),false);
  await settle(f,64);assert.equal(await s.shutdownFinalized(),true);
  await s.connect(f.a).withdraw(70);await invariant(f);
});

behaviorTest("Staking emergency with no positions burns the entire reward cap immediately",async()=>{
  const f=await setup(), before=await f.token.totalSupply();
  await close(f);
  assert.equal(await f.staking.shutdownFinalized(),true);
  assert.equal(await f.staking.phase(),0n);
  assert.equal(await f.staking.burnedRewards(),cap);
  assert.equal(await f.token.balanceOf(await f.staking.getAddress()),0n);
  assert.equal(await f.token.totalSupply(),before-cap);
  await invariant(f);
});

behaviorTest("Principal-only flexible exit is immediate, stops accrual and never pays principal twice",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  await s.connect(f.a).stake(amount,0);const p=await s.positions(1);
  await time(f,Number(p.started)+2*day+3600);
  const before=await f.token.balanceOf(f.a.address);
  await assert.rejects(s.connect(f.b).withdrawPrincipal(1),/NotHolder/);
  await s.connect(f.a).withdrawPrincipal(1);
  assert.equal(await f.token.balanceOf(f.a.address),before+amount);
  assert.equal(await s.totalPrincipal(),0n);
  await assert.rejects(s.connect(f.a).withdrawPrincipal(1),/PrincipalAlreadyWithdrawn/);
  await time(f,Number(p.started)+10*day);await settle(f,1);
  const expected=2n*await s.quote(amount,0);
  assert.equal((await s.positions(1)).reward,expected);
  const balance=await f.token.balanceOf(f.a.address);
  await s.connect(f.a).withdraw(1);
  assert.equal(await f.token.balanceOf(f.a.address),balance+expected);
  assert.equal(await s.totalPrincipal(),0n);await invariant(f);
});

behaviorTest("Principal exits and allocated claims cannot invalidate either checkpoint pass",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  for(let i=0;i<4;i++)await s.connect(f.a).stake(amount,0);
  await s.connect(f.a).stake(amount,3);
  const p=await s.positions(4);await time(f,Number(p.started)+2*day+3600);
  await s.checkpoint(1);assert.equal(await s.phase(),1n);
  await s.connect(f.a).withdrawPrincipal(5);
  assert.equal(await s.reservedLocked(),0n);
  assert.equal((await s.positions(5)).reward,0n);
  await s.connect(f.a).withdrawPrincipal(1); // already scanned
  await s.connect(f.a).withdrawPrincipal(2); // not scanned
  await invariant(f);
  assert.equal(await s.checkpointFullBudget(),true); // first position allocated during scan
  const reward=(await s.positions(1)).reward;
  assert.equal(reward,2n*await s.quote(amount,0));
  await s.connect(f.a).claim(1);await invariant(f);
  await s.connect(f.a).withdrawPrincipal(3); // not yet scanned
  await settle(f,1);
  await s.connect(f.a).withdraw(1);await s.connect(f.a).withdraw(2);await s.connect(f.a).withdraw(3);
  assert.equal(await s.totalPrincipal(),amount);
  assert.equal(await s.paidRewards(),3n*reward);await invariant(f);
});

behaviorTest("Early locked principal exit remains forfeited if emergency happens before reward cleanup",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  await s.connect(f.a).stake(amount,3);
  await s.connect(f.a).withdrawPrincipal(1);
  assert.equal(await s.forfeitedRewards(1),true);
  assert.equal(await s.reservedLocked(),0n);
  assert.equal(await s.freeRewards(),cap);
  await close(f);await settle(f,1);
  assert.equal((await s.positions(1)).reward,0n);
  assert.equal(await s.burnedRewards(),cap);
  const balance=await f.token.balanceOf(f.a.address);
  await s.connect(f.a).withdraw(1);
  assert.equal(await f.token.balanceOf(f.a.address),balance);
  await invariant(f);
});

behaviorTest("Emergency principal exits preserve locked and flexible cutoff rewards and the burn budget",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  await s.connect(f.a).stake(amount,3);await s.connect(f.a).stake(amount,0);
  const locked=await s.positions(1),flex=await s.positions(2);
  await time(f,Number(flex.started)+20*day+3600);
  await close(f);const at=await s.shutdownAt();
  await s.checkpoint(1);
  await s.connect(f.a).withdrawPrincipal(1);
  await s.connect(f.a).withdrawPrincipal(2);
  assert.equal(await s.totalPrincipal(),0n);
  assert.equal(await s.forfeitedRewards(1),false);
  await invariant(f);await settle(f,1);
  const lockReward=amount*1200n*(at-locked.started)/(10000n*year);
  const flexReward=((at-flex.started)/BigInt(day))*await s.quote(amount,0);
  assert.equal((await s.positions(1)).reward,lockReward);
  assert.equal((await s.positions(2)).reward,flexReward);
  assert.equal(await s.burnedRewards(),cap-lockReward-flexReward);
  await s.connect(f.a).withdraw(1);await s.connect(f.a).withdraw(2);await invariant(f);
});

behaviorTest("Principal exit during exhausted pro-rata allocation preserves both holders' reward shares",async()=>{
  const f=await setup(),s=f.staking;
  await s.connect(f.a).stake(100_000_000n*unit,0);
  await s.connect(f.b).stake(200_000_000n*unit,0);
  const p=await s.positions(2);await time(f,Number(p.started)+1000*365*day);
  await s.checkpoint(1);await s.connect(f.a).withdrawPrincipal(1);
  await s.checkpoint(1);await s.connect(f.b).withdrawPrincipal(2);
  await s.checkpoint(1);await s.connect(f.a).claim(1);
  await s.checkpoint(1);
  const paid=await s.paidRewards(),remaining=(await s.positions(2)).reward;
  assert.equal(paid+remaining,cap);assert(remaining>paid);
  await s.connect(f.b).claim(2);
  await s.connect(f.a).withdraw(1);await s.connect(f.b).withdraw(2);await invariant(f);
});

behaviorTest("Locked maturity withdrawal is independent of other holders' overdue flexible boundaries",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  await s.connect(f.a).stake(amount,1);const p=await s.positions(1);
  await s.connect(f.b).stake(amount,0);
  await time(f,Number(p.ends)+1);
  const before=await f.token.balanceOf(f.a.address);
  await s.connect(f.a).withdraw(1);
  assert.equal(await f.token.balanceOf(f.a.address),before+amount+p.reward);
  await invariant(f);
});

behaviorTest("A day completed between checkpoint snapshot and principal exit stays scheduled for allocation",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  await s.connect(f.a).stake(amount,0);
  await s.connect(f.a).stake(amount,0);const second=await s.positions(2);
  await s.connect(f.a).stake(amount,0);const third=await s.positions(3);
  await time(f,Number(second.started)+day-1);
  await s.checkpoint(1);
  assert((await s.checkpointAt())<third.started+BigInt(day));
  assert.equal(await s.phase(),1n);
  await time(f,Number(third.started)+day+3600);
  await s.connect(f.a).withdrawPrincipal(3);
  await settle(f,1);
  assert.equal((await s.positions(3)).reward,0n);
  assert((await s.nextFlexibleDue())<=await s.exitedAt(3));
  await settle(f,1);
  assert.equal((await s.positions(3)).reward,await s.quote(amount,0));
  await s.connect(f.a).withdraw(3);await invariant(f);
});

behaviorTest("Inactive deadline entries are pruned once without accrual or aggregate-rate drift",async()=>{
 const f=await setup(),s=f.staking,amount=100_000n*unit;
 await s.connect(f.a).stake(amount,0);await s.connect(f.a).stake(amount,0);const p=await s.positions(2);
 const daily=await s.quote(amount,0);await s.connect(f.a).withdraw(1);
 assert.equal(await s.dailyFlexibleRate(),daily);
 assert.equal(await s.scheduledFlexibleCount(),2n); // includes a lazily pruned entry
 await time(f,Number(p.started)+day+3600);await settle(f,1);
 assert.equal(await s.scheduledFlexibleCount(),1n);
 assert.equal(await s.dailyFlexibleRate(),daily);
 assert.equal((await s.positions(2)).reward,daily);
 assert.equal((await s.positions(1)).reward,0n);await invariant(f);
});

// Exact transaction timestamps matter: mining first would advance the withdrawal by a second.
for (const mode of [1,2,3]) for (const offset of [-1,0]) {
 behaviorTest(`Locked mode ${mode} withdrawal at maturity ${offset}s uses the exact reward boundary`,async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  await s.connect(f.a).stake(amount,mode);const p=await s.positions(1);
  const before=await f.token.balanceOf(f.a.address);
  await f.connection.provider.send("evm_setNextBlockTimestamp",[Number(p.ends)+offset]);
  const receipt=await(await s.connect(f.a).withdraw(1)).wait();
  const block=await f.ethers.provider.getBlock(receipt!.blockNumber);
  assert.equal(block!.timestamp,Number(p.ends)+offset);
  const reward=offset<0?0n:p.reward;
  assert.equal(await f.token.balanceOf(f.a.address),before+amount+reward);
  assert.equal(await s.paidRewards(),reward);
  assert.equal(await s.reservedLocked(),0n);
  assert.equal(await s.totalPrincipal(),0n);
  await invariant(f);
 });
}

behaviorTest("Flexible claims reject a foreign holder and repeated payment without altering liabilities",async()=>{
 const f=await setup(),s=f.staking,amount=100_000n*unit;
 await s.connect(f.a).stake(amount,0);const p=await s.positions(1);
 await time(f,Number(p.started)+day+3600);await settle(f);
 const reward=(await s.positions(1)).reward,before=await f.token.balanceOf(f.a.address);
 await assert.rejects(s.connect(f.b).claim(1),/NotHolder/);
 assert.equal((await s.positions(1)).reward,reward);
 await s.connect(f.a).claim(1);
 await assert.rejects(s.connect(f.a).claim(1),/NoReward/);
 assert.equal(await f.token.balanceOf(f.a.address),before+reward);
 assert.equal(await s.paidRewards(),reward);
 assert.equal(await s.totalPrincipal(),amount);
 await s.connect(f.a).withdrawPrincipal(1);await s.connect(f.a).withdraw(1);
 await assert.rejects(s.connect(f.a).claim(1),/InvalidPosition/);
 await invariant(f);
});

behaviorTest("Exhausted multi-holder allocations are identical for batches of 1 and 64",async()=>{
 const f=await setup(),s=f.staking;
 for(const [user,amount]of [[f.a,99_999_999n*unit+17n],[f.b,199_999_999n*unit+31n],[f.a,37_000_003n*unit+7n]] as const)
  await s.connect(user).stake(amount,0);
 const p=await s.positions(3);await time(f,Number(p.started)+1000*365*day);
 const snapshot=await f.connection.provider.send("evm_snapshot",[]);
 const result=async(batch:number)=>{
  await settle(f,batch);await invariant(f);
  return [await s.freeRewards(),await s.owedFlexible(),...(await Promise.all([1,2,3].map(async id=>(await s.positions(id)).reward)))];
 };
 const small=await result(1);
 assert.equal(await f.connection.provider.send("evm_revert",[snapshot]),true);
 const large=await result(64);
 assert.deepEqual(small,large);
 assert.equal(large[0],0n);assert.equal(large[1],cap);
 assert.equal(large[2]+large[3]+large[4],cap);
 for(const [id,user]of [[3,f.a],[1,f.a],[2,f.b]] as const)await s.connect(user).claim(id);
 assert.equal(await s.paidRewards(),cap);assert.equal(await s.owedFlexible(),0n);
 await invariant(f);
});

}
