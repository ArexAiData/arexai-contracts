# Engineering reviewer refresh — 14 October 2026

## Scope

This release updates public AI documentation from v3.16.1 to v3.22.0 and publishes synthetic source files, deterministic reviewed XLSX/JSON outputs and historical application verification evidence. A standalone Python standard-library oracle is added to the existing `verify:ai-examples` command and therefore its existing CI gate. It imports no private application code and calls no model or external service.

The review archive also includes already merged changes since `engineering-2026-10-09`: the [191-test staking security expansion](staking-security-expansion-2026-10-13.md), contribution flow documentation, allocation reconciliation and complete reviewer artifact handling. The [reviewer guide](../docs/AUDIT_REVIEW_PACKAGE.md) now describes this newer coverage.

This change modifies documentation, public synthetic evidence, one reference checker, its npm script and the engineering release manifest. It changes no Solidity source, deployed contract, governance, token allocation, dependency version or private application implementation. The application product version and this repository's engineering tag remain separate.

## Source provenance and verification

Public base commit: `754d4f7c8013c14953e42ad52be514ed55baa776`. Local validation below covers the proposed working tree based on that commit; it does not claim that a future merge commit has already passed. The protected PR and main-branch Actions runs identify the exact tested public commit. The release workflow waits for successful `Hardhat 37-test suite` (historical compatibility name) and `Slither 0.11.6` checks on the exact merged commit before publishing `engineering-2026-10-14` and its hashed archive.

Private application source: `b567b1ae729aacbd15a7211dbc6c8b457d65b59f`. See [AI product evidence and limits](../docs/ai/reliable-delivery-v3.22.0.md) and [copied-file provenance](ai-v3.22.0/provenance.json). The 94 application groups were run during the product release, not during this public repository update. Original test failures and targeted replays remain visible.

Local environment: Node.js 24.19.0, npm 11.9.0, Python 3.12.14, Hardhat 3.18.1 and Solidity 0.8.24 (`paris`, optimizer 200 runs). GitHub CI separately uses the retained Node.js 22.13.0 project runtime and Slither 0.11.6. No dependency upgrade is part of this release.

## Local commands and results

All commands below exited 0 on 14 October 2026. The full local contract output is preserved in [contract-tests-2026-10-14.txt](contract-tests-2026-10-14.txt).

| Command | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Exact lockfile installation succeeded. |
| `npm run compile` | 15 Solidity files compiled with the retained compiler. |
| `npm test` | 191 passed, 0 failed, 1 optional archive-RPC fork skipped. |
| `npm run verify:registry` | Six registry records, hashes and compiler settings passed. |
| `npm run verify:bytecode` | Six recorded creation/runtime snapshots reproduced. Offline evidence, not a current chain query. |
| `npm run verify:staking-mainnet` | Frozen staking creation/runtime and recorded activation evidence reproduced. |
| `npm run verify:docs` | Generated deployment evidence table matches. |
| `npm run verify:consistency` | Recorded website metadata mirrors agree; not a live-site check. |
| `npm run test:consistency` | 17 consistency/rejection tests passed. |
| `npm run verify:ai-examples` | Retained reference examples and five period fixtures passed; three new source/report cases covered 55 source records and 63 pairwise occurrences, plus 12 damaged-report rejection cases. |
| `npm run test:tooling` | 16 reviewer package checks passed. |
| `npm run audit:dependencies` | No reported vulnerabilities at the time of this run. |

Slither is evaluated by the required GitHub Actions job; it was not rerun locally. [Exact-commit Actions](https://github.com/ArexAiData/arexai-contracts/actions) and the release's source commit are authoritative for publication. The archive manifest records that commit, each file's SHA-256 and a clean-tree flag. A checksum proves byte integrity, not publisher identity or security.

## Limits and reproduction

Use Node.js 22.13+ and Python 3.10+ (standard library only for the new oracle). Follow the [reviewer quick start](../docs/REVIEWER_QUICKSTART.md), then the [strict archive verification procedure](../docs/AUDIT_REVIEW_PACKAGE.md). Verify the downloaded archive before installing dependencies, since strict verification rejects extra files.

Contract tests are local simulations with bounded deterministic cases; the optional archive-RPC fork remains skipped. No on-chain transaction or new state observation was performed. Independent professional audit remains pending.

Public AI checks validate committed synthetic files and recorded evidence, not the private app or a live AI model. The historical product run passed 94 regression groups; five of seven selected live attempts passed across revisions. Initial explanation withholding and delivery failure are preserved, with both targeted replays passing. Those replays do not establish universal reliability. Browser/mobile interaction, actual IndexedDB reloads and customer pilots remain untested. Source-address validity and four summary arithmetic checks do not certify all report semantics or qualitative prose.
