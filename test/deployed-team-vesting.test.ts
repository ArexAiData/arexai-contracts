import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { network } from "hardhat";

const snapshot = JSON.parse(readFileSync("verification/bsc-snapshot.json", "utf8"));
const proof = snapshot.contracts.find((c: {name:string}) => c.name === "Team vesting");
const cap = 50_000_000n * 10n ** 18n;
const tranche = cap / 20n;
async function fixture(funding = cap) {
  const connection = await network.create("hardhatMainnet");
  const { ethers } = connection;
  const [treasury, beneficiary, outsider] = await ethers.getSigners();
  const token = await ethers.deployContract("contracts/verified/ArexAIToken.sol:ArexAIToken", [treasury.address]);
  const schedule = Array.from(ethers.AbiCoder.defaultAbiCoder().decode(["address", "address", "uint64[20]"], proof.constructorArguments)[2]) as bigint[];
  const vesting = await ethers.deployContract("TeamVesting", [await token.getAddress(), beneficiary.address, schedule]);
  if (funding > 0n) await token.transfer(await vesting.getAddress(), funding);
  return {connection, ethers, token, vesting, treasury, beneficiary, outsider, schedule};
}

test("Deployed TeamVesting rejects zero addresses and invalid calendar schedules", async () => {
  const {ethers, token, beneficiary, schedule} = await fixture();
  await assert.rejects(ethers.deployContract("TeamVesting", [ethers.ZeroAddress, beneficiary.address, schedule]), /InvalidAddress/);
  await assert.rejects(ethers.deployContract("TeamVesting", [await token.getAddress(), ethers.ZeroAddress, schedule]), /InvalidAddress/);
  for (const index of [0, 10, 19]) {
    const invalid = [...schedule]; invalid[index] = 0n;
    await assert.rejects(ethers.deployContract("TeamVesting", [await token.getAddress(), beneficiary.address, invalid]), /InvalidReleaseSchedule/);
  }
  for (const delta of [0n, -1n]) {
    const invalid = [...schedule]; invalid[10] = invalid[9] + delta;
    await assert.rejects(ethers.deployContract("TeamVesting", [await token.getAddress(), beneficiary.address, invalid]), /InvalidReleaseSchedule/);
  }
});

test("Deployed TeamVesting retains the creation transaction's twenty dates and fixed destinations", async () => {
  const {vesting, token, beneficiary, schedule} = await fixture();
  assert.equal(await vesting.TOTAL_ALLOCATION(), cap);
  assert.equal(await vesting.TRANCHE_AMOUNT(), tranche);
  assert.equal(await vesting.token(), await token.getAddress());
  assert.equal(await vesting.beneficiary(), beneficiary.address);
  for (let i=0;i<20;i++) assert.equal(await vesting.releaseTimes(i), schedule[i]);
  assert.equal(schedule[0], 1_810_944_000n);
  assert.equal(vesting.interface.hasFunction("owner()"), false);
});

test("Deployed TeamVesting applies all twenty exact calendar boundaries", async () => {
  const {connection, vesting, schedule} = await fixture();
  for (let i=0;i<20;i++) {
    await connection.provider.send("evm_setNextBlockTimestamp", [Number(schedule[i])-1]);
    await connection.provider.send("evm_mine", []);
    assert.equal(await vesting.vestedAmount(), BigInt(i)*tranche);
    await connection.provider.send("evm_setNextBlockTimestamp", [Number(schedule[i])]);
    await connection.provider.send("evm_mine", []);
    assert.equal(await vesting.vestedAmount(), BigInt(i+1)*tranche);
  }
});

test("Deployed TeamVesting rolls back underfunded release and recovers after funding", async () => {
  const {connection, token, vesting, beneficiary, schedule} = await fixture(0n);
  await connection.provider.send("evm_setNextBlockTimestamp", [Number(schedule[0])]);
  await connection.provider.send("evm_mine", []);
  await assert.rejects(vesting.release());
  assert.equal(await vesting.released(), 0n);
  assert.equal(await token.balanceOf(beneficiary.address), 0n);
  await token.transfer(await vesting.getAddress(), tranche);
  await vesting.release();
  assert.equal(await vesting.released(), tranche);
});

test("Deployed TeamVesting permits public triggers, cumulative catch-up and no excess release", async () => {
  const {connection, token, vesting, beneficiary, outsider, schedule} = await fixture();
  await assert.rejects(vesting.connect(outsider).release(), /NothingToRelease/);
  await connection.provider.send("evm_setNextBlockTimestamp", [Number(schedule[19])]);
  await connection.provider.send("evm_mine", []);
  await vesting.connect(outsider).release();
  assert.equal(await token.balanceOf(beneficiary.address), cap);
  assert.equal(await token.balanceOf(outsider.address), 0n);
  assert.equal(await vesting.released(), cap);
  assert.equal(await vesting.releasable(), 0n);
  await assert.rejects(vesting.release(), /NothingToRelease/);
});
