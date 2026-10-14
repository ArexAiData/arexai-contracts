# ArexAi Contracts Changelog

## 2026-10-14 — AI v3.22.0 evidence and reviewer package refresh

- Refresh AI documentation from v3.16.1 to v3.22.0: multi-source review, complete deterministic reports, local recovery, task stages and checked source addresses. Preserve historical reports and their limits.
- Publish unchanged synthetic source files, reviewed XLSX/JSON reports and hashed application evidence: 94 historical regression groups, 55 independently checked source records and seven live attempts (five passes; two initial failures and successful targeted replays retained).
- Add a standalone standard-library Python oracle to the existing AI reference CI command. It checks source bytes, all saved report cells, row multiplicity/classification, provenance and twelve deliberately damaged report variants. These are public fixture checks, not application or AI-model tests.
- Request `engineering-2026-10-14` through the protected exact-commit release workflow. The package includes the previously merged 191-test staking coverage and newer contribution/allocation evidence.
- No Solidity, deployed contract, governance, token allocation, dependency version or private application source changes. Browser/mobile/IndexedDB QA and real customer pilots remain outside the recorded verification.

## 2026-10-13 — AI file-workspace documentation v3.16.1

- Refresh the separate AI product reference for complete XLSX/CSV processing, downloadable workbook copies, continued revisions and the CSV source-retention fix.
- Publish [file-workspace verification evidence](docs/ai/file-workspace-v3.16.1.md): five workbook domains, preserved inventory revisions, read-only analysis and a 1,005-record CSV with a checked total of 505,515.
- Distinguish actual model/API tests, simulated transport tests, private application regressions and the public synthetic reference checker. Record missing formula-cache and browser-verification limits.
- Update the main README and contribution evidence link. This is product documentation; it publishes no private application source and changes no Solidity code, deployment, allocation, contract test count or engineering release manifest.

## 2026-10-13 — Stateful staking security expansion

- Increase the local contract suite from 173 to **191 passing tests**, with 0 failures and 1 optional archive-RPC fork skipped.
- Add eight reproducible differential scenarios: 256 randomized operations per seed per implementation, 4,096 operations total, independently modeled holder balances and reward accounting, plus matching development/frozen-deployment state digests.
- Add ten partial-settlement tests across both implementations: normal scanning, exhaustion scanning/allocation, and emergency scanning/allocation, with claims, principal exits, delayed keepers, rejection rollback and final sweep checks.
- Preserve the dated full output, per-seed results and new CI JSON evidence. See [scope and reproduction](reports/staking-security-expansion-2026-10-13.md).
- Test and evidence changes only; deployed contracts, Solidity sources, allocation and token behavior remain unchanged. Internal engineering evidence is not an independent audit.

## 2026-10-13 — Contribution flows and dependency maintenance

