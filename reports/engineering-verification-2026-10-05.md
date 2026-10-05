# Project-run engineering verification — 5 October 2026

Baseline source commit: `190603057b279b06d30e8a2d3bf8f40d49cea2c1`. This report accompanies the PR adding traceability and verified-token tests; the exact proposed commit and remote results are identified by the PR and its CI runs.

Environment: Node.js 24.19.0, npm 11.9.0, Hardhat 3.15.0, solc 0.8.24, OpenZeppelin 5.4.0; EVM paris, optimizer enabled with 200 runs.

Commands: `npm ci --no-audit --no-fund`, `npm run verify:registry`, `npm run compile`, `npm test`. Clean installation, registry and compiler checks passed. The original baseline recorded 52 passing tests; the extended suite records 55 passing tests and zero failures.

New scope: published ArexAIToken constructor and privileged-function absence; deterministic seed 0x41525841, 100 mixed transfer/burn operations with per-step balance and supply checks; delegated burn failure rollback and exact-allowance success at 1 wei, 1 token and total supply boundaries.

Six registry entries pass unique-address, mapped-source/artifact SHA-256 and compiler-configuration checks. YAML templates were parsed locally. Solidity source and published artifact bytes remain unchanged from the baseline.

Slither was not rerun locally; its result must be read from the exact PR commit's GitHub Actions run. The workflow preserves the existing medium-or-higher failure gate.

Limitations: simulated local tests and bounded deterministic properties, not exhaustive fuzzing, live-chain verification or an independent professional audit. Explorer status labels are historical records. Team vesting remains mapped to its explicitly labelled test-workspace implementation. Deployment transaction hashes remain unverified.
