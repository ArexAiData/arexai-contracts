import assert from "node:assert/strict";
import { test } from "node:test";
import { network } from "hardhat";

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
  const staking = await ethers.deployContract("ArexAIStaking", [await token.getAddress(),await safe.getAddress()]);
  if (fund) { await token.approve(await staking.getAddress(), cap); await staking.fundAndActivate(); }
  await token.transfer(a.address, 400_000_000n*unit);
  await token.transfer(b.address, 400_000_000n*unit);
  for (const user of [a,b]) await token.connect(user).approve(await staking.getAddress(),ethers.MaxUint256);
  return {connection, ethers, treasury,a,b,c,outsider,token,safe,staking};
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

test("Staking rejects EOAs as governance, requires full funding and has immutable rates",async()=>{
  const f=await setup(false),s=f.staking;
  await assert.rejects(f.ethers.deployContract("ArexAIStaking",[await f.token.getAddress(),f.a.address]),/InvalidConfiguration/);
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

test("Staking quotes all agreed terms using a 365-day simple APR",async()=>{
  const f=await setup(), amount=10_000_000n*unit;
  for(const [m,bps,seconds]of [[0,200,day],[1,500,30*day],[2,800,60*day],[3,1200,90*day]]) {
    assert.equal(await f.staking.quote(amount,m),amount*BigInt(bps)*BigInt(seconds)/(10000n*year));
  }
  assert.equal(await f.staking.quote(amount,3),295890410958904109589041n);
});

test("Staking allows independent deposits without a 5M cap and protects holder ownership",async()=>{
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

test("Locked staking early exit returns principal only and recycles the entire reserved reward",async()=>{
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

test("All locked terms pay their fixed reward at maturity and stop accruing afterwards",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  for(const mode of [1,2,3])await s.connect(f.a).stake(amount,mode);
  const p=await s.positions(3);await time(f,Number(p.ends)+180*day);
  const before=await f.token.balanceOf(f.a.address);
  let rewards=0n;for(const id of [1,2,3]){rewards+=(await s.positions(id)).reward;await s.connect(f.a).withdraw(id);}
  assert.equal(await f.token.balanceOf(f.a.address),before+3n*amount+rewards);
  await invariant(f);
});

test("Flexible staking has no first-day reward and supports claims without resetting its clock",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  await s.connect(f.a).stake(amount,0);const p=await s.positions(1);
  await time(f,Number(p.started)+day-2);
  await assert.rejects(s.connect(f.a).claim(1),/NoReward/);
  await time(f,Number(p.started)+day);
  await assert.rejects(s.connect(f.a).claim(1),/CheckpointRequired/);
  await settle(f);const daily=await s.quote(amount,0);
  await s.connect(f.a).claim(1);
  assert.equal(await s.paidRewards(),daily);
  assert.equal((await s.positions(1)).started,p.started);
  await time(f,Number(p.started)+2*day);await settle(f);
  const before=await f.token.balanceOf(f.a.address);await s.connect(f.a).withdraw(1);
  assert.equal(await f.token.balanceOf(f.a.address),before+amount+daily);
  await invariant(f);
});

test("Flexible exit before 24h pays only principal",async()=>{
  const f=await setup(),s=f.staking,amount=unit;
  await s.connect(f.a).stake(amount,0);const before=await f.token.balanceOf(f.a.address);
  await s.connect(f.a).withdraw(1);
  assert.equal(await f.token.balanceOf(f.a.address),before+amount);
  assert.equal(await s.paidRewards(),0n);await invariant(f);
});

test("Exhausted flexible allocation is pro rata independent of claim order and locked promises survive",async()=>{
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

test("Bounded checkpoints freeze mutation and anyone may complete settlement",async()=>{
  const f=await setup(),s=f.staking;
  for(let i=0;i<4;i++)await s.connect(f.a).stake(unit,0);
  const p=await s.positions(4);await time(f,Number(p.started)+day);
  await assert.rejects(s.checkpoint(0),/InvalidBatch/);await assert.rejects(s.checkpoint(65),/InvalidBatch/);
  await s.connect(f.outsider).checkpoint(1);
  await assert.rejects(s.connect(f.a).withdraw(1),/CheckpointRequired/);
  await assert.rejects(s.connect(f.a).stake(unit,1),/CheckpointRequired/);
  await settle(f,1);await s.connect(f.a).withdraw(1);await invariant(f);
});

test("Emergency closure needs two harness approvals and permanently burns only surplus",async()=>{
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

test("Emergency flexible reward remains daily, preserves prior claims and protects delayed withdrawals",async()=>{
  const f=await setup(),s=f.staking,amount=100_000n*unit;
  await s.connect(f.a).stake(amount,0);const p=await s.positions(1);
  await time(f,Number(p.started)+day);await settle(f);await s.connect(f.a).claim(1);
  await s.connect(f.b).stake(amount,0);
  await close(f);await settle(f);
  assert.equal((await s.positions(2)).reward,0n);
  const at=await s.shutdownAt();await time(f,Number(at)+1000*day);
  await s.connect(f.a).withdraw(1);await s.connect(f.b).withdraw(2);await invariant(f);
});

test("Direct donations never enlarge the reward cap",async()=>{
  const f=await setup(),s=f.staking;
  await f.token.transfer(await s.getAddress(),unit);
  assert.equal(await s.freeRewards(),cap);
  await close(f);assert.equal(await s.shutdownFinalized(),true);
  assert.equal(await s.burnedRewards(),cap);
  assert.equal(await f.token.balanceOf(await s.getAddress()),unit);
  await invariant(f);
});

test("Recycled locked rewards reopen admissions without paying the flexible paused interval",async()=>{
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
  await s.connect(f.a).withdraw(3);
  assert.equal(await s.freeRewards(),lock.reward);
  const before=(await s.positions(1)).reward;
  await s.connect(f.a).stake(unit,1);
  assert.equal((await s.positions(1)).reward,before);
  await invariant(f);
});

test("Zero-rounded flexible positions do not enlarge daily checkpoint work",async()=>{
  const f=await setup(),s=f.staking;
  await s.connect(f.a).stake(1n,0);const p=await s.positions(1);
  assert.equal(await s.nextFlexibleDue(),f.ethers.MaxUint256);
  await time(f,Number(p.started)+5*day);await s.connect(f.a).withdraw(1);await invariant(f);
});

test("More than one batch of positions closes without an unbounded transaction",async()=>{
  const f=await setup(),s=f.staking;
  for(let i=0;i<70;i++)await s.connect(f.a).stake(unit,1);
  await close(f);
  await s.checkpoint(64);assert.equal(await s.shutdownFinalized(),false);
  await settle(f,64);assert.equal(await s.shutdownFinalized(),true);
  await s.connect(f.a).withdraw(70);await invariant(f);
});
