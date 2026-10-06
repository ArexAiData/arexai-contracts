# Immutable recipients and presale pause behavior

These notes describe **current source behavior**, reproduced in local tests. They do not claim that a recipient is presently blocked or that issuer-controlled payment tokens can be unblocked by ArexAi. No deployed contract is changed by this work.

## Immutable destinations

| Contract | Fixed recipient | Payment / transfer | Failure effect |
| --- | --- | --- | --- |
| PresaleRound | `treasury` | Configured payment token transferred directly from buyer | Entire purchase reverts, including contribution, total sold, payment allowance and ARXAI delivery |
| ReserveVault | `beneficiary` | Configured token tranche | Tranche count and transfer roll back |
| LiquidityReserveVault | `liquidityManager` | Configured token release | Released amount and transfer roll back |
| TeamVesting (deployed implementation) | `beneficiary` | Vested token amount | Released counter rolls back; earned liability remains |
| ArexAITeamVesting (test-workspace implementation) | `beneficiary` | Vested token amount | Released counter rolls back; earned liability remains |

There is no recipient setter. Transferring Ownable ownership changes the administrator, not these destinations. The deployed TeamVesting has no owner role. A new recipient is not a supported recovery path in these immutable deployments.

The official published ARXAI source has no blacklist mechanism. Reserve/vesting blocklist tests intentionally substitute a token that rejects transfers to demonstrate dependency failure and rollback; they are **not** a claim that the official ARXAI token can block a recipient. USDC/USDT issuer implementations, proxy state and blocklist semantics must be checked for the actual chain/address separately.

If the configured payment token rejects a treasury transfer, purchases using that contract cannot succeed until that token allows the transfer again, provided the original sale window remains open. A pause may stop attempted purchases while the cause is investigated, but cannot repair the token, redirect the treasury or extend the sale. There is no token-issuer-unblock function or general rescue function in this presale source. Permanently blocked destinations can therefore cause lasting loss of availability. Atomic rollback prevents a failed purchase from charging the buyer; it does not solve availability.

Operational response: verify the exact failing token and reason, disclose the affected route/window, pause when appropriate, and coordinate with the issuer where applicable. A migration or different recipient would require a separately reviewed design, deployment, authorization and user communication. No migration or alternate payment route is implied here.

## Fixed sale window

`startTime` and `endTime` are immutable. A purchase requires:

`startTime <= block.timestamp < endTime`, an unpaused contract, and no finalization.

- Unpause before the original end permits purchases only for the remaining original time.
- Unpause at or after the original end does **not** reopen the sale.
- Pause duration is not added to the schedule.
- The owner can finalize at or after `endTime`, even while paused; unsold allocated tokens are burned if inventory is sufficient.

This documents current implementation behavior. An automatic extension would be a different policy and cannot be introduced by changing this repository's documentation or existing immutable contracts.

## Executable reproductions

[recipient-and-pause.test.ts](../test/recipient-and-pause.test.ts) adds nine checks covering blocked treasury/buyer purchases, fixed deadlines, paused finalization, reserve administrator rotation, liquidity rollback, and both vesting implementations. [MockBlocklistToken](../contracts/mocks/MockBlocklistToken.sol) is a deliberately unrestricted test fixture that models transfer rejection, not a production payment-token implementation. Tests run in isolated local networks and send no mainnet transactions.
