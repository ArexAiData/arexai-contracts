# Release evidence procedure

1. Review the exact commit and source/artifact mapping. Run clean installation, registry integrity, compilation and tests. Inspect Slither's result and scope.
2. Record the commit SHA, UTC timestamp, Node/npm/Hardhat/solc/Slither versions, commands, exit codes, test count and limitations in a dated report. Link CI runs for that exact commit. Preserve old reports unchanged.
3. Update CHANGELOG with the actual changes. Do not call documentation changes a contract deployment or claim mainnet verification from local tests.
4. After required checks pass, merge through the repository's protected PR flow. Create an annotated tag and GitHub Release for the reviewed commit when releasing a contract-source version. Include report links and any known limitations.
5. Record an independently verified deployment address/transaction only when a deployment actually occurs. A source release does not change deployed BSC contracts.

No release or deployment is implied by adding this procedure. Independent audit remains a separate assessment.

## Automated engineering evidence releases

Edit `release.json` in a protected pull request with a unique `engineering-YYYY-MM-DD` tag (optional numeric suffix), a title, a summary, and a dated report path. Keep `prerelease: true` while the repository contains an unreleased staking prototype. The default-branch release workflow waits for successful GitHub Actions checks named `Hardhat 37-test suite` and `Slither 0.11.6` on the exact source commit before creating the tag and GitHub Release. The historical check name is a compatibility context, not the current test count.

The release links its exact commit and evidence report. It creates a lightweight tag through GitHub's release API, not a cryptographically signed or annotated tag. Never describe it as signed. Existing tags or releases are not rewritten; use a new tag for revised evidence. A manual retry is available through workflow_dispatch on main. A failed check or timeout withholds publication.

Test logs and SARIF workflow artifacts have 30-day retention. Dated repository reports remain versioned evidence; do not rely on expiring artifacts as the only record. Review release workflow failures separately from contract CI.

Engineering releases now also attach a review tar archive and SHA-256 checksum. Its MANIFEST.json records the exact clean commit and all copied file hashes; a dirty-tree package is refused. Verify extracted files before installing dependencies, since strict package verification rejects extra files. [Reviewer package procedure](AUDIT_REVIEW_PACKAGE.md).
