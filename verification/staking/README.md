# Frozen live staking compilation evidence

This directory preserves the original deployment compiler input and readable project sources for live ARXAI staking. Dependency source contents are included in the standard JSON input. Original preparation comments are intentionally unchanged for exact bytecode reproduction.

- Deployment record: [staking-mainnet.json](../../deployments/staking-mainnet.json).
- Original project source: [ArexAIStaking.sol](source/ArexAIStaking.sol).
- Deadline queue dependency: [StakingDeadlineQueue.sol](source/StakingDeadlineQueue.sol).
- ABI: [abi.json](abi.json).
- BSC evidence: [bsc-snapshot.json](bsc-snapshot.json).
- Historical Safe observations: [safe-observed-evidence.json](safe-observed-evidence.json).
- Website metadata mirrors: `listing-data.json` and `contracts.json`; these are recorded documents, not live fetch results.

See [verification scope and reproduction](../../docs/STAKING_MAINNET.md). Do not replace frozen source with development workspace changes or interpret successful local checks as an audit.
