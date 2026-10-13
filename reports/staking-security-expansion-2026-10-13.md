# Staking security expansion — 13 October 2026

## Recorded result

**191 passed, 0 failed, 1 skipped** in the complete local contract suite (218.979 seconds). The previous recorded baseline was 173 passed. The additional 18 tests comprise eight differential model tests and ten partial-settlement interleaving tests. The optional archive-RPC BSC fork remains skipped because this run did not configure an archive RPC.

This is project-run engineering evidence, not an independent professional audit. No Solidity source, dependency, deployed contract, governance setting, allocation or on-chain balance was changed.

## Reproducible randomized model

Eight fixed seeds each run 256 randomized operations against both the development implementation and a local deployment compiled from the hash-pinned original staking compiler input: **16 implementation runs, 4,096 randomized operations**. These operations are steps within eight tests, not 4,096 separate test cases. All eight pairs passed an independent financial model and produced identical complete observed state digests.

The six-holder model covers all four staking terms, fractional-token and dust amounts, time advancement, paid and rejected claims, early exits, mature exits, unauthorized access and zero-amount rejection. A deterministic prefix ensures each seed exercises a paid flexible claim. Each run also closes through the local Safe harness and withdraws all remaining positions. Random steps, setup, checkpoint calls and the final sweep are counted separately; per-seed action counters include setup operations.

The independent ledger checks holder balances, active principal, fixed reserves, flexible rewards owed, payouts and surplus burns. Every checkpoint batch checks conservation of the 115M reward cap, full backing of principal plus unpaid rewards, and supply reduction equal to recorded burns. The final sweep requires zero staking balance and paid rewards plus burns equal to the cap.

## Partial-settlement interleavings

Five scenarios are executed against each implementation, for ten additional tests:

| Phase | Checked behavior |
| --- | --- |
| Normal scan | Claim allocated rewards; exit an unscanned principal; preserve accrual through the exit cutoff; prevent further accrual and duplicate exits. |
| Exhaustion scan | Claim old allocations and exit principals before scanning completes; preserve the snapshot and capped allocation. |
| Exhaustion allocation | Interleave claims and exits with delayed, bounded batches; verify exact proportional shares and rounding remainder independently. |
| Emergency scan | Mix flexible and fixed positions, early forfeiture, claims and principal exits while preserving shutdown-cutoff rewards. |
| Emergency allocation | Delay keepers and vary batch sizes/callers; allocate cutoff liabilities, burn only surplus once, and sweep every remaining claim. |

Rejected operations are checked for rollback, including settlement budgets and Safe nonce where applicable. Synthetic reward exhaustion advances time by 1,000 years to reach the cap; it is a stress fixture, not a forecast. These tests use a local Safe harness. The existing real Safe 1.4.1/1.5.0 tests remain in the complete suite, but neither set certifies the current live Safe configuration.

## Evidence and reproduction

- [Complete local test output](contract-tests-2026-10-13.txt)
- [Per-seed state digests, counters and results](staking-stateful-2026-10-13.json)
- [Differential tests](../test/staking-stateful-differential.test.ts)
- [Interleaving tests](../test/staking-interleavings.test.ts)
- [Shared fixture and conservation checks](../test/helpers/staking-security.ts)

Local run: Node.js **24.19.0**, npm **11.9.0**, locked dependencies, Solidity 0.8.24 / Paris, starting from main commit `b900416fcf7b93dbe807c0a2b1a5a32d036cfe2e` plus the changes in this report's introducing commit. GitHub Actions uses the repository's pinned Node.js **22.13.0**; its exact-commit results must be checked separately. CI now retains `ci-evidence/staking-stateful.json` alongside its full output and source commit.

```sh
npm ci --no-audit --no-fund
mkdir -p ci-evidence
STAKING_STATEFUL_REPORT=ci-evidence/staking-stateful.json npm test
```

The frozen compiler input and import integrity are checked by the existing frozen-artifact loader. File hashes for the new test implementation:

| File | SHA-256 |
| --- | --- |
| `test/helpers/staking-security.ts` | `ba3b0d8b1fde769ee9f8fe9b0ff5ab0b4efa10b29e348c5aebd2adb069da2ba1` |
| `test/staking-stateful-differential.test.ts` | `f7e53f626cf55c25289654a0ea7ba128b3a9703ff079c311d680360b0f0c52bd` |
| `test/staking-interleavings.test.ts` | `6951f3625499eb7a271e6bd7b4549d3f9bdad5d6737bd8125876fdc20b57f422` |

Deterministic finite runs do not exhaust the state space or prove absence of vulnerabilities. Local reproduction of frozen deployment code is distinct from a live-chain fork. Independent audit, live governance review and operational keeper reliability remain separate work.
