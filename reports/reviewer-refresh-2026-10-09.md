# Engineering reviewer refresh — 9 October 2026

## Scope

This evidence release incorporates the merged reviewer quick start (PR #28), AI v3.9.5/v3.9.6 documentation (PR #29), and a limited real staking principal-exit observation. It changes documentation and release packaging only. Deployed contracts, rates, governance and allocations are unchanged.

The release workflow will bind the archive to the exact merged commit, include per-file SHA-256 values and publish only after its required checks succeed. This report does not claim checks for a future merge commit have already passed.

## Recorded staking use case

- Chain: BNB Smart Chain, chain ID 56.
- Token: `0xeaa12b3be7cdec7749b972ed5c342f4e933ccbb3`.
- Staking: `0xFc0e57528C171cd63F548AFD35Dd787A1cBb6864`.
- Position: 1; previously observed principal 10,000 ARXAI, flexible mode 0.
- Principal exit: [transaction 0x3937910299aace25f4f18edbcc1eff8c5d59a4adc9f7cb56b03cbe96341cd76d](https://bscscan.com/tx/0x3937910299aace25f4f18edbcc1eff8c5d59a4adc9f7cb56b03cbe96341cd76d).
- Exit block: 126543830; recorded timestamp 2026-10-09T00:58:06Z.
- Holder: `0xD019Fb2D6f4e83e2B5957891C04874Bb61B126C1`.

The successful receipt was retrieved again through `https://bsc-dataseed.bnbchain.org` on 9 October 2026 using only eth_getTransactionReceipt. It contains the official token Transfer from staking to the holder for exactly 10,000 ARXAI (10000000000000000000000 base units). The transaction destination is the wallet batch contract, not the staking contract; the token event identifies the actual transfer.

### Earlier dated state observation

At block 126544612 (2026-10-09T01:03:58Z), a previous read-only inspection recorded totalPrincipal = 0, owedFlexible = 0, paidRewards = 0.547945205479452054 ARXAI and freeRewards = 114999999.452054794520547946 ARXAI. Position 1 retained historical principal and active accounting metadata, with exitedAt = 1791507486. These are historical observations, not current balances.

For 10,000 ARXAI at 2% simple annual rewards, a normal full-day estimate is 10000 × 0.02 / 365 ≈ 0.547945205479452054 ARXAI. The observed exit occurred before the second complete 24-hour boundary. Allocated unclaimed rewards and lifetime paid rewards are different accounting values.

## Limitations

The principal transfer receipt is independently re-read in this update. The original deposit receipt and separate reward-claim transfer receipt are not established by this report. Historical paidRewards accounting must not be described as verification of a specific reward-payment transaction. One position and one principal exit do not prove all staking paths, safety or successful final position cleanup.

The read-only review sent no signature, transaction, token transfer or governance instruction. Automated tests and package hashes are engineering evidence, not an independent audit. Application features are documented separately from Solidity tests; no new test count or model-accuracy score is claimed.
