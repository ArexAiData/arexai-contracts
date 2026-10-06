import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {network} from "hardhat";
import {Interface,ZeroAddress,id,zeroPadValue,getAddress} from "ethers";
// @ts-expect-error standalone JavaScript read-only verifier
import {verifySafe} from "../scripts/verify-safe.mjs";

test("Safe preflight rejects the getter-compatible test harness before treating it as genuine Safe",async()=>{
 const {ethers}=await network.create("hardhatMainnet");const [a,b,c]=await ethers.getSigners();
 const harness=await ethers.deployContract("StakingSafeHarness",[a.address,b.address,c.address]);
 const adapter={getNetwork:async()=>({chainId:56n}),getBlockNumber:async()=>123,getCode:async(address:string)=>ethers.provider.getCode(address)};
 await assert.rejects(verifySafe(adapter,await harness.getAddress(),[a.address,b.address,c.address]),/Proxy runtime/);
});

test("Safe strict policy accepts a pinned synthetic configuration and rejects bypass settings",async()=>{
 const proxy=JSON.parse(readFileSync("verification/safe/proxy-runtime-1.4.1.json","utf8")).deployedBytecode;
 const singletonCode=JSON.parse(readFileSync("verification/safe/singleton-runtime-1.4.1.json","utf8")).deployedBytecode;
 const singleton='0x41675C099F32341bf84BFc5382aF534df5C7461a',address=getAddress('0x1111111111111111111111111111111111111111');
 const owners=['0x2222222222222222222222222222222222222222','0x3333333333333333333333333333333333333333','0x4444444444444444444444444444444444444444'];
 const abi=new Interface(['function getOwners() view returns(address[])','function getThreshold() view returns(uint256)','function getModulesPaginated(address,uint256) view returns(address[],address)']);
 let threshold=2n,modules:string[]=[],guard=ZeroAddress,fallback=ZeroAddress,code=singletonCode;
 const provider={getNetwork:async()=>({chainId:56n}),getBlockNumber:async()=>123,
  getCode:async(a:string)=>a.toLowerCase()===address.toLowerCase()?proxy:code,
  getStorage:async(_a:string,slot:string|number)=>zeroPadValue(slot===0?singleton:slot===id('guard_manager.guard.address')?guard:fallback,32),
  call:async(tx:{data:string})=>{const parsed=abi.parseTransaction(tx)!;return abi.encodeFunctionResult(parsed.name,parsed.name==='getOwners'?[owners]:parsed.name==='getThreshold'?[threshold]:[modules,'0x0000000000000000000000000000000000000001']);}
 };
 const passed=await verifySafe(provider,address,owners);assert.equal(passed.status,'PINNED_SAFE_POLICY_PASSED');
 threshold=1n;await assert.rejects(verifySafe(provider,address,owners));threshold=2n;
 modules=[owners[0]];await assert.rejects(verifySafe(provider,address,owners),/Enabled modules/);modules=[];
 guard=owners[0];await assert.rejects(verifySafe(provider,address,owners),/guard/);guard=ZeroAddress;
 fallback=owners[0];await assert.rejects(verifySafe(provider,address,owners),/fallback/);fallback=ZeroAddress;
 code='0x00';await assert.rejects(verifySafe(provider,address,owners),/code hash/);code=singletonCode;
 await assert.rejects(verifySafe(provider,address,[owners[0],owners[1],address]),/Owners differ/);
});

test("Safe proxy evidence is pinned to official 1.4.1 and not the unrestricted harness",()=>{
 const proof=JSON.parse(readFileSync("verification/safe/proxy-runtime-1.4.1.json","utf8"));
 assert.equal(proof.package,"@safe-global/safe-contracts");assert.equal(proof.version,"1.4.1");
 assert.match(proof.deployedBytecode,/^0x[0-9a-f]+$/);assert(proof.deployedBytecode.length>100);
});
