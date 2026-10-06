# Strict read-only governance preflight

Run `npm run verify:safe -- <rpc-url> <safe-address> <owner1> <owner2> <owner3>` with three independently confirmed public signer addresses. No private key is accepted and no transaction is signed or sent.

At one fixed block on BSC 56 or 97, the verifier checks:

- Proxy runtime equals the pinned official SafeProxy 1.4.1 artifact, including metadata.
- Storage slot zero points to an officially registered Safe/SafeL2 1.4.1 singleton whose actual code hash matches the pinned official deployment registry.
- Exactly the expected three owners are present, with threshold two.
- No enabled modules; pagination reaches the sentinel.
- No transaction guard under this strict policy.
- Fallback handler is zero or the officially registered 1.4.1 compatibility handler with matching code hash.

See [artifact provenance and original license](../verification/safe/README.md). Other genuine versions, custom handlers and guards fail deliberately and require their own reviewed policy. Getter-only harnesses and contracts imitating owner/threshold methods cannot pass the proxy/singleton checks.

No existing address is assumed to be the project's genuine Safe. The tool checks a supplied address, not possession or separation of signer keys, devices, recovery arrangements, future owner/module changes, or transaction contents. Owner rotation should be followed by a fresh check. This does not deploy Safe, transfer ownership, fund staking or certify security. The older unsigned testnet preparation script still warns that its getter-only checks cannot authenticate Safe; use this stronger preflight separately before any signing.
