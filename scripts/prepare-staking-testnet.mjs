import { readFileSync } from 'node:fs';
import { JsonRpcProvider, Contract, ContractFactory, getAddress } from 'ethers';

// Read-only preflight; outputs an unsigned transaction. Never accepts a private key.
const [rpc, tokenInput, safeInput] = process.argv.slice(2);
if (!rpc || !tokenInput || !safeInput) throw new Error('Usage: node scripts/prepare-staking-testnet.mjs <testnet-rpc-url> <test-token-address> <genuine-safe-address>');
const token = getAddress(tokenInput), safe = getAddress(safeInput);
if (token.toLowerCase() === '0xeaa12b3be7cdec7749b972ed5c342f4e933ccbb3') throw new Error('Use a separate test token, not the mainnet ARXAI address');
const provider = new JsonRpcProvider(rpc);
if ((await provider.getNetwork()).chainId !== 97n) throw new Error('Only BNB Smart Chain testnet chain 97 is permitted');
for (const address of [token,safe]) if ((await provider.getCode(address)) === '0x') throw new Error(`No contract code at ${address}`);
const t = new Contract(token,['function decimals() view returns(uint8)','function totalSupply() view returns(uint256)'],provider);
if (await t.decimals() !== 18n || await t.totalSupply() < 115_000_000n*10n**18n) throw new Error('Test token requires 18 decimals and sufficient test supply');
const governance = new Contract(safe,['function getOwners() view returns(address[])','function getThreshold() view returns(uint256)','function getModulesPaginated(address,uint256) view returns(address[],address)'],provider);
const owners = await governance.getOwners();
if (owners.length !== 3 || new Set(owners.map(x=>x.toLowerCase())).size !== 3 || owners.some(x=>/^0x0{40}$/i.test(x)) || await governance.getThreshold() !== 2n) throw new Error('Require exactly three distinct owners and threshold two');
const [modules,next] = await governance.getModulesPaginated('0x0000000000000000000000000000000000000001',100);
if (modules.length || next.toLowerCase() !== '0x0000000000000000000000000000000000000001') throw new Error('Enabled modules require review and are not permitted by this preflight');
const artifact = JSON.parse(readFileSync(new URL('../artifacts/contracts/ArexAIStaking.sol/ArexAIStaking.json',import.meta.url),'utf8'));
const tx = await new ContractFactory(artifact.abi,artifact.bytecode).getDeployTransaction(token,safe);
console.log(JSON.stringify({status:'UNSIGNED_REVIEW_REQUIRED',chainId:97,token,governance:safe,owners:Array.from(owners),threshold:2,data:tx.data,value:'0',limitations:['Getter checks cannot authenticate a genuine Safe singleton/proxy. Independently verify source, singleton, guard and fallback handler before signing.','No deployment, funding, signing or transactions performed.','This prototype has not received an independent audit.']},null,2));
