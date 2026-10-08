# Frozen staking behavior and published consistency — 8 October 2026

## Change and boundaries

The existing 24 staking behavior scenarios now run against two independent factories: the Hardhat development artifact and bytecode compiled from the complete hash-pinned original mainnet Standard JSON input, including embedded dependency sources. The latter checks the recorded input hash, solc version and original ABI before local deployment. No staking source, compiler input, deployed address or contract parameters changed.

The shared suite covers activation/funding, simple APR quotes, owner isolation, fixed early/mature exits, 24-hour flexible boundaries, claims, pro-rata exhaustion, recycled reservations, bounded checkpoints, principal exits during allocation, emergency earned liabilities and surplus burning. A getter-compatible Safe harness models two approvals; it does not prove real Safe signature/module behavior. The existing exact creation/runtime snapshot verifier remains separate. Mainnet behavioral cases are local simulations, not a live fork or independent audit.

Published website/whitepaper consistency now runs daily at 03:20 UTC, on relevant PRs/pushes and manually. Rejection cases run first. Reads do not change production data. Scheduled execution can be delayed and failures can include temporary fetch errors.

The engineering release template no longer describes live staking as unreleased. Live frozen evidence and development/prototype evidence remain explicitly distinct.

## Validation

- Full Hardhat suite: **133 passed, 0 failed, 1 skipped** (optional archive-RPC fork).
- Frozen staking subset: **24 passed**, using original compiler input.
- Original staking exact creation/runtime snapshot reproduction: passed.
- Recorded project consistency and 12 negative scenarios: passed.
- Published site and whitepaper consistency: passed at review time; not a perpetual guarantee.
- Deployment documentation and four synthetic AI reference fixtures: passed.
- Reviewer-package tooling: 16 passed.
- npm dependency audit: 0 reported vulnerabilities at review time.

No independent professional audit, current wallet balances, production deployment or upgrade is implied. GitHub CI results apply to their own exact commit and must be checked before merge/release.
