import assert from "node:assert/strict";
import {test} from "node:test";
import {writeFileSync} from "node:fs";
import {network} from "hardhat";

test("Staking boundary load exposes repeat settlements before holder access can resume",async()=>{
 const {ethers,provider}=await network.create("hardhatMainnet");const [treasury,a,b,c]=await ethers.getSigners();const U=10n**18n;
 const token=await ethers.deployContract("contracts/verified/ArexAIToken.sol:ArexAIToken",[treasury.address]);
 const safe=await ethers.deployContract("StakingSafeHarness",[a.address,b.address,c.address]);
 const s=await ethers.deployContract("ArexAIStaking",[await token.getAddress(),await safe.getAddress()]);
 await token.approve(await s.getAddress(),115_000_000n*U);await s.fundAndActivate();await token.transfer(a.address,100_000n*U);await token.connect(a).approve(await s.getAddress(),ethers.MaxUint256);
 for(let i=0;i<64;i++)await s.connect(a).stake(100n*U,0);
 const first=await s.positions(1);await provider.send("evm_setNextBlockTimestamp",[Number(first.started)+2*86400]);await provider.send("evm_mine",[]);
 let rounds=0,transactions=0,totalGas=0n,reblocked=false;
 const now=async()=>BigInt((await provider.send("eth_getBlockByNumber",["latest",false]) as {timestamp:string}).timestamp);
 do {
   do{const receipt=await(await s.checkpoint(64)).wait();totalGas+=receipt!.gasUsed;transactions++;}while(await s.phase()!==0n);
   rounds++;
   if(rounds===1){assert((await s.nextFlexibleDue())<=await now());await assert.rejects(s.connect(a).claim(1),/CheckpointRequired/);reblocked=true;}
   assert(rounds<100,"Bounded fixture failed to catch up");
 }while(await s.nextFlexibleDue()<=await now()+1n);
 await s.connect(a).claim(1);
 assert(rounds>1);assert.equal(await s.freeRewards()+await s.reservedLocked()+await s.owedFlexible()+await s.paidRewards()+await s.burnedRewards(),115_000_000n*U);
 if(process.env.STAKING_BOUNDARY_REPORT)writeFileSync(process.env.STAKING_BOUNDARY_REPORT,JSON.stringify({scope:"Local fixture: 64 staggered deposits, simulated one-second block advances, first day boundary; not a production throughput forecast",positions:64,batchSize:64,rounds,transactions,totalGas:String(totalGas),reblockedAfterFirstRound:reblocked,claimEventuallySucceeded:true,limitation:"Phase Idle does not guarantee withdrawal/claim availability when another daily boundary has become due during the round."},null,2)+"\n");
});
