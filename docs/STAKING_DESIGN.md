# ARXAI staking design and historical prototype

Current mainnet deployment and funded activation are recorded in [STAKING_MAINNET.md](STAKING_MAINNET.md). This design and its dated prototype reports describe engineering work before deployment. Their “not deployed” statements are historical and must not be read as current project status. Reproduce the frozen deployed source separately; development/test source changes do not upgrade the live contract.

## Fixed terms

| Position | Simple annual APR | Reward interval | Voluntary exit |
|---|---:|---|---|
| Flexible | 2% | Complete 24-hour periods from deposit | Principal plus allocated unclaimed rewards |
| 30 days | 5% | Fixed term | Before maturity: principal only |
| 60 days | 8% | Fixed term | Before maturity: principal only |
| 90 days | 12% | Fixed term | Before maturity: principal only |

A 365-day year is used. Rates and the 115,000,000-token cap are immutable. No automatic compounding, minimum positive amount or wallet maximum. Each deposit creates an independent whole-withdrawal position; later deposits and flexible claims do not reset earlier clocks. Locked rewards stop at maturity and remain withdrawable without an expiry. All arithmetic rounds down to token base units; very small deposits may earn zero. For 10 million tokens over 90 days at 12% APR, the full reward is approximately 295,890.410958904109589041 ARXAI.

## Funding and protected balances

The reward reserve and deposited principal share one contract address but have separate accounting buckets. This prototype is NOT a separate reward-vault architecture. Before the first deposit, the contract must hold the full 115 million reward budget. A treasury may transfer the budget then call `activate`, or use `fundAndActivate`. A first deposit may activate an already fully funded contract. No rewards accrue until a position is created.

Locked rewards are fully reserved at entry; deposits exceeding available reward capacity revert. Flexible rewards use only unallocated rewards. After activation:

`freeRewards + reservedLocked + owedFlexible + paidRewards + burnedRewards = REWARD_CAP`

The token balance must cover `totalPrincipal + freeRewards + reservedLocked + owedFlexible`. Administrators cannot withdraw principal or reward funds. Extra unsolicited transfers are outside the reward budget and have no rescue function; do not send more than the intended budget. The implementation assumes the official 18-decimal, non-rebasing, non-fee ARXAI token with a compatible holder burn function. Exact incoming stake amounts are checked.

## Permissionless scheduled settlement and exhaustion

Before a new stake, due flexible entitlements must be settled through `checkpoint(maxWork)`. A packed min-heap orders each flexible position's next completed-day deadline, with ID as the deterministic tie-breaker. A normal round captures its timestamp and processes only deadlines at or before that snapshot. Other positions are not read for reward calculation. Each processed live position is rescheduled to its next original-anchor day. Exited positions leave the queue once their final complete-day entitlement is settled. Final withdrawals mark queue entries inactive; inactive roots are pruned once when they become due. `scheduledFlexibleCount` includes these pending inactive entries; `activeCount` reports active positions.

The aggregate scheduled daily reward rate and the oldest queued deadline provide a conservative bound on the snapshot's total liability. When free funds cover that bound, full rewards are allocated in the same pass. Otherwise a scan records only positive entitlements, followed by proportional allocation. The final eligible position receives deterministic rounding dust. Claims and principal exits cannot reduce free capacity during the snapshot, and new stakes remain blocked. A locked early principal exit can recycle additional free capacity. It cannot invalidate the full-budget proof.

`maxWork` is capped at 64. Normal fallback heap scans cost two work credits because they also store a deferred allocation record; allocation items and emergency scan items cost one. A one-credit call still advances one fallback scan item. In the 1,024-position fixture, normal full allocation takes 16 calls, exhaustion takes 32 scan calls plus 16 allocation calls, and emergency settlement takes 32 calls. Each tested call stays below 8M gas; that fixture ceiling is not a production guarantee for arbitrarily larger queues. Heap maintenance is O(log N) per processed deadline. Full dense rounds can use more total gas than the earlier linear scan, despite fewer calls. Sparse rounds and repeated daily-boundary catch-up avoid scanning not-yet-due positions.

