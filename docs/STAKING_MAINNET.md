# Live ARXAI staking evidence

ARXAI staking is deployed on BNB Smart Chain at `0xFc0e57528C171cd63F548AFD35Dd787A1cBb6864` and was activated on 7 October 2026. The reward cap is 115 million existing ARXAI from the original 575 million reserve; the revised reserve allocation is 460 million. User principal is separately accounted for. This evidence is not an independent audit.

## Exact deployed code

The [separate registry](../deployments/staking-mainnet.json) identifies the original preparation commit, constructor token and governance addresses, compiler input hash and snapshot. The [frozen input](../verification/staking/solidity-standard-input.json) retains all dependency contents and original source paths. Readable project sources are in [verification/staking/source](../verification/staking/source).

`npm run verify:staking-mainnet` compiles using Solidity 0.8.24, optimizer 200, Paris EVM. It compares the full creation input plus constructor arguments with the recorded transaction and reproduces full deployed runtime including Solidity metadata. Only compiler-declared immutable locations are replaced, restricted to the recorded token and governance addresses. It checks the ABI, successful receipts, activation event, 115 million reward cap, 365-day year and rates of 200/500/800/1200 basis points.

`contracts/ArexAIStaking.sol` is the development/test workspace. Its tests and dated engineering reports are not blanket attestations of mainnet safety. The frozen source remains authoritative for this deployment; any later workspace edit does not upgrade it. Original “unreleased” comments in the frozen source are preserved because changing them changes exact build metadata.

## Funding and activation

- Creation: [0x2b6f8a5337c7923c4519439bc20c6f272b9d63c751f467d5860eec4aa8641169](https://bscscan.com/tx/0x2b6f8a5337c7923c4519439bc20c6f272b9d63c751f467d5860eec4aa8641169).
- Activation: [0xa706e9a69422ec3ddb4fd449952f457c39bd4a334f7f12565470a5fe2fd82740](https://bscscan.com/tx/0xa706e9a69422ec3ddb4fd449952f457c39bd4a334f7f12565470a5fe2fd82740).

Activation is not labelled as a funding transfer. The successful receipt emits `Activated(115000000 ether)` and the exactly reproduced source requires the token balance to cover the reward cap before activation. The RPC used for this capture did not expose historical token state at the activation block, so no exact archived balance lookup is claimed. The snapshot preserves this limitation. Deposited user principal must not be presented as additional reward funding.

## Governance boundaries

The immutable governance address is `0x1C4a898e3355Dbc8D9A9C75400042a025DC209e6`. Recorded [Safe observations](../verification/staking/safe-observed-evidence.json) identify Safe 1.5.0, three public owners and threshold two. These observations use separate blocks and do not establish current modules, current threshold, possession or separation of signer keys. Recheck before signing. The repository's strict 1.4.1 preflight does not support this 1.5.0 deployment.

Governance can permanently close staking under the deployed rules. It cannot change rates, mint tokens, upgrade the staking contract or reopen after closure. This Safe scope does not imply that presale and reserve ownership has been transferred to it.

## Metadata consistency

Run `npm run verify:consistency` for recorded website metadata mirrors and README status. Run `npm run verify:consistency -- --site-dir /absolute/path/to/site` before publishing to compare local `contracts.json`, `listing-data.json`, staking evidence, whitepaper text and UI addresses/rates. Run `npm run verify:consistency -- --live` to retrieve the published canonical website and whitepaper. Whitepaper checks require `pdftotext` from Poppler.

The checks cover selected addresses, staking APRs and budget, revised allocation totals, planned public trading timestamp, audit status and the absence of obsolete global staking status in the README. They are scoped consistency checks, not a comprehensive translation review, proof of all whitepaper claims or circulation calculation. Live fetch failures fail closed; they are not treated as successful checks.

`npm run staking:snapshot` refreshes read-only chain evidence with `BSC_RPC_URL` if supplied. Review and commit refreshed evidence deliberately; CI uses pinned evidence and never signs, broadcasts or funds transactions.
