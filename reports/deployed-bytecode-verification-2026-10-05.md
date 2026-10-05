# Deployed bytecode verification — 5 October 2026

Baseline: b24a518e97a1d987947de1f5d751d2366106630b. Sources: Sourcify v2 compilation/deployment records and BSC public RPC https://bsc-dataseed.bnbchain.org. Snapshot: block 125790592. Exact retrieval timestamp is in verification/bsc-snapshot.json.

Six successful creation receipts matched their created addresses, transaction hashes, block hashes and block numbers. RPC creation inputs and runtime code matched Sourcify records. Original standard JSON inputs reproduced complete creation bytecode plus constructor arguments and runtime code including metadata, with substitutions only at compiler-declared immutable positions. Current mapped repository sources matched executable templates after Solidity CBOR metadata removal.

Commands passed: npm run verify:registry, npm run verify:bytecode, npm test (60 passed, zero failures). Node 24.19.0; npm 11.9.0; solc 0.8.24; Hardhat 3.15.0. Slither results are recorded separately in exact-commit GitHub CI.

Recovered TeamVesting is not the former test-workspace ArexAITeamVesting. The deployed constructor calendar starts 22 May 2027, while the test-workspace schedule starts 22 June 2027. Five direct deployed-source tests cover constructor checks, all twenty date boundaries, underfunded rollback, public triggering and the cumulative cap. The old test implementation remains explicitly labelled. No mainnet transaction or contract change occurred.

Sourcify reports exact matches for both presales. Historical BscScan verification labels were not refreshed and remain separately identified.

Limitations: one RPC provider plus Sourcify, a dated snapshot rather than continuous monitoring, no present balance/ownership/liquidity assurance, no independent professional audit. Matching deployed code does not eliminate vulnerabilities. Dependency source files retain their original licensing notices.

## Reviewed Slither timestamp notice

GitHub code scanning reported the calendar comparison in TeamVesting.vestedTranches (releaseTimes[count] versus block.timestamp) as a low-severity timestamp notice. This comparison is the deployed contract's intended mechanism for scheduled vesting. All twenty before/at boundary cases are tested. Block timestamps remain consensus-controlled and should not be treated as precise wall-clock guarantees; minor boundary timing variation is an accepted limitation of on-chain calendar vesting. No randomness, competitive price decision or timestamp-derived beneficiary is involved. The exact recovered source is retained without modification, and this notice is documented rather than presented as proof of no risk.
