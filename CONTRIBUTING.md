# Contributing

## Contribution rewards

The funded contribution program has a 28,750,000 ARXAI budget, evaluated by contribution importance and impact. Apply using the [official form](https://arexaidata.com/contributions); opening an issue or PR is not a reward application or guarantee. Awards are unlocked, paid manually through a separate 2-of-3 Safe, and available until the budget is exhausted. Read [program rules](docs/CONTRIBUTION_REWARDS.md) and [current allocations](docs/RESERVE_ALLOCATION.md). Never include confidential vulnerability details in a public issue or application; use the private channel in SECURITY.md.

## Engineering contributions

Use an issue for reproducible non-sensitive bugs or a focused feature proposal. Report exploitable issues privately following [SECURITY.md](SECURITY.md).

Branch from current main, keep changes focused and run `npm ci --no-audit --no-fund`, `npm run verify:registry`, `npm run compile` and `npm test`. Add behavioral tests for meaningful Solidity changes. Update registry hashes only after reviewing the affected source and artifact scope. Never commit credentials, private keys, environment files or real user datasets.

Also run `npm run verify:bytecode`, `npm run verify:docs`, `npm run verify:ai-examples` and `npm run audit:dependencies`. Regenerate the deployment index with `npm run docs:generate` after intentional registry/evidence changes. Keep the original Solidity compiler pinned; dependency remediations must preserve compilation and snapshot reproducibility. The `solc`-scoped `tmp` override addresses build-tool advisories and is not a contract upgrade.

AI examples must be explicitly synthetic and include expected units, code definitions and ambiguity behavior. Their standalone reference checker is not a substitute for testing application source or an AI model.

Describe the trigger, expected and actual behavior, exact commit, test results and limitations in the pull request. Dependency updates require passing checks and review; do not merge automatically. Existing required checks include a historical `Hardhat 37-test suite` compatibility alias that depends on the current suite and registry gate. Slither must also pass. A passing check is not an audit.

For AI issues, include the product version, locale, browser/device, synthetic reproduction file, row meaning and units, expected/actual result and source coordinates. Distinguish live application failures from public reference-fixture failures. See [the latest quality evidence](docs/ai/quality-2026-10-10.md) for verified and unverified scope.
