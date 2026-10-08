# Staking boundary regression expansion — 8 October 2026

Added eight scenarios, executed against both development and frozen mainnet compiler-input artifacts (16 additional test executions): six exact transaction-time withdrawals for 30/60/90-day terms at maturity minus one second and at maturity; foreign-holder and repeated flexible claim rejection; exhausted three-position allocation equivalence for checkpoint batches 1 and 64, including non-round principals and shuffled claims.

Validation: `npm test` — 149 passing, 1 optional BSC fork skipped. Tests verify holder balances, principal liabilities, reserved rewards, reward conservation, and exact receipt block timestamps. Batch comparison reverts to the identical EVM snapshot before repeating settlement.

Scope: local EVM tests, not independent audit or live-chain transactions. Governance fixture remains StakingSafeHarness; genuine Safe integration is not added by this change. No deployed contracts, rates, funds or website content were changed.
