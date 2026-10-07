import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Interface} from 'ethers';
const registry=JSON.parse(readFileSync('deployments/staking-mainnet.json','utf8'));
const abi=JSON.parse(readFileSync('verification/staking/abi.json','utf8'));
const iface=new Interface(abi);
const rpc=process.env.BSC_RPC_URL ?? 'https://bsc-dataseed.bnbchain.org';
let id=0;
async function request(method,params=[]){
 const response=await fetch(rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params}),signal:AbortSignal.timeout(30000)});
 assert(response.ok,`RPC HTTP ${response.status}`);const data=await response.json();assert(!data.error,JSON.stringify(data.error));assert(data.result!==null,`${method}: no result`);return data.result;
}
assert.equal(await request('eth_chainId'),'0x38');
const block=await request('eth_getBlockByNumber',['latest',false]);
const calls=['activated','token','governance','REWARD_CAP','YEAR','totalPrincipal','permanentlyClosed'];
async function call(name,args=[]){const result=await request('eth_call',[{to:registry.stakingContract,data:iface.encodeFunctionData(name,args)},block.number]);const v=iface.decodeFunctionResult(name,result)[0];return typeof v==='bigint'?v.toString():v;}
const [transaction,receipt,activationReceipt,runtimeBytecode,values,aprs]=await Promise.all([
 request('eth_getTransactionByHash',[registry.deploymentTransaction]),request('eth_getTransactionReceipt',[registry.deploymentTransaction]),request('eth_getTransactionReceipt',[registry.activationTransaction]),request('eth_getCode',[registry.stakingContract,block.number]),Promise.all(calls.map(name=>call(name))),Promise.all([0,1,2,3].map(mode=>call('aprBps',[mode])))
]);
assert.equal(receipt.status,'0x1');assert.equal(activationReceipt.status,'0x1');assert.equal(receipt.contractAddress.toLowerCase(),registry.stakingContract.toLowerCase());
const tokenIface=new Interface(['event Transfer(address indexed from,address indexed to,uint256 value)','function balanceOf(address) view returns(uint256)']);
const transfers=activationReceipt.logs.filter(log=>log.address.toLowerCase()===registry.token.toLowerCase()).flatMap(log=>{try {const event=tokenIface.parseLog(log);return event?[{from:event.args.from,to:event.args.to,amount:event.args.value.toString()}]:[];}catch{return [];}});
let activationBalance=null;
let archiveBalanceLimitation=null;
try {
 const balanceResult=await request('eth_call',[{to:registry.token,data:tokenIface.encodeFunctionData('balanceOf',[registry.stakingContract])},activationReceipt.blockNumber]);
 activationBalance=tokenIface.decodeFunctionResult('balanceOf',balanceResult)[0].toString();
 assert(BigInt(activationBalance)>=115000000n*10n**18n,'Complete reward balance at activation block');
} catch(error){
 if(!String(error).includes('missing trie node')) throw error;
 archiveBalanceLimitation='RPC does not provide historical token state at the activation block. Activated event plus exactly reproduced source establishes the cap funding prerequisite; no exact historical balance is asserted.';
}
const activatedEvents=activationReceipt.logs.filter(log=>log.address.toLowerCase()===registry.stakingContract.toLowerCase()).flatMap(log=>{try {const event=iface.parseLog(log);return event?.name==='Activated'?[{name:event.name,args:Array.from(event.args,v=>typeof v==='bigint'?v.toString():v)}]:[];}catch{return [];}});
assert.equal(activatedEvents.length,1);
assert.equal(activatedEvents[0].args[0],(115000000n*10n**18n).toString());
const snapshot={chainId:56,blockNumber:Number(BigInt(block.number)),asOf:new Date(Number(BigInt(block.timestamp))*1000).toISOString(),transaction,receipt,activationReceipt,runtimeBytecode,state:Object.fromEntries(calls.map((name,i)=>[name,values[i]])),aprBps:aprs,activationBalance,archiveBalanceLimitation,activatedEvents,activationTransactionTransfers:transfers,scope:'Read-only BSC snapshot. Activation is not treated as a funding transfer. Historical balances and Safe threshold are not guaranteed to remain unchanged. Not an independent audit.'};
writeFileSync('verification/staking/bsc-snapshot.json',JSON.stringify(snapshot,null,2)+'\n');
console.log(`Captured staking creation, activation and state at BSC block ${snapshot.blockNumber}. No transactions signed or sent.`);
