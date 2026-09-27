import assert from "node:assert/strict";
import { test } from "node:test";
import { network } from "hardhat";

const ether = 10n ** 18n;
const FIRST_TEAM_RELEASE = 1_813_622_400;
const FINAL_TEAM_RELEASE = 1_863_734_400;
const TOTAL_ALLOCATION = 50_000_000n * ether;
const TRANCHE_AMOUNT = 2_500_000n * ether;

async function assertCustomError(promise: Promise<unknown>, errorName: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.match(String(error), new RegExp(errorName));
    return true;
  });
}

async function deployVesting(funding = TOTAL_ALLOCATION) {
  const { ethers } = await network.create("hardhatMainnet");
  const [treasury, team, caller] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [treasury.address]);
  const vesting = await ethers.deployContract("ArexAITeamVesting", [
    await token.getAddress(), team.address,
  ]);
  if (funding > 0n) await token.transfer(await vesting.getAddress(), funding);
  return { ethers, treasury, team, caller, token, vesting };
}

test("team allocation unlocks in 20 exact monthly five-percent tranches", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [treasury, team] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [treasury.address]);
  const vesting = await ethers.deployContract("ArexAITeamVesting", [await token.getAddress(), team.address]);
  await token.transfer(await vesting.getAddress(), 50_000_000n * ether);

  await ethers.provider.send("evm_setNextBlockTimestamp", [FIRST_TEAM_RELEASE - 60]);
  await ethers.provider.send("evm_mine", []);
  assert.equal(await vesting.releasable(), 0n);
  await assert.rejects(vesting.release());

  await ethers.provider.send("evm_setNextBlockTimestamp", [FIRST_TEAM_RELEASE]);
  await ethers.provider.send("evm_mine", []);
  await vesting.release();
  assert.equal(await token.balanceOf(team.address), 2_500_000n * ether);
  assert.equal(await vesting.released(), 2_500_000n * ether);

  await ethers.provider.send("evm_setNextBlockTimestamp", [FINAL_TEAM_RELEASE]);
  await ethers.provider.send("evm_mine", []);
  await vesting.release();
  assert.equal(await token.balanceOf(team.address), 50_000_000n * ether);
  assert.equal(await token.balanceOf(await vesting.getAddress()), 0n);
  assert.equal(await vesting.unlockedTranches(FINAL_TEAM_RELEASE), 20n);
});

test("team vesting rejects zero token and beneficiary addresses", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [treasury, team] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [treasury.address]);

  await assertCustomError(
    ethers.deployContract("ArexAITeamVesting", [ethers.ZeroAddress, team.address]),
    "ZeroAddress",
  );
  await assertCustomError(
    ethers.deployContract("ArexAITeamVesting", [await token.getAddress(), ethers.ZeroAddress]),
    "ZeroAddress",
  );
});

test("team vesting exposes valid tranche times and rejects an invalid index", async () => {
  const { vesting } = await deployVesting();

  assert.equal(await vesting.releaseTime(0n), BigInt(FIRST_TEAM_RELEASE));
  assert.equal(await vesting.releaseTime(19n), BigInt(FINAL_TEAM_RELEASE));
  await assertCustomError(vesting.releaseTime(20n), "InvalidTranche");
});

test("team vesting reports its funding state accurately", async () => {
  const { token, vesting } = await deployVesting(0n);
  const vestingAddress = await vesting.getAddress();

  assert.equal(await vesting.funded(), false);
  await token.transfer(vestingAddress, TOTAL_ALLOCATION - 1n);
  assert.equal(await vesting.funded(), false);
  await token.transfer(vestingAddress, 1n);
  assert.equal(await vesting.funded(), true);
});

test("team vesting rejects release when an unlocked tranche is underfunded", async () => {
  const { ethers, team, token, vesting } = await deployVesting(TRANCHE_AMOUNT - 1n);
  await ethers.provider.send("evm_setNextBlockTimestamp", [FIRST_TEAM_RELEASE]);

  await assertCustomError(vesting.release(), "Underfunded");
  assert.equal(await vesting.released(), 0n);
  assert.equal(await token.balanceOf(team.address), 0n);
});

test("any caller can trigger release but funds always go to the beneficiary", async () => {
  const { ethers, team, caller, token, vesting } = await deployVesting();
  await ethers.provider.send("evm_setNextBlockTimestamp", [FIRST_TEAM_RELEASE]);
  await vesting.connect(caller).release();

  assert.equal(await token.balanceOf(team.address), TRANCHE_AMOUNT);
  assert.equal(await token.balanceOf(caller.address), 0n);
  assert.equal(await vesting.released(), TRANCHE_AMOUNT);
  await assertCustomError(vesting.connect(caller).release(), "NothingToRelease");
});

test("team vesting handles exact schedule boundaries and cumulative catch-up", async () => {
  const { ethers, team, token, vesting } = await deployVesting();
  const secondRelease = Number(await vesting.releaseTime(1n));
  const fifthRelease = Number(await vesting.releaseTime(4n));

  assert.equal(await vesting.unlockedTranches(FIRST_TEAM_RELEASE - 1), 0n);
  assert.equal(await vesting.unlockedTranches(FIRST_TEAM_RELEASE), 1n);
  assert.equal(await vesting.unlockedTranches(secondRelease - 1), 1n);
  assert.equal(await vesting.unlockedTranches(secondRelease), 2n);

  await ethers.provider.send("evm_setNextBlockTimestamp", [fifthRelease]);
  await vesting.release();
  assert.equal(await token.balanceOf(team.address), 5n * TRANCHE_AMOUNT);
  assert.equal(await vesting.released(), 5n * TRANCHE_AMOUNT);

  await ethers.provider.send("evm_setNextBlockTimestamp", [FINAL_TEAM_RELEASE + 86_400]);
  await vesting.release();
  assert.equal(await vesting.released(), TOTAL_ALLOCATION);
  await assertCustomError(vesting.release(), "NothingToRelease");
});
