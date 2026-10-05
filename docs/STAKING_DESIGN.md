# ARXAI staking prototype — 5 October 2026

Status: unreleased prototype. Not deployed to public testnet or mainnet; no rewards funded. Existing token allocation documents and deployed contracts are unchanged. A planned 115 million ARXAI staking budget requires treasury authorization and revised allocation disclosures before funding.

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

## Permissionless settlement and exhaustion

Before a stake, claim or withdrawal, all due flexible positions must be settled through `checkpoint(maxWork)`. A round snapshots its timestamp and eligible position set, scans accrued complete-day rewards, then allocates available rewards proportionally. Locked reservations are unavailable to this allocation. The last eligible position receives rounding dust; this is deterministic and independent of claim order.

Each transaction does at most 64 work items; a round typically requires two passes. Any account can progress it, including after emergency closure. Position mutation is blocked until the round completes. Large position counts therefore require multiple transactions and an operational checkpoint service. Users retain permissionless fallback, but withdrawal availability depends on settlement completion. Unlimited position creation presents a gas/availability griefing risk; independent review and load testing are required before deployment. Zero-daily-reward flexible positions are excluded from normal daily scans but included in emergency scans.

When free rewards reach zero, new deposits and flexible accrual stop. Existing locked reservations and allocated flexible claims remain protected. Early locked exits recycle their forfeited rewards and may reopen capacity. Flexible earning does not backfill the exhausted interval; it resumes at complete original-anchor day windows after replenishment. The first partial window after replenishment is skipped.

## Permanent emergency closure

The configured governance contract must report three distinct nonzero owners and a threshold of two. Only that address can invoke `emergencyClose`. A running normal checkpoint must finish first. Closure is irreversible and snapshots an accrual cutoff:

- Locked rewards become proportional to elapsed seconds, capped at maturity, even for positions not yet mature.
- Flexible positions receive only complete 24-hour periods, subject to proportional available-budget allocation.
- Unused rewards are burned after bounded settlement completes.
- Principal and earned liabilities remain in the contract for holder-initiated withdrawal, with no expiry.

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
