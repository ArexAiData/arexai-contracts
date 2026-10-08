import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {network} from 'hardhat';
import {frozenArtifact} from './helpers/frozen-staking.js';

// Execute official pinned Safe 1.4.1 runtime locally. This tests transaction
// signatures and delegatecall execution, not factory deployment or live Safe 1.5.0 parity.
const proxyCode=JSON.parse(readFileSync('verification/safe/proxy-runtime-1.4.1.json','utf8')).deployedBytecode;
const singletonCode=JSON.parse(readFileSync('verification/safe/singleton-runtime-1.4.1.json','utf8')).deployedBytecode;
const safeAbi=JSON.parse(readFileSync('node_modules/@safe-global/safe-deployments/dist/assets/v1.4.1/safe.json','utf8')).abi;
const types={SafeTx:[{name:'to',type:'address'},{name:'value',type:'uint256'},{name:'data',type:'bytes'},{name:'operation',type:'uint8'},{name:'safeTxGas',type:'uint256'},{name:'baseGas',type:'uint256'},{name:'gasPrice',type:'uint256'},{name:'gasToken',type:'address'},{name:'refundReceiver',type:'address'},{name:'nonce',type:'uint256'}]};
for(const frozen of [false,true]) {
 const label=frozen?'Frozen mainnet':'Development';
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
  assert.equal(await safe.VERSION(),'1.4.1');assert.equal(await safe.getThreshold(),2n);
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
  return {safe,staking,token,cap,a,b,c,outsider,signatures,execute,unchanged};
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
}
