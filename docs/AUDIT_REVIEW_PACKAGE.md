# Independent reviewer handoff

## Scope and priorities

1. Deployed contracts: six registry addresses, exact original compiler inputs, creation receipts, recorded runtime bytecode and repository source hashes in [DEPLOYMENTS.md](DEPLOYMENTS.md).
2. Known recipient/pause availability boundaries: [RECIPIENT_AND_PAUSE_POLICY.md](RECIPIENT_AND_PAUSE_POLICY.md).
3. Live staking: [STAKING_MAINNET.md](STAKING_MAINNET.md), frozen compilation input and snapshot. Development/test design: [STAKING_DESIGN.md](STAKING_DESIGN.md). Review reward/principal conservation, rounding, exhaustion, reservation recycling, flexible daily anchors, bounded checkpoint availability and permanent closure.
4. Genuine governance: strict [Safe preflight](MULTISIG_VERIFICATION.md), signer custody, owner changes and recovery procedure. `StakingSafeHarness` is intentionally test-only.
5. Review CI, dependency overrides and release/package provenance separately from deployed-contract logic. AI examples are synthetic reference material outside Solidity audit scope unless explicitly agreed.

## Reproduce

Use the committed lockfile, pinned compiler and documented tool versions. Run `npm ci`, `npm run audit:dependencies`, registry/bytecode/docs/reference checks, `npm run compile`, and `npm test`. The original seeded models use four fixed seeds and 60 operations per seed. The [13 October expansion](../reports/staking-security-expansion-2026-10-13.md) additionally covers eight differential scenarios with 4,096 operations across development/frozen implementations and ten settlement-interleaving tests. The recorded baseline is 191 passed and one optional fork skipped. Load evidence includes the original 1/64/256-position fixtures and later 1,024-position frozen/development scenarios. These are bounded local simulations, not exhaustive fuzzing or production traffic forecasts.

AI v3.22.0 evidence and source/report examples are included separately. Run `npm run verify:ai-examples` with Python 3.10+ available to check all 55 synthetic source records and saved report cells. This does not run the private application or model, reproduce its 94 historical regression groups, or expand the Solidity audit scope.

Optional archived-state fork: `BSC_FORK_RPC_URL=<read-only-archive-rpc> npm test`. The fork is pinned to BSC block 125790592, verifies runtime code/constructor links and executes a token transfer only in the local simulated network. Default tests skip the fork without an RPC. EDR uses Shanghai semantics and does not emulate BSC consensus, mempool or every BSC-specific rule.

## Build and verify a review package

`npm run review:package -- /tmp/arexai-review-unique` copies the explicit source/evidence scope and writes SHA-256 values for every file to `MANIFEST.json`. `npm run review:verify -- /tmp/arexai-review-unique` rejects altered, missing, duplicate, unexpected or symlinked package files. The manifest records HEAD and whether the working tree was dirty; a dirty package must not be presented as an exact clean-commit release. Neither hashes nor a package prove the author's identity.

GitHub CI publishes the review directory as an artifact and checks its copied bytes. Artifacts expire after 30 days; source reports remain versioned. Engineering releases attach a tar archive plus its checksum only after required tests and Slither pass. Verify the release commit independently, extract the archive into an empty directory, run the package verifier and compare its `sourceCommit`/`workingTreeDirty` fields. Enforce that comparison with `npm run review:verify -- <directory> --commit <independently-verified-40-character-sha> --clean`. CI and release packaging use this strict gate. `npm run test:tooling` exercises malformed manifests, altered/missing/extra files, traversal paths, symlinks, dirty trees, commit mismatches and a real builder/verifier round trip.

## Requested independent review output

Record exact source SHA, scope/exclusions, environment, exploit prerequisites, severity rationale, proof-of-concept, fixes and retest status. Distinguish deployed contracts from prototype/test fixtures and snapshot evidence from current on-chain state. No independent audit is completed or implied by this package. Send exploitable issues privately to info@arexaidata.com.
