# ArexAi Contracts Changelog

This changelog records material changes to the public ArexAi smart-contract engineering repository. Product releases for the ArexAi Analyst application are published separately at [arexaidata.com/updates](https://arexaidata.com/updates).

## 2026-10-07 — Unreleased staking holder-access improvements

- Added principal-only exit during either checkpoint pass and emergency settlement, retaining original calculation evidence and recording an immutable per-position exit cutoff.
- Made allocated flexible claims independent of global catch-up; locked final withdrawals and settled flexible final withdrawals no longer wait for unrelated daily boundaries.
- Preserved voluntary locked early-exit forfeiture across emergency closure and prevented double principal payment.
- Scheduled complete flexible days reached between snapshot and principal exit for subsequent allocation.
- Added seven access/accounting regressions; local Solidity suite: 103 passed, 1 optional archive-RPC skip. Existing 16 tooling tests remain separate.
- Global two-pass reward allocation, unlimited-position scan costs and admission catch-up still require further review. No deployment, funding, Safe configuration or live contract changed.

## 2026-10-07 — CI and reviewer-package hardening

- Pinned all external GitHub Actions to verified commit SHAs and disabled persisted checkout credentials in test/security jobs.
- Updated Hardhat and its ethers plugin together to resolve the proposed plugin peer-dependency conflict; grouped future Hardhat toolchain updates in Dependabot. Compiler and deployed artifacts remain unchanged.
- Added reviewer-package negative tests and strict expected-commit/clean-tree gates in CI and release packaging.
- Added canonical manifest-path and parent-symlink validation before reading package files.
- Clarified current versus historical test counts and manual versus automated tag procedures.
- No production Solidity logic, contract deployment, staking activation or on-chain state changed.

## 2026-10-06 — Staking model/load evidence and reviewer package

- Added four seeded independent accounting-model tests with 60 randomized operations each, plus holder checks and full closure/withdrawal cleanup.
- Added local 1/64/256-position normal/emergency gas measurements and a 64-position daily-boundary reproduction. Repeated settlement can block claims after the first completed round; this remains a staking deployment-readiness limitation.
- Added strict read-only Safe 1.4.1 proxy/singleton verification using pinned official package evidence, expected signer addresses and conservative module/guard/handler policy.
- Added an optional fixed-block BSC fork test, explicitly skipped without a read-only archive RPC.
- Added hash-verified reviewer package generation and CI/release attachments, with exact commit and dirty-tree disclosure.
- No production Solidity logic, deployed contracts, staking funding, signer configuration or on-chain allocation was changed.

## 2026-10-06 — Recipient/pause reproductions and engineering evidence

- Added nine transfer-rejection and pause-window tests, bringing the local Solidity suite to 85 passing checks; deployed and test-workspace vesting remain separately identified.
- Documented immutable recipient availability risks, atomic rollback and unchanged presale deadlines; no recipient setter, extension or mainnet migration was introduced.
- Added a generated six-contract evidence index linking addresses, sources, creation transactions, compiler inputs and historical verification labels, with a CI consistency gate.
- Remediated the solc wrapper's vulnerable tmp dependency while retaining solc 0.8.24, original compiler inputs and bytecode reproduction.
- Added high/critical npm audit gating and downloadable per-commit test/SARIF artifacts.
- Added an exact-commit gated engineering prerelease workflow and release manifest.
- Published synthetic AI v3.8.0 reference examples for call records, separate-currency invoices, categorical surveys and exact-key list reconciliation; these are reference checks, not product/model tests.
- No deployed production Solidity logic, contract address, allocation, staking activation or on-chain state changed.

## 2026-10-05 — Deployed bytecode and team-vesting evidence

- Recovered exact deployed TeamVesting source and original compilation inputs from Sourcify.
- Cross-checked six creation transactions, successful receipts and runtime bytecode through BSC RPC at block 125790592.
- Added an offline CI verifier reproducing full original creation/runtime bytecode and comparing current repository executable templates.
- Added five behavioral tests for the deployed vesting source and actual constructor schedule.
- Documented the test-workspace vesting's June 2027 start versus the deployed May 2027 start. No live contract or release schedule was changed.

## 2026-10-05 — Source traceability and verified-token tests

- Added source/artifact paths and SHA-256 integrity records for six BSC deployment entries.
- Added a CI registry-integrity gate with explicit limitations; retained the protected branch's historical required-check alias.
- Added three tests against the published ArexAIToken source: constructor/privileged-function boundaries, a reproducible 100-operation supply invariant, and delegated-burn rollback boundaries. The original 52 tests remain intact.
- Added contribution, issue, PR and release-evidence templates; clarified private security reporting.
- No Solidity logic, deployed contract, token allocation or dependency version changed.

## 2026-09-28 — Public verification baseline

### Added

- Public Solidity sources for the ARXAI token, both presale rounds, team vesting, listing reserve and liquidity reserve.
- Machine-readable BNB Smart Chain deployment registry and deployment transaction records.
- Public ABI and bytecode artifacts for independent contract inspection.
- Automated Hardhat tests for the ARXAI token, PresaleRound, TeamVesting, ReserveVault and LiquidityReserveVault.
- GitHub Actions workflows for contract tests and Slither static analysis.
- Dependabot configuration for dependency-update visibility.
- Security policy, automated-test evidence, static-analysis notes and purchase transaction examples.

### Verified

- 52 automated contract tests passed and 0 failed in the active project-run suite.
- Fixed supply, presale boundaries, buyer limits, failure rollbacks, reserve release controls and team-vesting behavior are included in the executable test scope.
- The published Slither review recorded no critical, high or medium-severity findings within its stated scope.

### Important limitation

Project-run tests and automated static analysis are engineering evidence, not an independent professional security audit. See [SECURITY.md](SECURITY.md) and the reports directory for scope and limitations.

## 2026-10-05 — Unreleased staking prototype

- Added immutable flexible and 30/60/90-day staking terms, protected accounting, proportional bounded settlement and permanent multisignature emergency closure.
- Added 16 staking tests (76 total locally passing), design limitations and unsigned BSC testnet preparation.
- No deployed contracts, deployment registry, published allocations or treasury balances changed. Independent review and public testnet deployment remain pending.
