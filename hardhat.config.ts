import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [hardhatEthers, hardhatNodeTestRunner],
  solidity: {
    version: "0.8.24",
    path: fileURLToPath(new URL("./node_modules/solc/soljson.js", import.meta.url)),
    settings: {
      evmVersion: "paris",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
      initialDate: "2026-09-17T00:00:00Z",
    },
  },
});
