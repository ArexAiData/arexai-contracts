# Source and deployment verification

The machine-readable [registry](../deployments/bsc-mainnet.json) connects six historical BSC deployment records with repository source and artifact files. Its SHA-256 fields identify exact repository bytes, not a security verdict.

| Deployment | Repository source | Published artifact | Boundary |
| --- | --- | --- | --- |
| ARXAI token | `contracts/verified/ArexAIToken.sol` | `artifacts/ArexAIToken.json` | Published token source; newly tested directly |
| Presale Round 1 | `contracts/PresaleRound.sol` | `artifacts/PresaleRound.json` | Historical exact-verification record |
| Presale Round 2 | `contracts/PresaleRound.sol` | `artifacts/PresaleRound.json` | Historical similar-verification record; not promoted to exact |
| Team vesting | `contracts/ArexAITeamVesting.sol` | `artifacts/TeamVesting.json` | Test-workspace implementation; artifact uses a different contract name |
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

These steps have not been newly performed by the repository integrity gate. Historical verification labels are not live attestations. Deployment transaction hashes remain missing until independently checked; purchase receipts must not be relabelled as deployments. Local behavioral tests do not verify current mainnet state or constitute an independent audit.
