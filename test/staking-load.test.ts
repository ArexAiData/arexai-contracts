import assert from "node:assert/strict";
import { test } from "node:test";
import { writeFileSync } from "node:fs";
import { network } from "hardhat";

const U=10n**18n,CAP=115_000_000n*U,DAY=86400;
type Measurement={positions:number;kind:string;transactions:number;maximumGas:string;totalGas:string;firstWithdrawalBlocked:boolean;withdrawalGas:string;withdrawalGasKind:string};
const measurements:Measurement[]=[];
for(const count of [1,64,256])test(`Staking load: ${count} positions settle in bounded batches and unlock withdrawal`,async()=>{
  const {ethers,provider}=await network.create("hardhatMainnet");
  const [treasury,a,b,c]=await ethers.getSigners();
  const token=await ethers.deployContract("contracts/verified/ArexAIToken.sol:ArexAIToken",[treasury.address]);
  const safe=await ethers.deployContract("StakingSafeHarness",[a.address,b.address,c.address]);
  const s=await ethers.deployContract("ArexAIStaking",[await token.getAddress(),await safe.getAddress()]);
  await token.approve(await s.getAddress(),CAP);await s.fundAndActivate();await token.transfer(a.address,1_000_000n*U);await token.connect(a).approve(await s.getAddress(),ethers.MaxUint256);
  // Isolated networks: every position is eligible; no donation, exhaustion or real chain state.
  for(let i=0;i<count;i++)await s.connect(a).stake(100n*U,0);
  const last=await s.positions(count);await provider.send("evm_setNextBlockTimestamp",[Number(last.started)+2*DAY+3600]);await provider.send("evm_mine",[]);
  await assert.rejects(s.connect(a).withdraw(1),/CheckpointRequired/);
  async function batches(kind:string){
    const gases:bigint[]=[];
    do {const receipt=await(await s.checkpoint(64)).wait();gases.push(receipt!.gasUsed);assert.equal(await s.freeRewards()+await s.reservedLocked()+await s.owedFlexible()+await s.paidRewards()+await s.burnedRewards(),CAP);}while(await s.phase()!==0n);
    assert.equal(gases.length,Math.ceil(2*count/64));
    // A reproducible availability ceiling for these fixtures, not a production gas guarantee.
    assert(gases.every(g=>g<8_000_000n));
    return {positions:count,kind,transactions:gases.length,maximumGas:String(gases.reduce((a,g)=>g>a?g:a,0n)),totalGas:String(gases.reduce((a,g)=>a+g,0n)),firstWithdrawalBlocked:true,withdrawalGas:"",withdrawalGasKind:""};
  }
  const normal=await batches("normal-flexible-checkpoint");
  normal.withdrawalGas=String(await s.connect(a).withdraw.estimateGas(1));normal.withdrawalGasKind="estimate before emergency";
  // Confirm holder access returns; a claim keeps the position count fixed for shutdown measurement.
  const claim=await(await s.connect(a).claim(1)).wait();assert(claim!.gasUsed>0n);
  const to=await s.getAddress(),data=s.interface.encodeFunctionData("emergencyClose");
  await safe.connect(a).confirm(to,data);await safe.connect(b).confirm(to,data);await safe.execute(to,data);
  await assert.rejects(s.connect(a).withdraw(1),/CheckpointRequired/);
  const emergency=await batches("emergency-flexible-checkpoint");assert.equal(await s.shutdownFinalized(),true);
  const withdrawal=await(await s.connect(a).withdraw(1)).wait();emergency.withdrawalGas=String(withdrawal!.gasUsed);emergency.withdrawalGasKind="receipt after emergency";
  measurements.push(normal,emergency);
  if(process.env.STAKING_LOAD_REPORT)writeFileSync(process.env.STAKING_LOAD_REPORT,JSON.stringify({scope:"Local EDR simulated fixture; Paris EVM, solc 0.8.24, optimizer 200; no token/BNB price estimate",batchSize:64,measurements},null,2)+"\n");
});
