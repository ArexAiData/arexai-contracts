# Reviewer quick start

This guide connects recorded BNB Smart Chain deployments with reproducible repository checks. No wallet connection, private key or blockchain transaction is required.

## Requirements

- Node.js 22.13 or later and npm; the repository records npm 11.9.0.
- Git and enough disk space for dependencies and compiler output.
- Internet access for the initial clone and dependency installation.

Clone the repository, then enter it:

```bash
git clone https://github.com/ArexAiData/arexai-contracts.git
cd arexai-contracts
git rev-parse HEAD
```

Record the commit printed above. A later run against a different commit is a different result.

## One command after cloning

```bash
npm ci --no-audit --no-fund && npm run verify:registry && npm run verify:bytecode && npm run verify:staking-mainnet && npm run verify:consistency && npm run verify:docs && npm run verify:ai-examples && npm run compile && npm test && npm run test:tooling && npm run test:consistency
```

Each step must succeed before the next begins. A nonzero exit is a failure to investigate, not a completed verification. This command preserves the committed lockfile; it neither refreshes chain snapshots nor deploys contracts.

| Step | What it establishes |
| --- | --- |
| verify:registry | Recorded addresses, mapped files, hashes and compiler settings are consistent |
| verify:bytecode | Six historical creation/runtime snapshots are reproduced |
| verify:staking-mainnet | Frozen staking input, constructor and recorded creation/runtime evidence reproduce |
| verify:consistency | Recorded website metadata and README are consistent within the check's scope |
| verify:docs | Generated deployment documentation is current |
| verify:ai-examples | Synthetic AI reference examples pass; this does not invoke the product or AI service |
| compile / test | Development contracts compile and local behavioral scenarios pass |
| test:tooling / test:consistency | Reviewer-package and consistency-check tooling passes |

The latest recorded baseline is documented in the README. Use the actual output and exact-commit Actions run for your checkout; do not assume a historical test count is the result of a new run. Optional archive-RPC fork tests remain skipped unless explicitly configured.

## Source mapping

| Scope | Authoritative entry |
| --- | --- |
| Token, two presales, team vesting and two reserves | [Generated deployment evidence index](DEPLOYMENTS.md) |
| Deployed staking | [Live staking evidence](STAKING_MAINNET.md), [registry](../deployments/staking-mainnet.json) and [frozen compiler input](../verification/staking/solidity-standard-input.json) |
| Development versus deployed source boundaries | [Verification guide](VERIFICATION.md) |
| Exact-commit automated runs | [GitHub Actions](https://github.com/ArexAiData/arexai-contracts/actions) |

The staking address is `0xFc0e57528C171cd63F548AFD35Dd787A1cBb6864`. Its exact deployed source is frozen under `verification/staking/`; `contracts/ArexAIStaking.sol` is a development workspace and cannot upgrade that deployment.

## Separate optional checks

- `npm run audit:dependencies` queries npm's current advisory service. Advisory changes or network failure can change the result independently of the Solidity tests.
- `npm run verify:consistency -- --live` reads the canonical website and whitepaper; it requires network access and Poppler's `pdftotext`.
- Current balances, Safe owners/modules and current permissions require separately dated read-only chain observations. Snapshot reproduction does not refresh them.

These are project-run engineering checks, not an independent professional audit. See [security policy](../SECURITY.md) for private vulnerability reporting.
