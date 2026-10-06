# Project-run staking engineering evidence — 6 October 2026

Base source commit: `af447cf5bf476f078016e41de532fd6881c91f3f`, plus this report's test/tool/documentation changes. CI and the engineering release identify the exact resulting source commit. This is not an independent audit or a staking deployment.

## Results

- Default local suite: **96 passed, 0 failed, 1 skipped**. The skipped case is the explicitly opt-in archive-RPC fork. [Complete test output](staking-tests-2026-10-06.txt).
- Four deterministic seeded models (17, 2026, 64091, 2638) execute 60 randomized operations each, followed by emergency settlement and full withdrawal cleanup. They independently track users, principals, positions, simple APR rewards, claims, burns and final balances.
- At every state-changing step/checkpoint batch: reward buckets plus paid/burned rewards equal the 115M cap; token balance covers exactly tracked principal/liabilities in these no-donation fixtures; supply reflects burns; holder balances and settled position liabilities match the independent model.
- Three normal/emergency load fixtures cover 1/64/256 flexible positions. A separate 64-position daily-boundary case reproduces repeated settlement before holder access resumes.
- Safe policy tests reject the unrestricted getter-compatible harness, accept a synthetic pinned official-code configuration, and reject wrong threshold, owner list, singleton code, enabled modules, guard and unreviewed fallback settings. These are not a verification of a live project Safe address.
- Six registry/recorded-bytecode reproductions, generated docs and synthetic AI reference checks passed. npm audit reported **0 vulnerabilities** after installing the pinned official Safe deployment registry package.

Local tools: Node 24.19.0, npm 11.9.0, Hardhat 3.15.0, solc 0.8.24+commit.e11b9ed9; Paris EVM, optimizer 200. Seeded testing is bounded reproducible model checking, not exhaustive fuzzing.

## Load measurements away from daily boundaries

| Active flexible positions | Normal checkpoint transactions | Normal total gas | Emergency checkpoint transactions | Emergency total gas |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 302,680 | 1 | 160,370 |
| 64 | 2 | 5,897,642 | 2 | 1,792,998 |
| 256 | 8 | 22,995,898 | 8 | 6,951,322 |

Raw measurements: [staking-load-2026-10-06.json](staking-load-2026-10-06.json). Every checkpoint uses at most 64 work items and remains below the fixture's 8M gas ceiling. Measurements are local receipts; no BNB/USD fee estimate or production throughput guarantee is made. Counts exclude emergency authorization/closure and user claim/withdrawal transactions. The harness uses two confirmation transactions plus an execution; it is not a genuine Safe transaction-cost model. Normal withdrawal gas is an estimate; post-emergency withdrawal gas is a receipt, explicitly distinguished in JSON.

## Unresolved daily-boundary availability risk

[Boundary evidence](staking-boundary-2026-10-06.json): 64 deposits staggered by simulated one-second blocks, starting settlement at the first position's daily boundary. The first two-pass round reaches Idle but another boundary is already due, so a claim still reverts with CheckpointRequired. In this fixture, **32 rounds / 64 checkpoint transactions**, totaling **63,847,016 gas**, are needed before a claim succeeds.

This exposes a real prototype availability limitation, not an accounting failure. Unlimited positions and continuously arriving boundaries can require repeated global catch-up and keeper work. Deployment review should consider the settlement architecture, admission controls and holder withdrawal guarantees. No production fix or staking deployment is claimed. Emergency closure freezes the accrual cutoff, so its settlement is bounded by the captured position set, but it still needs someone to submit the batches.

## Optional network-dependent fork

The fork test is fixed to BSC block 125790592 and its recorded block hash. It compares six runtime bytecodes and available immutable getters with deployment evidence, checks quotes, and exercises a transfer only in a local impersonated account. EDR uses Shanghai semantics; it does not implement BSC consensus or every chain-specific rule. Default CI skips this test without an explicitly supplied archive RPC. The separate fork attempt **did not pass**: the public BSC endpoint returned `missing trie node` for historical account state at this block. Alternate public endpoints were inaccessible (HTTP 403) in this environment. See [attempt output](bsc-fork-attempt-2026-10-06.txt). A working archive RPC is required before claiming the fork verification passed; no such claim is made here.

## Reviewer package and governance boundaries

[Reviewer handoff](../docs/AUDIT_REVIEW_PACKAGE.md) supplies source/evidence scope, reproduction commands and known limitations. Package manifests record source HEAD, dirty-tree status and SHA-256 for every copied file. Verification detects altered/missing/extra/symlinked files; it is integrity checking, not publisher authentication. CI artifacts expire after 30 days; dated source reports remain versioned. Releases attach the package and checksum only after exact-commit protected checks pass.

[Strict Safe preflight](../docs/MULTISIG_VERIFICATION.md) supports only pinned SafeProxy 1.4.1 and official BSC singleton records from @safe-global/safe-deployments 1.37.63. It validates expected three owners, threshold two and restrictive bypass settings at a single block. Other genuine versions require a separate policy. No actual Safe address, key custody, owner rotation, funding or deployment is verified or performed by this report.
