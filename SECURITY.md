# Security Policy

## Official contact

Report security issues privately to **info@arexaidata.com**. Do not publish an exploitable vulnerability before the project has had a reasonable opportunity to investigate and mitigate it.

ArexAi will never request a seed phrase, private key, recovery phrase, or wallet password.

## Evidence status

The automated tests and Slither outputs in this repository are project-run engineering evidence. They are not presented as an independent professional audit, certification, guarantee, or proof that the contracts are free from vulnerabilities.

The public BscScan pages should be used to confirm deployed bytecode, verified source, constructor arguments, ownership state, and on-chain transactions.

## Deployment evidence

Six contract-creation transaction hashes are recorded in deployments/TRANSACTION_HASHES.md. Successful receipts, created addresses and full creation/runtime bytecode were cross-checked through BSC RPC at block 125790592 on 5 October 2026 and reproduced from Sourcify compilation inputs. The offline snapshot verifier does not refresh current on-chain state.

## Report scope and contents

Reports may cover the Solidity sources, test harness, dependency configuration, deployment records or GitHub Actions in this repository. Include the affected commit, file/function, impact, prerequisites and a minimal reproduction using local mocks. Never send private keys, recovery phrases, real customer files or confidential wallet credentials. Do not submit an exploit as a public issue.

Initial reports are handled through the official email above. No guaranteed response deadline, bounty amount or safe-harbor terms are offered by this document. Coordinate disclosure after acknowledgement and assessment.

## Verification boundaries

The deployment registry integrity check verifies repository files and configuration only. It does not independently refresh explorer verification labels, fetch current ownership or balances, or prove deployed-bytecode equivalence by itself. The separate bytecode verifier reproduces the recorded snapshot and exact original compiler inputs. See [verification notes](docs/VERIFICATION.md). No completed independent professional audit is published in this repository.
