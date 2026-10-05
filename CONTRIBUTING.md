# Contributing

Use an issue for reproducible non-sensitive bugs or a focused feature proposal. Report exploitable issues privately following [SECURITY.md](SECURITY.md).

Branch from current main, keep changes focused and run `npm ci --no-audit --no-fund`, `npm run verify:registry`, `npm run compile` and `npm test`. Add behavioral tests for meaningful Solidity changes. Update registry hashes only after reviewing the affected source and artifact scope. Never commit credentials, private keys, environment files or real user datasets.

Describe the trigger, expected and actual behavior, exact commit, test results and limitations in the pull request. Dependency updates require passing checks and review; do not merge automatically. Existing required checks include a historical `Hardhat 37-test suite` compatibility alias that depends on the current suite and registry gate. Slither must also pass. A passing check is not an audit.
