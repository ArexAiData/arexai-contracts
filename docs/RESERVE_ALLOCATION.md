# Current ARXAI allocation — 13 October 2026

Display date uses Europe/Istanbul. The evidence was captured at 2026-10-12T23:39:09.643Z, BSC block **127300237**. These are allocations against the original one-billion supply, not circulating supply or continuously refreshed balances.

| Allocation | ARXAI | Share of initial supply |
| --- | ---: | ---: |
| Exchange and ecosystem reserve | 431,250,000 | 43.125% |
| Staking rewards | 115,000,000 | 11.5% |
| Contribution rewards | 28,750,000 | 2.875% |
| Liquidity reserve | 200,000,000 | 20% |
| Marketing | 100,000,000 | 10% |
| Team | 50,000,000 | 5% |
| Presale Round 1 | 50,000,000 | 5% |
| Presale Round 2 | 25,000,000 | 2.5% |
| **Total** | **1,000,000,000** | **100%** |

The original 575,000,000 reserve equals 115,000,000 staking rewards + 28,750,000 contribution rewards + 431,250,000 remaining reserve. Five of twenty 28,750,000 tranches have been released; fifteen remain. No additional tokens were minted for this allocation.

- ReserveVault: `0x6af332c903c8f3fde0e620b360247c28476a2180`.
- Contribution Safe: `0x5B784DE88871484e6662e27046315DAC1c399B70`.
- Staking Safe: `0x1C4a898e3355Dbc8D9A9C75400042a025DC209e6`.
- [Pinned read-only snapshot](../reports/reserve-allocation-2026-10-13.json).
- [Website canonical allocation registry](https://arexaidata.com/listing-data.json) and its [repository mirror](../verification/staking/listing-data.json).
- [Contribution program](CONTRIBUTION_REWARDS.md).

The snapshot reads token supply, reserve and contribution Safe balances, released tranches, tranche size and both Safe owner lists; it reads the contribution threshold as two. The owner lists match. It does not audit Safe modules, guards or fallback handlers, or establish possession or separation of signing keys. The funding-transfer hash was not retrieved and remains null. The staking allocation is its funded reward cap, not the balance including user principal.

The original allocation and immutable ReserveVault constants remain 575M and twenty tranches. The 7 October staking activation record's 460M remainder is historical and explicitly dated. Frozen Solidity sources, bytecode, deployment receipts and historical test reports retain their original evidence scope.

Run `npm run verify:consistency` to check the recorded mirrors. Use `-- --site-dir /absolute/path/to/site` for the local website/PDF, or `-- --live` for the published website. A fetch failure fails the live check; it is not evidence that the contents match.
