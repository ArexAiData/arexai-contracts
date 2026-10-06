import assert from "node:assert/strict";
import { test } from "node:test";
import { network } from "hardhat";

const U=10n**18n, CAP=115_000_000n*U, DAY=86400, YEAR=365n*86400n;
const rates=[200n,500n,800n,1200n], terms=[0,30*DAY,60*DAY,90*DAY];
type Position={holder:number;principal:bigint;started:number;ends:number;mode:number;days:number;reward:bigint;active:boolean};
const quote=(amount:bigint,mode:number,seconds:number)=>amount*rates[mode]*BigInt(seconds)/(10000n*YEAR);

for(const seed of [17,2026,64091,0xA4E]) {
  test(`Staking seeded model ${seed}: mixed users, terms, time, claims, exits and closure conserve balances`,async()=>{
    const {ethers,provider}=await network.create("hardhatMainnet");
    const [treasury,...signers]=await ethers.getSigners(),users=signers.slice(0,3);
    const token=await ethers.deployContract("contracts/verified/ArexAIToken.sol:ArexAIToken",[treasury.address]);
    const safe=await ethers.deployContract("StakingSafeHarness",users.map(u=>u.address));
    const s=await ethers.deployContract("ArexAIStaking",[await token.getAddress(),await safe.getAddress()]);
    await token.approve(await s.getAddress(),CAP);await s.fundAndActivate();
    const balances=users.map(()=>200_000_000n*U);
    for(const u of users){await token.transfer(u.address,balances[0]);await token.connect(u).approve(await s.getAddress(),ethers.MaxUint256);}
    const model=new Map<number,Position>();let paid=0n,burned=0n,closed=false,state=seed>>>0;
    const random=(max:number)=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state%max;};
    const now=async()=>Number(BigInt((await provider.send("eth_getBlockByNumber",["latest",false]) as {timestamp:string}).timestamp));
    async function invariant(comparePositions=true){
      const principal=Array.from(model.values()).filter(p=>p.active).reduce((a,p)=>a+p.principal,0n);
      assert.equal(await s.totalPrincipal(),principal);
      const free=await s.freeRewards(),locked=await s.reservedLocked(),owed=await s.owedFlexible();
      assert.equal(free+locked+owed+await s.paidRewards()+await s.burnedRewards(),CAP);
      assert.equal(await token.balanceOf(await s.getAddress()),principal+free+locked+owed);
      assert.equal(await token.totalSupply(),1_000_000_000n*U-await s.burnedRewards());
      for(let i=0;i<users.length;i++)assert.equal(await token.balanceOf(users[i].address),balances[i]);
      if(!comparePositions)return;
      assert.equal(await s.paidRewards(),paid);assert.equal(await s.burnedRewards(),burned);
      const active=Array.from(model.entries()).filter(([,p])=>p.active);
      assert.equal(await s.activeCount(),BigInt(active.length));
      assert.equal(locked,active.filter(([,p])=>p.mode!==0).reduce((a,[,p])=>a+p.reward,0n));
      assert.equal(owed,active.filter(([,p])=>p.mode===0).reduce((a,[,p])=>a+p.reward,0n));
      for(const [id,p] of model){const actual=await s.positions(id);assert.equal(actual.active,p.active);assert.equal(actual.principal,p.active?p.principal:0n);assert.equal(actual.reward,p.active?p.reward:0n);}
    }
    async function settle(){
      if(await s.phase()===0n && (await s.shutdownFinalized()||(!closed&&BigInt(await now())<await s.nextFlexibleDue())))return;
      do {await s.checkpoint(1+random(64));await invariant(false);}while(await s.phase()!==0n);
      const at=Number(await s.checkpointAt());
      for(const p of model.values())if(p.active){
        if(p.mode===0){const days=Math.floor((at-p.started)/DAY);p.reward+=(BigInt(days-p.days)*quote(p.principal,0,DAY));p.days=days;}
        else if(closed)p.reward=quote(p.principal,p.mode,Math.min(at,p.ends)-p.started);
      }
      if(closed){const liabilities=Array.from(model.values()).filter(p=>p.active).reduce((a,p)=>a+p.reward,0n);burned=CAP-paid-liabilities;}
      await invariant();
    }
    for(let step=0;step<60;step++){
      await settle();
      const active=Array.from(model.entries()).filter(([,p])=>p.active),operation=random(5);
      if(operation===0||active.length===0){
        const holder=random(3),mode=random(4),amount=BigInt(100+random(50_000))*U;
        const id=Number(await s.nextId());await s.connect(users[holder]).stake(amount,mode);const started=await now();
        model.set(id,{holder,mode,principal:amount,started,ends:mode===0?0:started+terms[mode],days:0,reward:mode===0?0n:quote(amount,mode,terms[mode]),active:true});balances[holder]-=amount;
      }else if(operation===1){
        const advance=1+random(15*DAY);await provider.send("evm_setNextBlockTimestamp",[await now()+advance]);await provider.send("evm_mine",[]);await settle();
      }else if(operation===2){
        const [id,p]=active[random(active.length)];
        if(p.mode===0&&p.reward>0n){const reward=p.reward;await s.connect(users[p.holder]).claim(id);balances[p.holder]+=reward;paid+=reward;p.reward=0n;}
        else if(p.mode!==0)await assert.rejects(s.connect(users[p.holder]).claim(id),/WrongMode/);
        else await assert.rejects(s.connect(users[p.holder]).claim(id),/NoReward/);
      }else if(operation===3){
        const [id,p]=active[random(active.length)];await s.connect(users[p.holder]).withdraw(id);
        const reward=p.mode===0||await now()>=p.ends?p.reward:0n;balances[p.holder]+=p.principal+reward;paid+=reward;p.active=false;
        await assert.rejects(s.connect(users[p.holder]).withdraw(id),/InvalidPosition/);
      }else{
        const [id,p]=active[random(active.length)];await assert.rejects(s.connect(users[(p.holder+1)%3]).withdraw(id),/NotHolder/);
      }
      await invariant();
    }
    await settle();const to=await s.getAddress(),data=s.interface.encodeFunctionData("emergencyClose");
    await safe.connect(users[0]).confirm(to,data);await safe.connect(users[1]).confirm(to,data);await safe.execute(to,data);closed=true;
    if(await s.shutdownFinalized())burned=CAP-paid;else await settle();
    await invariant();await assert.rejects(s.connect(users[0]).stake(U,0),/Closed/);
    for(const [id,p] of model)if(p.active){await s.connect(users[p.holder]).withdraw(id);balances[p.holder]+=p.principal+p.reward;paid+=p.reward;p.active=false;await invariant();}
    assert.equal(await s.totalPrincipal(),0n);assert.equal(await token.balanceOf(to),0n);assert.equal(paid+burned,CAP);
  });
}
