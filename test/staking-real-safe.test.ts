import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {network} from 'hardhat';
import {frozenArtifact} from './helpers/frozen-staking.js';

// Execute pinned official Safe 1.4.1 and observed SafeL2 1.5.0 runtime locally.
// Runtime injection tests signatures/delegatecall, not factory deployment or current live configuration.
const legacyProxyCode=JSON.parse(readFileSync('verification/safe/proxy-runtime-1.4.1.json','utf8')).deployedBytecode;
const legacySingletonCode=JSON.parse(readFileSync('verification/safe/singleton-runtime-1.4.1.json','utf8')).deployedBytecode;
const legacySafeAbi=JSON.parse(readFileSync('node_modules/@safe-global/safe-deployments/dist/assets/v1.4.1/safe.json','utf8')).abi;
const types={SafeTx:[{name:'to',type:'address'},{name:'value',type:'uint256'},{name:'data',type:'bytes'},{name:'operation',type:'uint8'},{name:'safeTxGas',type:'uint256'},{name:'baseGas',type:'uint256'},{name:'gasPrice',type:'uint256'},{name:'gasToken',type:'address'},{name:'refundReceiver',type:'address'},{name:'nonce',type:'uint256'}]};
for(const version of ['1.4.1','1.5.0']) for(const frozen of [false,true]) {
 const label=`${frozen?'Frozen mainnet':'Development'} Safe ${version}`;
 const proxyCode=version==='1.4.1'?legacyProxyCode:JSON.parse(readFileSync('verification/safe/proxy-runtime-1.5.0.json','utf8')).deployedBytecode;
 const singletonCode=version==='1.4.1'?legacySingletonCode:JSON.parse(readFileSync('verification/safe/singleton-runtime-1.5.0.json','utf8')).deployedBytecode;
 const safeAbi=version==='1.4.1'?legacySafeAbi:JSON.parse(readFileSync('node_modules/@safe-global/safe-deployments/dist/assets/v1.5.0/safe_l2.json','utf8')).abi;
 async function setup(){
  const {ethers,provider}=await network.create('hardhatMainnet');
  const [treasury,a,b,c,outsider]=await ethers.getSigners();
  const singleton='0x1000000000000000000000000000000000000001';
  const proxy='0x1000000000000000000000000000000000000002';
  await provider.send('hardhat_setCode',[singleton,singletonCode]);
  await provider.send('hardhat_setCode',[proxy,proxyCode]);
  await provider.send('hardhat_setStorageAt',[proxy,'0x0',ethers.zeroPadValue(singleton,32)]);
  const safe=new ethers.Contract(proxy,safeAbi,treasury);
  await safe.setup([a.address,b.address,c.address],2,ethers.ZeroAddress,'0x',ethers.ZeroAddress,ethers.ZeroAddress,0,ethers.ZeroAddress);
  assert.equal(await safe.VERSION(),version);assert.equal(await safe.getThreshold(),2n);
  const token=await ethers.deployContract('contracts/verified/ArexAIToken.sol:ArexAIToken',[treasury.address]);
  const factory=frozen?new ethers.ContractFactory(frozenArtifact.abi,frozenArtifact.bytecode,treasury):await ethers.getContractFactory('ArexAIStaking',treasury);
  const staking=await factory.deploy(await token.getAddress(),proxy);await staking.waitForDeployment();
  const cap=115_000_000n*10n**18n;await token.approve(await staking.getAddress(),cap);await staking.fundAndActivate();
  const tx={to:await staking.getAddress(),value:0n,data:staking.interface.encodeFunctionData('emergencyClose'),operation:0,safeTxGas:0n,baseGas:0n,gasPrice:0n,gasToken:ethers.ZeroAddress,refundReceiver:ethers.ZeroAddress,nonce:await safe.nonce()};
  const domain={chainId:(await ethers.provider.getNetwork()).chainId,verifyingContract:proxy};
  async function signatures(signers:typeof a[]){
   const sorted=[...signers].sort((x,y)=>x.address.toLowerCase().localeCompare(y.address.toLowerCase()));
   return ethers.concat(await Promise.all(sorted.map(x=>x.signTypedData(domain,types,tx))));
  }
  const execute=(sigs:string)=>safe.execTransaction(tx.to,tx.value,tx.data,tx.operation,tx.safeTxGas,tx.baseGas,tx.gasPrice,tx.gasToken,tx.refundReceiver,sigs);
  async function unchanged(){assert.equal(await safe.nonce(),0n);assert.equal(await staking.permanentlyClosed(),false);assert.equal(await staking.burnedRewards(),0n);assert.equal(await token.balanceOf(tx.to),cap);}
  return {safe,staking,token,cap,a,b,c,outsider,signatures,execute,unchanged,provider,ethers};
 }
 test(`${label}: real Safe rejects one signature without changing staking or nonce`,async()=>{
  const f=await setup();await assert.rejects(f.execute(await f.signatures([f.a])),/GS020/);await f.unchanged();
 });
 test(`${label}: real Safe executes two signatures and rejects their replay`,async()=>{
  const f=await setup(),sigs=await f.signatures([f.a,f.b]);const supply=await f.token.totalSupply();
  await f.execute(sigs);assert.equal(await f.safe.nonce(),1n);assert.equal(await f.staking.permanentlyClosed(),true);assert.equal(await f.staking.shutdownFinalized(),true);
  assert.equal(await f.staking.burnedRewards(),f.cap);assert.equal(await f.token.totalSupply(),supply-f.cap);
  await assert.rejects(f.execute(sigs));assert.equal(await f.safe.nonce(),1n);assert.equal(await f.staking.burnedRewards(),f.cap);assert.equal(await f.token.totalSupply(),supply-f.cap);
 });
 test(`${label}: real Safe rejects an outsider signature paired with an owner`,async()=>{
  const f=await setup();await assert.rejects(f.execute(await f.signatures([f.a,f.outsider])),/GS026/);await f.unchanged();
 });
 test(`${label}: real Safe rejects two copies of one owner signature`,async()=>{
  const f=await setup();await assert.rejects(f.execute(await f.signatures([f.a,f.a])),/GS026/);await f.unchanged();
 });
 test(`${label}: emergency preserves active principal and cutoff rewards before burning surplus`,async()=>{
  const f=await setup(),s=f.staking,U=10n**18n,amount=100_000n*U,day=86400n,year=365n*day;
  await f.token.transfer(f.a.address,2n*amount);await f.token.connect(f.a).approve(await s.getAddress(),2n*amount);
  await s.connect(f.a).stake(amount,3);await s.connect(f.a).stake(amount,0);
  const locked=await s.positions(1),flex=await s.positions(2);
  await f.provider.send('evm_setNextBlockTimestamp',[Number(flex.started+20n*day+3600n)]);
  await f.execute(await f.signatures([f.a,f.b]));
  const cutoff=await s.shutdownAt(),lockReward=amount*1200n*(cutoff-locked.started)/(10000n*year),flexReward=((cutoff-flex.started)/day)*await s.quote(amount,0);
  const balance=await f.token.balanceOf(f.a.address);
  await s.connect(f.a).withdrawPrincipal(1);await s.connect(f.a).withdrawPrincipal(2);
  assert.equal(await f.token.balanceOf(f.a.address),balance+2n*amount);
  do{await s.connect(f.outsider).checkpoint(1);}while(await s.phase()!==0n);
  assert.equal(await s.shutdownFinalized(),true);
  assert.equal((await s.positions(1)).reward,lockReward);assert.equal((await s.positions(2)).reward,flexReward);
  assert.equal(await s.burnedRewards(),f.cap-lockReward-flexReward);
  await f.provider.send('evm_setNextBlockTimestamp',[Number(cutoff+100n*day)]);await f.provider.send('evm_mine',[]);
  await s.connect(f.a).withdraw(2);await s.connect(f.a).withdraw(1);
  assert.equal(await f.token.balanceOf(f.a.address),balance+2n*amount+lockReward+flexReward);
  assert.equal(await s.totalPrincipal(),0n);assert.equal(await s.paidRewards(),lockReward+flexReward);
  assert.equal(await f.token.balanceOf(await s.getAddress()),0n);
  assert.equal(await s.paidRewards()+await s.burnedRewards(),f.cap);
 });

}
