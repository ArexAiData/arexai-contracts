import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import solc from "solc";

// Compile only the complete original deployment input, including pinned dependencies.
// Never resolve imports from the mutable contracts/ workspace.
const bytes = readFileSync("verification/staking/solidity-standard-input.json");
const record = JSON.parse(readFileSync("deployments/staking-mainnet.json", "utf8"));
assert.equal(createHash("sha256").update(bytes).digest("hex"), record.compilerInputSha256);
assert.match(solc.version(), /^0\.8\.24\+commit\.e11b9ed9/);
const input = JSON.parse(bytes.toString());
input.settings.outputSelection = { "*": { "*": ["abi", "evm.bytecode.object"] } };
const output = JSON.parse(solc.compile(JSON.stringify(input)));
assert(!output.errors?.some((e: {severity: string}) => e.severity === "error"), JSON.stringify(output.errors));
const artifact = output.contracts["contracts/ArexAIStaking.sol"].ArexAIStaking;
assert.deepEqual(artifact.abi, JSON.parse(readFileSync("verification/staking/abi.json", "utf8")));
export const frozenArtifact = { abi: artifact.abi, bytecode: "0x" + artifact.evm.bytecode.object };
