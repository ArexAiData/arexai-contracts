import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {JsonRpcProvider,Contract,getAddress,id,keccak256,ZeroAddress} from 'ethers';

const asset=name=>JSON.parse(readFileSync(new URL(`../node_modules/@safe-global/safe-deployments/dist/assets/v1.4.1/${name}.json`,import.meta.url),'utf8'));
const proxy=JSON.parse(readFileSync(new URL('../verification/safe/proxy-runtime-1.4.1.json',import.meta.url),'utf8'));
assert.equal(keccak256(proxy.deployedBytecode),'0xd7d408ebcd99b2b70be43e20253d6d92a8ea8fab29bd3be7f55b10032331fb4c','Pinned proxy artifact integrity');
const sentinel='0x0000000000000000000000000000000000000001';
const addressFromSlot=slot=>getAddress('0x'+slot.slice(-40));
const canonical=(record,chain)=>{const kind=record.networkAddresses[String(chain)];assert(kind,`No official 1.4.1 deployment record for chain ${chain}`);assert.equal(typeof kind,'string','Ambiguous registry deployment');return record.deployments[kind];};

export async function verifySafe(provider,address,expectedOwners){
  address=getAddress(address);
  const {chainId}=await provider.getNetwork();assert([56n,97n].includes(chainId),'Only BSC 56/97 supported');
  const block=await provider.getBlockNumber();
  // Every code/storage/getter check uses one fixed block, not a mixture of latest states.
  assert.equal(await provider.getCode(address,block),proxy.deployedBytecode,'Proxy runtime is not the pinned official SafeProxy 1.4.1 artifact');
  const singleton=addressFromSlot(await provider.getStorage(address,0,block));
  const candidates=['safe','safe_l2'].map(name=>({name,...canonical(asset(name),chainId)}));
  const match=candidates.find(c=>c.address.toLowerCase()===singleton.toLowerCase());assert(match,'Singleton is not an official registry address');
  assert.equal(keccak256(await provider.getCode(singleton,block)),match.codeHash,'Singleton code hash mismatch');
  assert.equal(expectedOwners.length,3);const expected=expectedOwners.map(getAddress);
  assert.equal(new Set(expected).size,3);assert(!expected.includes(ZeroAddress));
  const safe=new Contract(address,['function getOwners() view returns(address[])','function getThreshold() view returns(uint256)','function getModulesPaginated(address,uint256) view returns(address[],address)'],provider);
  const owners=Array.from(await safe.getOwners({blockTag:block})).map(getAddress);
  assert.deepEqual([...owners].sort(),[...expected].sort(),'Owners differ from the independently supplied signer list');
  assert.equal(await safe.getThreshold({blockTag:block}),2n);
  const [modules,next]=await safe.getModulesPaginated(sentinel,1,{blockTag:block});
  assert.equal(modules.length,0,'Enabled modules are not allowed by this strict policy');assert.equal(getAddress(next),getAddress(sentinel));
  const guard=addressFromSlot(await provider.getStorage(address,id('guard_manager.guard.address'),block));
  assert.equal(guard,ZeroAddress,'Nonzero guard requires a separately reviewed policy');
  const fallback=addressFromSlot(await provider.getStorage(address,id('fallback_manager.handler.address'),block));
  if(fallback!==ZeroAddress){const allowed=canonical(asset('compatibility_fallback_handler'),chainId);assert.equal(fallback.toLowerCase(),allowed.address.toLowerCase(),'Unreviewed fallback handler');assert.equal(keccak256(await provider.getCode(fallback,block)),allowed.codeHash);}
  return {status:'PINNED_SAFE_POLICY_PASSED',chainId:Number(chainId),block,address,owners,threshold:2,singleton,singletonKind:match.name,modules:[],guard,fallback,registryPackage:'@safe-global/safe-deployments@1.37.63',limitations:['Only the pinned 1.4.1 proxy and official singleton/handler records are supported. Other legitimate Safe versions intentionally fail.','This is a read-only fixed-block configuration check, not proof of signer key custody, an independent audit or future configuration stability.']};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(pathToFileURL(process.argv[1]))){
  const [rpc,address,...owners]=process.argv.slice(2);assert(rpc&&address&&owners.length===3,'Usage: node scripts/verify-safe.mjs <rpc-url> <safe-address> <owner1> <owner2> <owner3>');
  const provider=new JsonRpcProvider(rpc);try{console.log(JSON.stringify(await verifySafe(provider,address,owners),null,2));}finally{provider.destroy();}
}