Allocated flexible claims remain independent of global settlement. `withdrawPrincipal(id)` returns all principal during either pass or emergency, records an exit cutoff, and preserves original principal for reward calculations. A later `withdraw(id)` cannot return principal again. Full flexible withdrawal requires only its own complete days to be settled and no active pass; locked withdrawal does not wait for unrelated daily boundaries. Voluntary locked early exits forfeit and recycle reservations immediately. Resuming an exhausted flexible program during an active pass waits until the round finishes, preserving one baseline for all scanned positions.

The packed queue supports 64-bit Unix deadlines and 192-bit nonzero sequential IDs; neither limits stake amounts. Original rates, daily anchors, proportional exhaustion, funding cap and emergency cutoff are unchanged.

### Measured improvements and remaining limits

See [scheduled-settlement evidence](../reports/staking-scheduling-2026-10-07.md). A 1,026-position sparse fixture visits two due positions in two single-item calls. The staggered 64-position boundary fixture uses much less total gas than the previous prototype, while catch-up still requires multiple transactions. Dense 256-position full settlement reduces normal call count from eight to four but does not reduce total gas in the recorded fixtures. Emergency settlement deliberately retains the complete active-position snapshot and two passes to combine locked reservation savings with flexible liabilities before burning surplus.

New admissions and unallocated rewards still depend on keeper work. Final position removal during an active pass and burn finalization also wait for that work. Inactive queue entries cost one eventual prune; abandoned exited positions do not repeatedly participate in normal rounds after their final entitlement is settled, but remain in the emergency active set until final withdrawal. Unlimited positions, keeper costs, boundary timing and very large heap gas limits remain independent-review concerns. This is not a public deployment or an independent audit.

When free rewards reach zero, new deposits and flexible accrual stop. Existing locked reservations and allocated flexible claims remain protected. Early locked exits recycle their forfeited rewards and may reopen capacity. Flexible earning does not backfill the exhausted interval; it resumes at complete original-anchor day windows after replenishment. The first partial window after replenishment is skipped.

## Permanent emergency closure

The configured governance contract must report three distinct nonzero owners and a threshold of two. Only that address can invoke `emergencyClose`. A running normal checkpoint must finish first. Closure is irreversible and snapshots an accrual cutoff:

- Locked rewards become proportional to elapsed seconds, capped at maturity, even for positions not yet mature.
- Flexible positions receive only complete 24-hour periods, subject to proportional available-budget allocation.
- Unused rewards are burned after bounded settlement completes.
- Principal can be withdrawn immediately during settlement. Earned reward liabilities remain claimable/finalizable by the holder, with no expiry. A voluntary locked exit made before closure remains forfeited, including transactions sharing a block timestamp.

There is no automatic push to every wallet. The contract cannot change rates, upgrade, reopen after emergency closure or sweep user liabilities.

**Critical governance deployment requirement:** `getOwners`/`getThreshold` checks do not authenticate Safe bytecode or prevent Safe modules from bypassing the owner threshold. Before deployment, independently verify the genuine Safe proxy/singleton, exact three owners, threshold two, enabled modules, guard and fallback handler. No bypass module is acceptable for the intended 2-of-3 policy. The included `StakingSafeHarness` is a test-only imitation and must NEVER govern a public deployment. Owner rotation remains possible in the Safe provided the required count/threshold is maintained.

## Release gates

1. Complete local tests and reproducible compilation.
2. Review checkpoint availability, economic edge cases and conservation invariants.
3. Select three separate public signer addresses and create/verify a genuine 2-of-3 Safe on BNB Smart Chain testnet (chain 97).
4. Use a separate test token and test funds; prepare an unsigned deployment with the supplied preflight script. Never reuse the mainnet token address on testnet.
5. Sign the deployment in the selected wallet; record the real receipt and addresses, verify source and test the full lifecycle on public testnet.
6. Obtain independent security review, remediate findings, revise whitepaper/allocation disclosures, and separately authorize mainnet deployment/funding.

No test result constitutes an independent audit. Public testnet and mainnet deployment are pending.
