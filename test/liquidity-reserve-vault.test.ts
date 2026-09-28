import assert from "node:assert/strict";
import { test } from "node:test";
import { network } from "hardhat";

const ether = 10n ** 18n;
const TOTAL_ALLOCATION = 200_000_000n * ether;

async function assertCustomError(promise: Promise<unknown>, errorName: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.match(String(error), new RegExp(errorName));
    return true;
  });
}

async function deployReserve(funding = TOTAL_ALLOCATION) {
  const { ethers } = await network.create("hardhatMainnet");
  const [owner, liquidityManager, outsider, nextOwner] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [owner.address]);
  const reserve = await ethers.deployContract("LiquidityReserveVault", [
    await token.getAddress(), liquidityManager.address, owner.address,
  ]);
  if (funding > 0n) await token.transfer(await reserve.getAddress(), funding);
  return { ethers, owner, liquidityManager, outsider, nextOwner, token, reserve };
}

test("LiquidityReserveVault rejects every zero-address constructor dependency", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [owner, manager] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [owner.address]);
  const tokenAddress = await token.getAddress();

  await assertCustomError(ethers.deployContract("LiquidityReserveVault", [ethers.ZeroAddress, manager.address, owner.address]), "InvalidAddress");
  await assertCustomError(ethers.deployContract("LiquidityReserveVault", [tokenAddress, ethers.ZeroAddress, owner.address]), "InvalidAddress");
  await assertCustomError(ethers.deployContract("LiquidityReserveVault", [tokenAddress, manager.address, ethers.ZeroAddress]), "OwnableInvalidOwner");
});

test("LiquidityReserveVault exposes its fixed cap and immutable manager", async () => {
  const { owner, liquidityManager, token, reserve } = await deployReserve();

  assert.equal(await reserve.TOTAL_ALLOCATION(), TOTAL_ALLOCATION);
  assert.equal(await reserve.token(), await token.getAddress());
  assert.equal(await reserve.liquidityManager(), liquidityManager.address);
  assert.equal(await reserve.owner(), owner.address);
});

test("LiquidityReserveVault releases partial amounts only to its manager", async () => {
  const { liquidityManager, outsider, token, reserve } = await deployReserve();
  const amount = 12_500_000n * ether;

  await reserve.releaseForLiquidity(amount);
  assert.equal(await reserve.released(), amount);
  assert.equal(await token.balanceOf(liquidityManager.address), amount);
  assert.equal(await token.balanceOf(outsider.address), 0n);
});

test("LiquidityReserveVault blocks non-owner releases", async () => {
  const { outsider, reserve } = await deployReserve();

  await assertCustomError(reserve.connect(outsider).releaseForLiquidity(1n), "OwnableUnauthorizedAccount");
  assert.equal(await reserve.released(), 0n);
});

test("LiquidityReserveVault rejects zero and cumulative over-allocation", async () => {
  const { liquidityManager, token, reserve } = await deployReserve();

  await assertCustomError(reserve.releaseForLiquidity(0n), "AllocationExceeded");
  await reserve.releaseForLiquidity(TOTAL_ALLOCATION - 1n);
  await assertCustomError(reserve.releaseForLiquidity(2n), "AllocationExceeded");
  assert.equal(await reserve.released(), TOTAL_ALLOCATION - 1n);
  assert.equal(await token.balanceOf(liquidityManager.address), TOTAL_ALLOCATION - 1n);
});

test("LiquidityReserveVault rolls state back when its token balance is insufficient", async () => {
  const funded = 100n * ether;
  const { liquidityManager, token, reserve } = await deployReserve(funded);

  await assert.rejects(reserve.releaseForLiquidity(funded + 1n));
  assert.equal(await reserve.released(), 0n);
  assert.equal(await token.balanceOf(liquidityManager.address), 0n);
});

test("LiquidityReserveVault permits the exact cap and rejects any later release", async () => {
  const { liquidityManager, token, reserve } = await deployReserve();

  await reserve.releaseForLiquidity(TOTAL_ALLOCATION);
  assert.equal(await reserve.released(), TOTAL_ALLOCATION);
  assert.equal(await token.balanceOf(liquidityManager.address), TOTAL_ALLOCATION);
  await assertCustomError(reserve.releaseForLiquidity(1n), "AllocationExceeded");
});

test("LiquidityReserveVault ownership transfer requires pending-owner acceptance", async () => {
  const { owner, outsider, nextOwner, reserve } = await deployReserve();

  await reserve.connect(owner).transferOwnership(nextOwner.address);
  await assertCustomError(reserve.connect(outsider).acceptOwnership(), "OwnableUnauthorizedAccount");
  await reserve.connect(nextOwner).acceptOwnership();
  await reserve.connect(nextOwner).releaseForLiquidity(1n);
  assert.equal(await reserve.owner(), nextOwner.address);
  assert.equal(await reserve.released(), 1n);
});
