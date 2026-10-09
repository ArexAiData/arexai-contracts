# ArexAi Contracts

[![Contract Tests](https://github.com/ArexAiData/arexai-contracts/actions/workflows/tests.yml/badge.svg)](https://github.com/ArexAiData/arexai-contracts/actions/workflows/tests.yml)
[![Slither Security Analysis](https://github.com/ArexAiData/arexai-contracts/actions/workflows/slither.yml/badge.svg)](https://github.com/ArexAiData/arexai-contracts/actions/workflows/slither.yml)

Official public smart-contract engineering repository for **ArexAi (ARXAI)** on BNB Smart Chain.

## Official links

- Website: https://arexaidata.com
- Security page: https://arexaidata.com/security
- Contract registry: https://arexaidata.com/contracts.json
- Product and engineering updates: https://arexaidata.com/updates
- Email: info@arexaidata.com
- X: https://x.com/ArexAIData
- Telegram: https://t.me/arexai

## Live staking on BNB Smart Chain

ARXAI staking is live at `0xFc0e57528C171cd63F548AFD35Dd787A1cBb6864`. The funded reward cap is **115 million ARXAI** from the original 575 million reserve; the remaining reserve allocation is **460 million ARXAI**. Rates are immutable simple APRs: **2% flexible, 5% for 30 days, 8% for 60 days, 12% for 90 days**, using 365 days without automatic compounding.

Staking governance is `0x1C4a898e3355Dbc8D9A9C75400042a025DC209e6`; the recorded Safe configuration is 2-of-3 and its scope is permanent staking emergency closure. This does not claim that presale or reserve administration moved to the Safe, or that owners/modules cannot change.

- [Live deployment and activation record](deployments/staking-mainnet.json).
- [Frozen compiler input and sources](verification/staking/README.md), reproduced against exact creation and runtime bytecode, including metadata and constructor arguments.
- [Live staking verification](docs/STAKING_MAINNET.md) and [application](https://arexaidata.com/staking).
- `contracts/ArexAIStaking.sol` remains the development/test workspace. It is not substituted for the frozen deployment source; historical prototype reports retain their dated scope. Future source edits do not upgrade the immutable deployment.

Independent professional audit remains pending. Historical source comments saying “unreleased” describe preparation time; the deployment receipt and activation evidence record the later mainnet status.

## BNB Smart Chain deployments

| Component | Address | BscScan |
| --- | --- | --- |
| ARXAI token | `0xeaa12b3be7cdec7749b972ed5c342f4e933ccbb3` | [View](https://bscscan.com/token/0xeaa12b3be7cdec7749b972ed5c342f4e933ccbb3) |
| Presale Round 1 | `0x52c880e4d54a5dd3ca7dd185d44715017b25dee0` | [View](https://bscscan.com/address/0x52c880e4d54a5dd3ca7dd185d44715017b25dee0#code) |
| Presale Round 2 | `0x0709b5f668280f54b48b953c3d2bd7e137e43398` | [View](https://bscscan.com/address/0x0709b5f668280f54b48b953c3d2bd7e137e43398#code) |
| Team vesting | `0x2d607fdb0da6407c29c2d4bdafab2e1479eb5ee2` | [View](https://bscscan.com/address/0x2d607fdb0da6407c29c2d4bdafab2e1479eb5ee2#code) |
| Listing reserve | `0x6af332c903c8f3fde0e620b360247c28476a2180` | [View](https://bscscan.com/address/0x6af332c903c8f3fde0e620b360247c28476a2180#code) |
| ARXAI staking | `0xFc0e57528C171cd63F548AFD35Dd787A1cBb6864` | [View](https://bscscan.com/address/0xFc0e57528C171cd63F548AFD35Dd787A1cBb6864#code) |
| Liquidity reserve | `0xc141a3f0c90f3fa3b5f55fac6683715a14835e42` | [View](https://bscscan.com/address/0xc141a3f0c90f3fa3b5f55fac6683715a14835e42#code) |

The original six-contract machine-readable deployment registry is available at [`deployments/bsc-mainnet.json`](deployments/bsc-mainnet.json).

For a single view of source files, creation transactions, compiler inputs and verification boundaries, use the [generated deployment evidence index](docs/DEPLOYMENTS.md). CI checks that it stays synchronized with the registry and recorded snapshot.

Material repository changes are recorded in [`CHANGELOG.md`](CHANGELOG.md).

## Repository scope

- `contracts/verified/ArexAIToken.sol`: source prepared for the exact BscScan-verified ARXAI token deployment.
- `contracts/PresaleRound.sol`: active presale source used by Round 1 and Round 2.
- `contracts/TeamVesting.sol`: exact deployed team-vesting source recovered from Sourcify, tested directly with the verified constructor schedule.
- `contracts/ArexAI.sol` and `contracts/ArexAITeamVesting.sol`: separate test-workspace implementations; not substitutes for deployed token/vesting sources.
- `contracts/ReserveVault.sol`: exact-match verified 575M listing-reserve source with twenty fixed tranches.
- `contracts/LiquidityReserveVault.sol`: exact-match verified 200M liquidity-reserve source with an immutable manager.
- `contracts/mocks/`: test-only payment-token contracts.
- `test/`: the Hardhat behavioral suite covering all five active contract types.
- `artifacts/`: public ABI and bytecode artifacts for the deployed contracts.
- `reports/`: project-run automated test and static-analysis evidence.

The two reserve sources were recovered from exact-match verified BNB Chain records. Their locally compiled executable logic matches the published deployment artifacts; compiler metadata differences are not treated as contract behavior. ABI or bytecode artifacts are not presented as source code.

## Review and reproduce

Start with the [reviewer quick start](docs/REVIEWER_QUICKSTART.md) for prerequisites, a single fail-fast verification command and the boundary between recorded snapshots and current chain state.


- [Source and deployment mapping](docs/VERIFICATION.md): distinguish published sources, test implementations and artifacts.
- `npm run verify:registry` checks all six deployment records, source/artifact hashes and compiler configuration. It does not query BSC or certify deployed-bytecode equivalence.
- `npm run verify:bytecode` reproduces six creation/runtime bytecode snapshots and checks current executable templates; see [creation transactions](deployments/TRANSACTION_HASHES.md).
- Five additional direct TeamVesting tests cover the actual deployment schedule. The original 52 tests remain intact; three additional tests exercise `contracts/verified/ArexAIToken.sol`, including a seeded 100-operation balance/supply invariant and delegated-burn rollback boundaries.
- [Contribution guide](CONTRIBUTING.md) and issue templates describe reproducible, privacy-safe reports.
- [Release procedure](docs/RELEASING.md) records the tested commit, tool versions and evidence scope before publication.
- [Immutable recipients and pause policy](docs/RECIPIENT_AND_PAUSE_POLICY.md) explains transfer failures, atomic rollback, fixed deadlines and recovery limitations, with nine executable reproductions.
- [AI v3.9.6 technical reference](docs/ai/README.md) documents saved source-row inspection and worksheet overviews alongside synthetic call-record, accounting, survey and list-reconciliation examples. Reference checks are separate from Solidity tests and do not invoke the product or AI model.

## Compiler configuration

- Solidity: `0.8.24` (`v0.8.24+commit.e11b9ed9`)
- Optimizer: enabled
- Optimizer runs: `200`
- EVM version: `paris`
- OpenZeppelin Contracts: `5.4.0`
- Hardhat: `3.18.1`

## Frozen mainnet behavioral coverage

`test/staking-mainnet.test.ts` runs the same 24 behavioral scenarios as the development suite, but deploys bytecode compiled directly from the hash-pinned original Standard JSON input. It never resolves staking imports from the development workspace. This covers funding, APRs, daily boundaries, early/mature exits, exhaustion, principal access, bounded settlement and emergency liability/burn accounting. These are local simulated deployments using a Safe test harness, not transactions against mainnet or a professional audit. Exact original creation/runtime reproduction remains a separate CI gate.

Published website/whitepaper consistency is checked daily at 03:20 UTC (06:20 Istanbul), on relevant PRs and pushes, and manually. A failure reports drift or fetch failure; it never edits the website or sends a blockchain transaction. GitHub scheduled runs may be delayed.

## Latest reproducible baseline

The latest recorded local Solidity baseline is **173 passed, 0 failed, 1 skipped**, including [four frozen-mainnet load scenarios](reports/staking-frozen-load-2026-10-08.md). The prior [169-test SafeL2 baseline](reports/staking-safe150-2026-10-08.md) remains historical evidence at commit `ea5c40edb9a5e09c6d1d635fdcd14b7fa8756c8d`. Exact-commit CI is authoritative for later commits; the optional archive-RPC fork is skipped by default. See [frozen staking behavioral evidence](reports/frozen-staking-behavior-2026-10-08.md) and [scheduled-settlement evidence](reports/staking-scheduling-2026-10-07.md) and exact-commit GitHub Actions for current results. Historical counts below refer to their dated reports. The live staking deployment is documented separately using frozen source and bytecode evidence; dated prototype test reports are engineering evidence, not an audit. [7 October access improvements](reports/staking-access-2026-10-07.md) protect principal exits and allocated claims while the [scheduled-settlement prototype](reports/staking-scheduling-2026-10-07.md) now visits due deadlines only. Dense and emergency keeper costs remain deployment concerns.

## Run the tests

Requirements: Node.js 22.13 or later and npm.

```bash
npm ci --no-audit --no-fund
npm run verify:registry
npm run verify:bytecode
npm run verify:staking-mainnet
npm run verify:consistency
npm run verify:docs
npm run verify:ai-examples
npm run audit:dependencies
npm run compile
npm test
npm run test:tooling
```

Historical project-run verification on 27 September 2026:

- 52 passed
- 0 failed
- 5 active contract types covered by executable behavioral tests
- clean compiler and CI test gates

See [`reports/automated-tests-2026-09-27.txt`](reports/automated-tests-2026-09-27.txt) for scope and limitations.

GitHub Actions also runs the Hardhat test suite and Slither analysis automatically on every push to `main` and every pull request targeting `main`. The Slither workflow uploads SARIF findings to GitHub Security and blocks medium-or-higher findings.

The additional token tests run the published `ArexAIToken` source; the original `ArexAI` tests still cover the test-workspace implementation. Behavioral tests are local simulated deployments. Separate bytecode evidence reproduces mainnet creation/runtime snapshots; no transaction is sent to BSC. The [5 October verification report](reports/engineering-verification-2026-10-05.md) records 55 passing tests. See CI for the result of each commit.

The [6 October verification report](reports/engineering-verification-2026-10-06.md) records **85 passing tests** including the existing staking prototype suite and nine new recipient/pause checks. CI now also blocks high/critical npm dependency findings and stale deployment documentation, and preserves test logs and Slither SARIF as downloadable artifacts for 30 days. Required branch checks remain enforced through the existing test compatibility alias and Slither job.

See the [7 October repository hardening report](reports/repository-hardening-2026-10-07.md) for the jointly validated Hardhat/plugin update, pinned workflow actions and 16 reviewer-package tooling tests.

## Engineering releases

### Staking readiness and reviewer handoff

The [staking engineering report](reports/staking-engineering-2026-10-06.md) adds four seeded accounting models, 1/64/256-position gas measurements and a daily-boundary catch-up reproduction. That historical boundary case required repeated settlement before claims reopened. The [7 October prototype change](reports/staking-access-2026-10-07.md) removes that gate for allocated claims and adds independent principal exits; global allocation still requires bounded scans.

- [Reviewer scope and hashed package](docs/AUDIT_REVIEW_PACKAGE.md): per-file integrity manifest, CI artifact and release archive.
- [Strict Safe preflight](docs/MULTISIG_VERIFICATION.md): pinned proxy/singleton evidence, expected owners, threshold and bypass settings; no real governance address is assumed.
- Optional BSC fixed-block fork tests run only with `BSC_FORK_RPC_URL`; default CI does not claim this network-dependent check passed.

[Tagged releases](https://github.com/ArexAiData/arexai-contracts/releases) identify reviewed repository evidence, not new token deployments. Updating `release.json` through a protected PR requests an engineering prerelease for that exact merged commit. The release workflow requires successful Hardhat and Slither checks on the same commit and refuses to overwrite existing tags. Prototype-containing engineering releases are marked prerelease. No deployment, staking activation or independent audit is implied.

## Security status

Automated testing and static analysis are engineering evidence, not an independent professional audit. The included Slither review reported no critical, high, or medium-severity findings within its stated scope. See [`SECURITY.md`](SECURITY.md) and the reports directory for limitations.

Never share a seed phrase, private key, recovery phrase, or wallet credential with anyone claiming to represent ArexAi.

## License

MIT. See [`LICENSE`](LICENSE).
