# Staking prototype verification — 5 October 2026

Status: local prototype only. No public testnet/mainnet staking deployment or reward funding performed.

## Completed checks

- `npm test`: **76 passing** (60 existing tests plus 16 staking tests).
- Staking coverage: exact funding, immutable rates, whole independent positions, positive dust deposits, early forfeiture and reserve recycling, late maturity, complete-day flexible accrual and separate claims, proportional exhaustion independent of claim order, protected locked rewards, bounded checkpoints, emergency earned liabilities and surplus burn, extra transfers outside the budget, replenishment without retroactive rewards, zero-rounded flexible positions, and more than 64 positions.
- Conservation assertions check reward bucket totals and token balance coverage of protected liabilities.
- `node --check scripts/prepare-staking-testnet.mjs`: passed.
- Static security analysis is pending CI; this report does not claim an independent audit.

Tests use a local EDR chain and a test-only multisignature harness, not a genuine deployed Safe. Public testnet verification requires three public signer addresses, a verified genuine 2-of-3 Safe, a separately deployed test token, signed transactions and recorded receipts. The unsigned preparation script never signs, funds or deploys.

Read [the design and release gates](../docs/STAKING_DESIGN.md), especially permissionless checkpoint availability and genuine Safe authentication requirements. Deployment registry entries remain unchanged.

## Security-analysis remediation

The first Slither run flagged a timestamp-derived maximum-value sentinel equality and a token burn reachable inside the checkpoint loop. The sentinel is now an explicit pause flag. Burning is deferred to one final interaction after all loop/accounting effects, with the pending amount cleared first and all mutating entry points guarded by ReentrancyGuard. Added an empty-position emergency closure test; return values from enumerable-set mutations are checked and reward locals initialized explicitly. Day/time checks are intentional economic boundaries; bounded-loop cost and complexity remain review items. The security gate has not been weakened or filtered to hide these findings.
