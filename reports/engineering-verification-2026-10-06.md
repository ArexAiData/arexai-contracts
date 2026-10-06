# Project-run engineering verification — 6 October 2026

Local verification completed at 2026-10-06T12:55:49Z. Source base: `2d2096c7c1cce464135f6a7367dc37c7c5e8523b`, plus the recipient/pause and evidence changes in this report's commit. The GitHub Release and CI runs identify the exact resulting source SHA; a pre-commit report cannot supply its own commit hash.

## Environment and results

| Check | Result | Scope |
| --- | --- | --- |
| Lockfile installation | Exit 0 | npm install with the reviewed lockfile; CI separately uses npm ci |
| Registry integrity | Exit 0; six entries | Addresses, source/artifact hashes, transaction-hash shape, deployment blocks and compiler settings |
| Bytecode reproduction | Exit 0; six entries | Original creation/runtime and current executable templates against the 5 October recorded snapshot at BSC block 125790592 |
| Generated deployment index | Exit 0 | All six documented entries match registry and original compiler inputs |
| Synthetic AI reference examples | Exit 0; four fixtures | Deterministic reference consistency, not application or AI-model execution |
| Solidity behavioral suite | Exit 0; **85 passed, 0 failed** | Existing 76 checks plus nine recipient/pause reproductions |
| npm dependency audit | Exit 0; **0 vulnerabilities reported** | Installed production and development dependency advisory check at verification time |
| Release script syntax | Exit 0 | node --check; publishing is gated separately on GitHub CI |

Local tools: Node.js **24.19.0**, npm **11.9.0**, Hardhat **3.15.0**, solc **0.8.24+commit.e11b9ed9**; Paris EVM, optimizer enabled with 200 runs. CI uses the existing Node.js 22.13.0 environment. Complete local test output: [automated-tests-2026-10-06.txt](automated-tests-2026-10-06.txt).

## Changes and findings

- A transfer-rejection fixture reproduces blocked treasury/buyer purchases and rollback of payment, allowance, ARXAI delivery and sale accounting.
- Reserve and liquidity counters roll back on rejected recipient transfers. Both vesting implementations retain earned liabilities after transfer failure. These generic dependency-failure tests do not imply the official ARXAI token has a blacklist.
- Pausing leaves immutable start/end timestamps unchanged. Unpausing after end does not reopen the sale. Owner finalization remains possible while paused after the deadline.
- npm initially reported vulnerable `tmp` through the solc JavaScript wrapper. A solc-scoped override pins **tmp 0.2.7**; the Solidity compiler remains 0.8.24. Registry and complete recorded-bytecode reproduction still pass. No npm audit fix --force or Solidity compiler upgrade was used.
- CI adds high/critical dependency gating, generated-document consistency and standalone synthetic AI reference checks. Test logs and Slither SARIF are retained as per-commit downloadable artifacts for 30 days.
- Engineering releases wait for the existing protected Hardhat and Slither checks on their exact commit. The historical `Hardhat 37-test suite` context remains a compatibility alias; the local total is 85.

## Limits

No current BSC ownership, balances, recipient blocklist state or new mainnet bytecode was fetched for this report. No mainnet transaction, deployment, migration, recipient rotation, presale extension, reserve allocation change or staking funding occurred. Staking remains an unreleased prototype.

Slither is run by GitHub Actions, not claimed as locally executed here. The release workflow links the exact commit only after its required checks pass. Tests and advisory scans are project-run engineering evidence, not an independent audit or proof of absence of vulnerabilities. AI examples do not open-source the application implementation or benchmark the AI model.
