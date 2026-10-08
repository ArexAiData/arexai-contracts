# Frozen mainnet staking load evidence — 8 October 2026

Four new local scenarios deploy the staking artifact compiled only from its original hash-pinned Standard JSON input. The compiler helper never reads development staking imports. Token and Safe harness are synthetic local deployments. No mainnet transaction or private-key access occurred.

Validation: full `npm test` completed with **173 passing, 1 optional fork skipped**. The new targeted file has 4 passing scenarios. Registry and generated deployment-document checks passed.

## Measurements

| Scenario | Flexible positions | Delay | Checkpoint calls | Max gas / call | Total checkpoint gas |
| --- | ---: | --- | ---: | ---: | ---: |
| delayed-30-days | 64 | 30 days | 1 | 5,310,601 | 5,310,601 |
| dense-1024 | 1024 | 2 days | 16 | 7,578,203 | 105,318,529 |
| exhaustion | 256 | 365,000 days | 12 | 4,178,475 | 38,801,832 |
| emergency | 256 | 2 days | 8 | 3,934,281 | 23,737,885 |

Every checkpoint uses 64 work credits, the immutable maximum. Credits are not always positions: a proportional fallback scan charges two credits per position and allocation requires another pass. The exhaustion case deliberately jumps 1,000 years to force the budget boundary; this is not an estimated exhaustion date. Deposits are staggered local blocks, and the fixtures have sufficient normal budget.

## Verified behavior

- 30 days of completed rewards settle in one captured checkpoint, not one transaction for each elapsed day.
- The dense 1,024-position case settles in 16 calls, with captured timestamp stable throughout that round.
- Budget exhaustion allocates proportionally, assigns the rounding remainder once, sets free rewards to zero and pauses flexible accrual.
- An emergency principal exit succeeds before settlement; the existing accounting liabilities remain covered and surplus-only closure finalizes.
- Claims and principal exits succeed locally after settlement; repeated claims and repeated principal exits are rejected.
- After each batch, free + reserved + owed + paid + burned equals the 115M cap. Contract token balance equals principal + unpaid reward liabilities.

## Cost interpretation

Local gas receipt × chosen gas price gives a scenario cost, not a wallet quote: `BNB = gasUsed × gasPriceGwei / 1,000,000,000`. At an illustrative **1 gwei**, the dense case totals **0.105318529 BNB**; its largest checkpoint is **0.007578203 BNB**. 1 gwei is an arithmetic example, not a fetched current BSC price. Claims, exits and governance closure costs are separate from checkpoint totals.

The dense maximum is about 7.58M gas, so a maximum batch is not always the best wallet choice. A keeper or application should estimate the actual next call using a smaller work limit when needed, verify wallet/network gas allowance, simulate the call and wait for the receipt before advancing state. A failed RPC estimate is not a successful calculation.

Remaining work depends on phase, heap order, eligibility and concurrent activity. `ceil(positions/64)` is valid only for these fully eligible full-budget normal fixtures, not a universal UI formula. Proportional scans, retirement and emergency allocation can require more calls. Historical gas samples must not be displayed as live transaction estimates.

## Reproduce

```bash
npm ci --no-audit --no-fund
STAKING_FROZEN_LOAD_REPORT=/tmp/frozen-load.json npx hardhat test nodejs test/staking-frozen-load.test.ts
npm test
```

Raw per-call receipts: [staking-frozen-load-2026-10-08.json](staking-frozen-load-2026-10-08.json). Independent audit remains pending; no production scalability guarantee is claimed.
