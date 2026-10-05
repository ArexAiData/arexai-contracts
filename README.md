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

## BNB Smart Chain deployments

| Component | Address | BscScan |
| --- | --- | --- |
| ARXAI token | `0xeaa12b3be7cdec7749b972ed5c342f4e933ccbb3` | [View](https://bscscan.com/token/0xeaa12b3be7cdec7749b972ed5c342f4e933ccbb3) |
| Presale Round 1 | `0x52c880e4d54a5dd3ca7dd185d44715017b25dee0` | [View](https://bscscan.com/address/0x52c880e4d54a5dd3ca7dd185d44715017b25dee0#code) |
| Presale Round 2 | `0x0709b5f668280f54b48b953c3d2bd7e137e43398` | [View](https://bscscan.com/address/0x0709b5f668280f54b48b953c3d2bd7e137e43398#code) |
| Team vesting | `0x2d607fdb0da6407c29c2d4bdafab2e1479eb5ee2` | [View](https://bscscan.com/address/0x2d607fdb0da6407c29c2d4bdafab2e1479eb5ee2#code) |
| Listing reserve | `0x6af332c903c8f3fde0e620b360247c28476a2180` | [View](https://bscscan.com/address/0x6af332c903c8f3fde0e620b360247c28476a2180#code) |
| Liquidity reserve | `0xc141a3f0c90f3fa3b5f55fac6683715a14835e42` | [View](https://bscscan.com/address/0xc141a3f0c90f3fa3b5f55fac6683715a14835e42#code) |

The machine-readable deployment registry is available at [`deployments/bsc-mainnet.json`](deployments/bsc-mainnet.json).

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

- [Source and deployment mapping](docs/VERIFICATION.md): distinguish published sources, test implementations and artifacts.
- `npm run verify:registry` checks all six deployment records, source/artifact hashes and compiler configuration. It does not query BSC or certify deployed-bytecode equivalence.
- `npm run verify:bytecode` reproduces six creation/runtime bytecode snapshots and checks current executable templates; see [creation transactions](deployments/TRANSACTION_HASHES.md).
- Five additional direct TeamVesting tests cover the actual deployment schedule. The original 52 tests remain intact; three additional tests exercise `contracts/verified/ArexAIToken.sol`, including a seeded 100-operation balance/supply invariant and delegated-burn rollback boundaries.
- [Contribution guide](CONTRIBUTING.md) and issue templates describe reproducible, privacy-safe reports.
- [Release procedure](docs/RELEASING.md) records the tested commit, tool versions and evidence scope before publication.

## Compiler configuration

- Solidity: `0.8.24` (`v0.8.24+commit.e11b9ed9`)
- Optimizer: enabled
- Optimizer runs: `200`
- EVM version: `paris`
- OpenZeppelin Contracts: `5.4.0`
- Hardhat: `3.15.0`

## Run the tests

Requirements: Node.js 22.13 or later and npm.

```bash
npm ci --no-audit --no-fund
npm run verify:registry
npm run verify:bytecode
npm run compile
npm test
```

Historical project-run verification on 27 September 2026:

- 52 passed
- 0 failed
- 5 active contract types covered by executable behavioral tests
- clean compiler and CI test gates

See [`reports/automated-tests-2026-09-27.txt`](reports/automated-tests-2026-09-27.txt) for scope and limitations.

GitHub Actions also runs the Hardhat test suite and Slither analysis automatically on every push to `main` and every pull request targeting `main`. The Slither workflow uploads SARIF findings to GitHub Security and blocks medium-or-higher findings.

The additional token tests run the published `ArexAIToken` source; the original `ArexAI` tests still cover the test-workspace implementation. Behavioral tests are local simulated deployments. Separate bytecode evidence reproduces mainnet creation/runtime snapshots; no transaction is sent to BSC. The [5 October verification report](reports/engineering-verification-2026-10-05.md) records 55 passing tests. See CI for the result of each commit.

## Security status

Automated testing and static analysis are engineering evidence, not an independent professional audit. The included Slither review reported no critical, high, or medium-severity findings within its stated scope. See [`SECURITY.md`](SECURITY.md) and the reports directory for limitations.

Never share a seed phrase, private key, recovery phrase, or wallet credential with anyone claiming to represent ArexAi.

## License

MIT. See [`LICENSE`](LICENSE).