- Document the published contribution budget panel, explicit AI-feedback draft flow and private tracking links across the README, contribution guide and AI reference. Clarify reserved-versus-paid budget behavior, five-language support, no automatic email and older/lost-link support.
- Merge reviewed, SHA-pinned Actions updates: upload-artifact 7.0.2 (#32), setup-node 7.1.0 (#33) and CodeQL SARIF upload 4.38.3 (#34). Their Actions runtime does not change the project test runtime of Node.js 22.13.0.
- Retain `@types/node` major 22 rather than adopting the Node 26 types proposed by #18. Ignore automated major updates for that package until an intentional runtime migration; minor and patch updates remain eligible.
- Preserve allowlisted hidden files in CI reviewer-package uploads. Inspection of the downloaded #32 artifact found ten manifest-listed files missing (`.github/` files and `.gitignore`); this corrects archive completeness, not contract behavior.
- No Solidity, deployment, allocation, AI engine version or engineering release manifest change. Website features are documented from their separate source; this repository's tests do not execute the private website implementation.

## 2026-10-13 — Contribution rewards and allocation reconciliation

- Record 431.25M remaining reserve, 115M staking and 28.75M contribution rewards; five released and fifteen remaining tranches.
- Add the contribution Safe, application links, review/payment rules and block 127300237 snapshot with explicit limitations.
- Synchronize website metadata mirrors and consistency checks; retain historical activation and immutable deployment evidence.
- Align current product references with v3.9.7 and recorded contract evidence with the existing 173-test baseline. This documentation update makes no new audit claim and performs no on-chain action.

## 2026-10-09 — Reviewer documentation and usage evidence

- Consolidate deployment mapping and a fail-fast reviewer quick start (PR #28).
- Refresh separate AI reference for v3.9.5 overview and v3.9.6 saved source-row inspection (PR #29).
- Record the independently re-read successful 10,000 ARXAI principal-exit receipt; distinguish historical reward accounting from an unverified separate claim receipt.
- Request a new exact-commit engineering review archive through the gated release workflow.
- No Solidity, deployed contract, governance or allocation change; no new test-count or audit claim.


## 2026-10-08 — Frozen deployment load and gas measurements

- Add four local load scenarios compiled from frozen mainnet input: 30-day catch-up, 1,024 eligible positions, proportional exhaustion and emergency settlement.
- Record per-call gas, bounded checkpoint counts, principal access and liability conservation; retain JSON evidence in CI artifacts.
- Full suite: 173 passed, 1 optional fork skipped. No live transaction, deployed contract change or independent audit claim.


## 2026-10-08 — Current baseline and AI reference refresh

- Correct the current README baseline to the recorded 169 passed / 1 optional fork skipped and link SafeL2 1.5.0 evidence and source commit. Older report counts remain historical.
- Refresh the separate AI reference to v3.9.2, including bounded pre-analysis review, mixed contexts, source evidence and retained reviewed plans.
- Add two synthetic fixture consistency checks; they do not execute the private application or AI model and are not Solidity tests.
- No contract source, deployment, governance, token allocation or funds changed.


## Engineering — 8 October 2026

- Run 24 shared staking behavioral scenarios separately against frozen original deployment bytecode and development artifacts.
- Schedule read-only published site/whitepaper consistency checks and run rejection cases on relevant PRs.
- Correct obsolete unreleased-staking wording in engineering release notes; prepare the new evidence prerelease.
- Local suite: 133 passed, 1 optional fork skipped. No deployed contract changes or independent audit implied.

This changelog records material changes to the public ArexAi smart-contract engineering repository. Product releases for the ArexAi Analyst application are published separately at [arexaidata.com/updates](https://arexaidata.com/updates).

## 2026-10-07 — Live staking evidence and project consistency

- Corrected current README and review scope to document live staking and the funded 115M reward cap separately from dated prototype reports.
- Added frozen deployment compiler input, ABI, project sources, successful creation/activation receipts and pinned-block state. Offline checks reproduce exact creation and runtime including metadata.
- Added site/registry/whitepaper consistency checks, local-site and published-site modes and CI rejection scenarios.
- Preserved the original six-contract evidence and all historical test counts. Independent audit pending; no contract deployment, token transfer, rate change or upgrade is performed by this change.

## 2026-10-07 — Unreleased staking scheduled settlement

- Added a packed deadline heap so normal rounds visit only due or retired deadlines, with aggregate daily-rate accounting and bounded root pruning.
- Added a conservative full-budget proof and one-pass full allocations; potential exhaustion retains proportional deferred allocation, with weighted work credits to bound per-call storage cost.
- Added independent heap-model and 1,024-position sparse/dense/exhaustion/emergency tests. Local Solidity suite: 109 passed, 1 optional archive-RPC skip; tooling: 16 passed.
- Preserved principal access, accrued-reward claims, original daily anchors, fixed rates/cap, locked forfeitures and closure rules.
- Recorded the tradeoff: dense heap maintenance can increase total gas; sparse and boundary cases avoid repeated whole-set scans. No deployment, funding, Safe configuration or live contract changed.

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
