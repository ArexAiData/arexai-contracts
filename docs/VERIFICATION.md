# Source and deployment verification

The machine-readable [registry](../deployments/bsc-mainnet.json) connects six historical BSC deployment records with repository source and artifact files. Its SHA-256 fields identify exact repository bytes, not a security verdict.

| Deployment | Repository source | Published artifact | Boundary |
| --- | --- | --- | --- |
| ARXAI token | `contracts/verified/ArexAIToken.sol` | `artifacts/ArexAIToken.json` | Published token source; newly tested directly |
| Presale Round 1 | `contracts/PresaleRound.sol` | `artifacts/PresaleRound.json` | Historical exact-verification record |
| Presale Round 2 | `contracts/PresaleRound.sol` | `artifacts/PresaleRound.json` | Historical similar-verification record; not promoted to exact |
| Team vesting | `contracts/TeamVesting.sol` | `artifacts/TeamVesting.json` | Recovered exact deployed source; direct behavioral tests |
| Listing reserve | `contracts/ReserveVault.sol` | `artifacts/ReserveVault.json` | Published recovered source |
| Liquidity reserve | `contracts/LiquidityReserveVault.sol` | `artifacts/LiquidityReserveVault.json` | Published recovered source; reserve is not evidence of a DEX LP lock |

`contracts/ArexAI.sol` is a test-workspace token implementation. Do not substitute its name or constructor error for the published `ArexAIToken` contract. Published artifact `sourceName` values retain their historical build paths; a current repository path is not proof those artifacts were rebuilt here.

## Reproduce repository checks

Use Node.js 22.13 or later, install the committed lockfile with `npm ci --no-audit --no-fund`, then run `npm run verify:registry`, `npm run compile` and `npm test`. The additional token invariant uses a fixed seed and checks every intermediate balance and total supply. It is bounded deterministic testing, not exhaustive fuzzing.

The registry gate checks all addresses are unique and correctly formed, explorer links correspond to addresses, mapped files exist and match their recorded hashes, and local compiler settings agree with the registry. Intentional source changes require reviewing and updating hashes alongside evidence.

## Independently inspect a deployment

1. Open the address's BscScan page from the registry and confirm BNB Smart Chain and the full address.
2. Inspect verified source, exact versus similar verification, compiler settings, constructor arguments and any immutable values.
3. Retrieve creation/runtime bytecode and compiler metadata. Rebuild with the exact inputs, dependencies and compiler, then compare with appropriate constructor and immutable handling.
4. Check current ownership, beneficiary, release schedule, balances and relevant transactions separately.

The registry integrity gate alone does not perform these steps. The separate snapshot below covers creation/runtime code and receipts, but not current balances, permissions or an audit. Historical verification labels are not live attestations. Creation transaction hashes are now cross-checked against successful BSC receipts and the Sourcify records. Purchase receipts remain separate. Local behavioral tests do not verify current mainnet state or constitute an independent audit.

## Reproduced BSC snapshot — 5 October 2026

Run `npm run verify:bytecode`. The committed original Solidity standard JSON inputs include exact dependency sources. They reproduce complete creation bytecode plus constructor arguments, and runtime bytecode including metadata, for all six deployments. Only compiler-declared immutable positions receive the values recorded in the verification evidence; no arbitrary byte ranges are ignored. AST identifiers may differ between compilation runs, so immutable groups are matched by their complete offset/length sets.

The current repository source executable templates are also compared with the exact original builds after removing Solidity's CBOR metadata suffix. This latter comparison covers executable bytes, not identical source comments, source paths or metadata. Creation receipt addresses, status, chain ID, block hashes and block numbers are checked. Data was fetched using the public BSC RPC at snapshot block 125790592; the committed verifier is offline and does not constitute multiple-provider consensus or current-state verification.

Sourcify reports exact creation and runtime matches for both presales. This does not overwrite the historical BscScan similar-match label for Round 2, which was not freshly retrieved from BscScan.

### Vesting discrepancy resolved in repository evidence

`contracts/ArexAITeamVesting.sol` remains an explicitly separate test-workspace implementation. Its hard-coded first release is 22 June 2027; the deployed TeamVesting constructor schedule starts on **22 May 2027**, as recovered from its verified creation transaction. The deployed source receives twenty calendar dates through its constructor and does not include the test implementation's ReentrancyGuard or custom Underfunded error. No mainnet contract was modified. Five direct TeamVesting tests now cover its actual schedule, constructor constraints, permissionless triggers, funding rollback and cumulative release cap.
