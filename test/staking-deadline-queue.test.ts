import assert from "node:assert/strict";
import {test} from "node:test";
import {network} from "hardhat";

test("Deadline queue matches an independent sorted model through root pruning and rescheduling",async()=>{
 const {ethers}=await network.create("hardhatMainnet");const q=await ethers.deployContract("StakingDeadlineQueueHarness");
 const model=new Map<number,number>();let seed=64091,id=1;
 const random=(n:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let step=0;step<500;step++){
   const sorted=()=>[...model].sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
   const op=random(3);
   if(op===0||model.size===0){const at=random(10000);await q.insert(id,at);model.set(id++,at);}
   else if(op===1){const [key,at]=sorted()[0],next=at+random(1000);await q.updateFirst(next);model.set(key,next);}
   else{const [key]=sorted()[0];await q.removeFirst();model.delete(key);}
   assert.equal(await q.length(),BigInt(model.size));
   const expected=sorted()[0];const actual=await q.first();
   assert.equal(actual[0],expected?BigInt(expected[0]):0n);
   assert.equal(actual[1],expected?BigInt(expected[1]):ethers.MaxUint256);
 }
});
test("Deadline queue enforces packed bounds, monotone deadlines and empty-root safety",async()=>{
 const {ethers}=await network.create("hardhatMainnet");const q=await ethers.deployContract("StakingDeadlineQueueHarness");
 await assert.rejects(q.insert(0,1));await assert.rejects(q.insert(1n<<192n,1));await assert.rejects(q.insert(1,1n<<64n));
 await q.insert(2,10);await q.insert(1,10);assert.equal((await q.first())[0],1n);await assert.rejects(q.updateFirst(9));
 await q.removeFirst();await q.removeFirst();assert.equal(await q.length(),0n);assert.equal((await q.first())[1],ethers.MaxUint256);
 await assert.rejects(q.removeFirst());
});
