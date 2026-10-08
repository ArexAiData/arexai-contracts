# Real Safe transaction-signature regression tests — 8 October 2026

The local EVM executes pinned official Safe 1.4.1 singleton and SafeProxy runtime with three test signers and a 2-of-3 threshold. Proxy slot 0 is initialized locally and the genuine Safe setup function configures ownership; fixtures inject runtime code, so factory deployment is outside scope.

Four cases run against both development staking and the frozen mainnet compiler-input artifact: insufficient single signature (GS020), successful two-owner EIP-712 execution followed by rejected nonce replay, outsider-plus-owner rejection (GS026), duplicate-owner-signature rejection (GS026). Failed calls leave nonce, closure state and reward balances unchanged. Successful closure with no positions burns the 115M surplus exactly once.

Validation: npm test — 157 passing, 1 optional BSC fork skipped. No production transactions or key access. These tests cover real Safe 1.4.1 signature/delegatecall behavior, not parity with the observed live Safe 1.5.0 deployment; that version and factory integration remain separate verification work. Earlier staking scenarios still use StakingSafeHarness. Independent audit remains pending.
