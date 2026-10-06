# Project-run repository hardening — 7 October 2026

Base source: `bffa27eff2dcb58c40140b870d75138ba519192c`, plus this change's toolchain, CI, package-validation and documentation edits. The protected PR and exact-commit CI identify the final reviewed source. This is not an independent audit or a contract deployment.

## Findings and changes

- A pending Hardhat ethers plugin update required Hardhat ^3.18.0 and failed `npm ci` against the pinned 3.15.0. Hardhat 3.18.1 and hardhat-ethers 4.2.0 were installed and tested together without `--force` or `--legacy-peer-deps`. Future Hardhat/tool-plugin updates are grouped in Dependabot.
- External GitHub Actions now use full commit SHAs resolved from the publishers' existing tags. The CodeQL v4 annotated tag was dereferenced to its commit. Readable version comments and Dependabot tracking remain. Test/Slither checkout credentials are no longer persisted.
- Reviewer-package verification checks canonical paths, manifest field formats and parent-directory symlinks before reading file contents. Optional `--commit` and `--clean` enforce expected-source and clean-tree claims. CI/release use both flags.
- Sixteen tooling tests exercise valid packages, tampering, missing/extra files, duplicate/traversal/absolute/noncanonical paths, file/parent symlinks, malformed metadata, expected-commit mismatch, dirty-tree rejection and a real builder/verifier round trip with overwrite refusal.
- README now highlights the current 96-test baseline while retaining dated historical counts. Manual annotated tags and automated lightweight engineering tags are clearly distinguished.

## Local validation

Node 24.19.0; npm 11.9.0; Hardhat 3.18.1; hardhat-ethers 4.2.0; solc remains 0.8.24, Paris EVM, optimizer 200.

| Check | Result |
| --- | --- |
| `npm run verify:registry` | Six records passed |
| `npm run verify:bytecode` | Six recorded creation/runtime bytecodes reproduced |
| `npm run verify:docs` | Generated deployment table matches |
| `npm run verify:ai-examples` | Four synthetic references passed |
| `npm test` | 96 passed, 0 failed, 1 optional archive-RPC fork skipped |
| `npm run test:tooling` | 16 passed, 0 failed |
| `npm audit --json` | 0 reported vulnerabilities at the time of this run |
| `git diff --check` | Passed |

The changed toolchain passed the same local behavioral and snapshot checks. This does not prove absence of regressions outside their scope. Slither is enforced separately in GitHub CI; no fresh local Slither execution is claimed here.

## Remaining boundaries

- The unreleased staking prototype still has the documented repeated-checkpoint availability limitation near daily boundaries. No production staking-readiness fix is claimed.
- The archived-state BSC fork requires a working archive RPC and remains skipped in the default suite.
- No live Safe configuration/key custody, mainnet deployment, funding, token allocation or deployed Solidity logic changed.
- npm audit and action pinning are time-specific dependency/supply-chain controls, not an independent smart-contract audit.
