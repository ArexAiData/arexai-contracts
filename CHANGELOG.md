# ArexAi Contracts Changelog

This changelog records material changes to the public ArexAi smart-contract engineering repository. Product releases for the ArexAi Analyst application are published separately at [arexaidata.com/updates](https://arexaidata.com/updates).

## 2026-09-28 — Public verification baseline

### Added

- Public Solidity sources for the ARXAI token, both presale rounds, team vesting, listing reserve and liquidity reserve.
- Machine-readable BNB Smart Chain deployment registry and deployment transaction records.
- Public ABI and bytecode artifacts for independent contract inspection.
- Automated Hardhat tests for the ARXAI token, PresaleRound, TeamVesting, ReserveVault and LiquidityReserveVault.
- GitHub Actions workflows for contract tests and Slither static analysis.
- Dependabot configuration for dependency-update visibility.
- Security policy, automated-test evidence, static-analysis notes and purchase transaction examples.

### Verified

- 52 automated contract tests passed and 0 failed in the active project-run suite.
- Fixed supply, presale boundaries, buyer limits, failure rollbacks, reserve release controls and team-vesting behavior are included in the executable test scope.
- The published Slither review recorded no critical, high or medium-severity findings within its stated scope.

### Important limitation

Project-run tests and automated static analysis are engineering evidence, not an independent professional security audit. See [SECURITY.md](SECURITY.md) and the reports directory for scope and limitations.
