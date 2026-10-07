# Project-run staking holder-access evidence — 7 October 2026

Status: unreleased prototype; no public deployment, funding, signer change or independent audit. Based on repository commit `347b8c58b38c56d0a9bb2db05f379575328a52dc` plus the changes in this PR. The PR and exact-commit CI identify the resulting source revision.

## Behavior

- `withdrawPrincipal(id)` returns the holder's full principal independently of overdue boundaries or either normal/emergency checkpoint pass. It records an exit cutoff and does not change captured membership or calculation principal. `totalPrincipal` drops immediately; a final withdrawal cannot pay it again.
- Flexible earning stops at that exit cutoff. Complete days reached after the current snapshot remain scheduled for a subsequent round.
- Allocated flexible claims are independent of global catch-up, including while Scan/Allocate is active. They consume only `owedFlexible`; they do not enlarge or reorder the allocation budget.
- Voluntary locked early principal exits permanently forfeit rewards even if emergency closure follows before final cleanup. Emergency exits preserve the closure-cutoff entitlement. A dedicated boolean, rather than comparing exit and shutdown timestamps, handles same-block ordering.
- Final locked withdrawals do not wait for unrelated flexible boundaries. Flexible final withdrawals require their own elapsed days to be settled and no active pass.
- Rates, full funding, cap, original daily anchors, proportional exhaustion, governance checks and permanent closure remain unchanged.

## Local validation

[Complete Solidity output](staking-tests-2026-10-07.txt): **103 passed, 0 failed, 1 skipped**. The skipped test needs an explicitly configured archive RPC. Seven new regressions cover ownership/repeated exits, frozen flexible accrual, exits before/after scan, claims during allocation, early locked forfeiture followed by closure, mixed emergency principal exits/reward conservation, exhausted pro-rata allocation, and independent locked maturity withdrawal. One regression specifically covers a day reached between snapshot and exit (the scan/claim scenarios share a test).

Existing four seeded accounting models, proportional-exhaustion checks and 1/64/256-position load fixtures pass. Six recorded deployed-bytecode reproductions, six registry entries, generated deployment docs and the 16 reviewer-tooling tests pass. These checks do not verify a live Safe or change an existing deployed contract.

[Updated boundary fixture](staking-boundary-2026-10-07.json): allocated claim succeeds after the first round while another boundary is overdue. Full admission catch-up still takes **32 rounds / 64 transactions / 68,750,296 gas** in this local one-second-block fixture. The prior implementation needed that catch-up before a claim could succeed. The new exit function's independent path is exercised during both checkpoint passes and emergency settlement; no production gas or throughput guarantee is made.

Tools: Node 24.19.0, npm 11.9.0, Hardhat 3.18.1, solc 0.8.24, Paris EVM, optimizer 200. Raw results are local simulations, not a public testnet lifecycle or external review.

## Remaining limits

This change protects holder access; it does **not** remove two-pass O(n) reward allocation. New admissions, unallocated rewards, burn finalization and active-pass final position removal still depend on keeper transactions. Exited positions remain in the sets until final withdrawal, so abandoned positions still contribute scan work. Early locked forfeitures remain reserved until final cleanup or emergency settlement. Further architecture review and independent security assessment remain necessary before a public rollout.
