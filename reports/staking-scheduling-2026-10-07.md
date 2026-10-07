# Project-run staking scheduled-settlement evidence — 7 October 2026

Status: unreleased prototype; no deployment, funding, Safe change or independent audit. Source baseline `1223e6b07eb1352e5f5e9a3c66c5eb5c6160fc06` plus this PR. Exact-commit CI and the PR identify the resulting revision.

## Design and unchanged rules

A packed min-heap schedules next complete-day deadlines. Normal snapshots process only due deadlines, pruning inactive entries once; they do not calculate rewards for not-yet-due positions. Original deposit anchors and exit cutoffs remain unchanged. Aggregate daily rate times the maximum possible overdue days is a conservative liability bound; the implementation uses division to avoid overflowing the bound product. If available capacity covers it, rewards are allocated in the scan. Otherwise only positive dues are queued for proportional allocation. Heap operations are O(log N); emergency still scans all captured active positions in two passes.

The packed key has a 64-bit Unix deadline and 192-bit sequential position ID. Only root rescheduling/removal is exposed internally; IDs are generated once by staking, and stale entries are marked using contract membership flags. Final withdrawals remove their daily rate immediately, and the eventual stale-root prune cannot remove it a second time.

Rates, 115M cap, full funding, no stake amount limits, principal-only exits, locked forfeiture/recycling, accrued claims and emergency/burn rules are retained. A fallback heap scan consumes two work credits; allocation and emergency items consume one. One-credit calls still advance one fallback scan. This keeps tested fallback scans within their receipt ceiling without weakening the 64-item maximum.

## Local validation

[Complete output](staking-scheduled-tests-2026-10-07.txt): **109 passed, 0 failed, 1 skipped**. The optional archive-RPC case is skipped. Six deployed-bytecode reproductions, registry/docs checks and 16 reviewer-tooling tests pass. These checks do not validate a public staking address or a real project Safe.

New tests include 500 deterministic queue operations against an independent sorted model; packed-bound/tie/root safety; one-time stale pruning and aggregate-rate conservation; 1,026 queued positions with only two due; 1,024 due positions with normal settlement, emergency and 32 principal exits during closure; and 1,024-position exhaustion with exact equal shares and final rounding dust, reversed claim order and principal exit. Existing four seeded accounting models, mixed terms, partial snapshots, paused-reserve recycling, tiny rewards, owner guards and double-payment regressions pass.

Local tools: Node 24.19.0, npm 11.9.0, Hardhat 3.18.1, solc 0.8.24, Paris EVM, optimizer 200. Fixtures are bounded simulated evidence, not production throughput estimates or exhaustive fuzzing.

## Measured receipts

| Positions | Fixture | Normal or exhaustion calls | Total gas | Largest call gas |
| ---: | --- | ---: | ---: | ---: |
| 1026 | sparse-normal | 2 | 636,730 | 414,217 |
| 1024 | dense-normal-and-emergency | 16 | 105,318,529 | 7,578,203 |
| 1024 | dense-exhaustion | 48 | 162,645,014 | 4,796,907 |

[Raw scale data](staking-scale-2026-10-07.json). The dense normal fixture additionally completes emergency settlement in 32 calls while preserving 32 immediate principal exits. All tested calls are below 8M gas. Counts exclude staking deposits, Safe approvals, emergency initiation and claims/exits unless explicitly named.

The [staggered-boundary case](staking-scheduled-boundary-2026-10-07.json) uses 62 rounds / 62 calls / **15,457,445 gas**, versus the previous prototype's 32 rounds / 64 calls / **68,822,968 gas**. Allocated claims remain available after the first round. Total gas falls approximately 77.5% in this fixture; catch-up still spans multiple calls and does not become constant-time.

The dense 256-position full-budget fixture takes 4 calls / **24,196,159 gas**, compared with the dated earlier fixture's 8 calls / **22,995,898 gas**. Fewer calls do not imply lower total gas: heap maintenance increases total gas in this dense comparison. [Updated small load cases](staking-scheduled-load-2026-10-07.json). Historical reports use their recorded toolchains; these are fixture comparisons, not live BNB fee predictions.

## Remaining deployment concerns

Keepers still pay for due deadlines, deferred allocations and emergency passes. Unlimited positions can increase heap depth and backlog; the 8M receipt ceiling is only proven for these fixtures, not arbitrary queue sizes. Fully dense and exhausted rounds can cost more than linear scans. New admissions and unallocated rewards can still wait for catch-up at continuously arriving boundaries. Inactive roots require one eventual prune; abandoned exited positions remain in the emergency active set until final withdrawal. Paused/exhausted programs still retain scheduled positions and can incur zero-reward checkpoint work. Mainnet deployment and independent assessment remain pending.
