# Pinned SafeProxy evidence

`proxy-runtime-1.4.1.json` copies only the deployed runtime bytecode from the official npm package `@safe-global/safe-contracts@1.4.1`, artifact `build/artifacts/contracts/proxies/SafeProxy.sol/SafeProxy.json`. Package integrity:

`sha512-fP1jewywSwsIniM04NsqPyVRFKPMAuirC3ftA/TA4X3Zc5EnwQp/UCJUU2PL/37/z/jMo8UUaJ+pnFNWmMU7dQ==`

Runtime keccak256: `0xd7d408ebcd99b2b70be43e20253d6d92a8ea8fab29bd3be7f55b10032331fb4c`.

`singleton-runtime-1.4.1.json` copies `build/artifacts/contracts/Safe.sol/Safe.json` from the same package for synthetic verifier tests. Its runtime hash is `0x1fe2df852ba3299d6534ef416eefa406e56ced995bca886ab7a553e6d0c5e1c4`, matching the official deployment registry. The read-only verifier compares actual chain singleton code with registry hashes; it does not substitute this test artifact for chain code.

Sources: [official Safe smart-account repository](https://github.com/safe-global/safe-smart-account/tree/v1.4.1) and [official package registry record](https://registry.npmjs.org/@safe-global/safe-contracts/1.4.1). The copied Safe artifact has its original LGPL-3.0 license in this directory; the repository's MIT license does not relicense it.

Official singleton and compatibility-handler addresses/code hashes are obtained from the exact lockfile-pinned `@safe-global/safe-deployments@1.37.63` package. Registry provenance: https://github.com/safe-global/safe-deployments

The strict preflight supports only this exact 1.4.1 proxy runtime plus officially registered 1.4.1 Safe/SafeL2 singleton and optional compatibility handler for BSC 56/97. Legitimate other versions intentionally fail. A passing result proves the stated configuration at one block, not who controls owner keys or future configuration stability. No real governance address is assumed or published by this evidence.
