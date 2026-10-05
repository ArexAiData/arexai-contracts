# Staking prototype verification — 5 October 2026

Status: local prototype only. No public testnet/mainnet staking deployment or reward funding performed.

## Completed checks

- `npm test`: **75 passing** (60 existing tests plus 15 staking tests).
- Staking coverage: exact funding, immutable rates, whole independent positions, positive dust deposits, early forfeiture and reserve recycling, late maturity, complete-day flexible accrual and separate claims, proportional exhaustion independent of claim order, protected locked rewards, bounded checkpoints, emergency earned liabilities and surplus burn, extra transfers outside the budget, replenishment without retroactive rewards, zero-rounded flexible positions, and more than 64 positions.
- Conservation assertions check reward bucket totals and token balance coverage of protected liabilities.
- `node --check scripts/prepare-staking-testnet.mjs`: passed.
- Static security analysis is pending CI; this report does not claim an independent audit.

Tests use a local EDR chain and a test-only multisignature harness, not a genuine deployed Safe. Public testnet verification requires three public signer addresses, a verified genuine 2-of-3 Safe, a separately deployed test token, signed transactions and recorded receipts. The unsigned preparation script never signs, funds or deploys.

Read [the design and release gates](../docs/STAKING_DESIGN.md), especially permissionless checkpoint availability and genuine Safe authentication requirements. Deployment registry entries remain unchanged.
