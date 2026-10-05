# Release evidence procedure

1. Review the exact commit and source/artifact mapping. Run clean installation, registry integrity, compilation and tests. Inspect Slither's result and scope.
2. Record the commit SHA, UTC timestamp, Node/npm/Hardhat/solc/Slither versions, commands, exit codes, test count and limitations in a dated report. Link CI runs for that exact commit. Preserve old reports unchanged.
3. Update CHANGELOG with the actual changes. Do not call documentation changes a contract deployment or claim mainnet verification from local tests.
4. After required checks pass, merge through the repository's protected PR flow. Create an annotated tag and GitHub Release for the reviewed commit when releasing a contract-source version. Include report links and any known limitations.
5. Record an independently verified deployment address/transaction only when a deployment actually occurs. A source release does not change deployed BSC contracts.

No release or deployment is implied by adding this procedure. Independent audit remains a separate assessment.
