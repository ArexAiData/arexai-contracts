import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync,writeFileSync } from "node:fs";
import { network } from "hardhat";
import { JsonRpcProvider } from "ethers";

test("BSC fixed-block fork: six runtime sources, immutable links and local token transfer",{skip:!process.env.BSC_FORK_RPC_URL},async()=>{
  const rpc=process.env.BSC_FORK_RPC_URL!;
  const upstream=new JsonRpcProvider(rpc);
  assert.equal((await upstream.getNetwork()).chainId,56n);upstream.destroy();
  const snapshot=JSON.parse(readFileSync("verification/bsc-snapshot.json","utf8"));
  const registry=JSON.parse(readFileSync("deployments/bsc-mainnet.json","utf8"));
  const {ethers,provider}=await network.create("bscFork");
  const block=await ethers.provider.getBlock(snapshot.blockNumber);
  assert.equal(block!.hash,"0x01bdd57ee42b9549402e5520aa35ef23e16932f65a3808f98ff01ac31edd68e7");
  let getters=0;
  for(const record of registry.contracts){
    const proof=snapshot.contracts.find((p:{address:string})=>p.address===record.address);
    assert.equal(await ethers.provider.getCode(record.address),proof.runtimeBytecode);
    const artifact=JSON.parse(readFileSync(record.artifact,"utf8"));
    const contract=new ethers.Contract(record.address,artifact.abi,ethers.provider);
    const inputs=contract.interface.deploy.inputs;
    const args=ethers.AbiCoder.defaultAbiCoder().decode(inputs.map(i=>i.format("sighash")),proof.constructorArguments);
    for(let i=0;i<inputs.length;i++){
      const name=inputs[i].name.replace(/_$/,"");if(name==="initialOwner")continue;
      const getter=name;
      if(!contract.interface.hasFunction(`${getter}()`))continue;
      const actual=await contract[getter]();
      if(typeof args[i]==="string")assert.equal(String(actual).toLowerCase(),args[i].toLowerCase());
      else assert.equal(actual,args[i]);getters++;
    }
    if(record.contractName==="PresaleRound"){
      const price=await contract.pricePerWholeToken();assert.equal(await contract.quote(100n*10n**18n),100n*10n**36n/price);
    }
  }
  const address=registry.contracts[0].address,artifact=JSON.parse(readFileSync(registry.contracts[0].artifact,"utf8"));
  const token=new ethers.Contract(address,artifact.abi,ethers.provider);
  const holder=snapshot.contracts[0].transaction.from;
  assert((await token.balanceOf(holder))>0n);
  await provider.send("hardhat_impersonateAccount",[holder]);await provider.send("hardhat_setBalance",[holder,"0x3635c9adc5dea00000"]);
  const signer=await ethers.getSigner(holder),recipient='0x0000000000000000000000000000000000000002';
  const before=await token.balanceOf(holder),target=await token.balanceOf(recipient),supply=await token.totalSupply();
  await token.connect(signer).getFunction("transfer")(recipient,1n);
  assert.equal(await token.balanceOf(holder),before-1n);assert.equal(await token.balanceOf(recipient),target+1n);assert.equal(await token.totalSupply(),supply);
  await provider.send("hardhat_stopImpersonatingAccount",[holder]);
  if(process.env.BSC_FORK_REPORT)writeFileSync(process.env.BSC_FORK_REPORT,JSON.stringify({scope:"Local EDR fork, not a BSC transaction or consensus emulator",chainId:56,blockNumber:snapshot.blockNumber,blockHash:block!.hash,runtimeMatches:6,immutableGetterChecks:getters,localTokenTransfer:"passed",hardfork:"shanghai"},null,2)+"\n");
});
