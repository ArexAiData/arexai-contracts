import assert from "node:assert/strict";
import { test } from "node:test";
import { network } from "hardhat";

const ether = 10n ** 18n;
const TOTAL_ALLOCATION = 575_000_000n * ether;
const TRANCHE_AMOUNT = 28_750_000n * ether;

async function assertCustomError(promise: Promise<unknown>, errorName: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.match(String(error), new RegExp(errorName));
    return true;
  });
}

async function deployReserve(funding = TOTAL_ALLOCATION) {
  const { ethers } = await network.create("hardhatMainnet");
  const [owner, beneficiary, outsider, nextOwner] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [owner.address]);
  const reserve = await ethers.deployContract("ReserveVault", [
    await token.getAddress(), beneficiary.address, owner.address,
  ]);
  if (funding > 0n) await token.transfer(await reserve.getAddress(), funding);
  return { ethers, owner, beneficiary, outsider, nextOwner, token, reserve };
}

test("ReserveVault rejects every zero-address constructor dependency", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [owner, beneficiary] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [owner.address]);
  const tokenAddress = await token.getAddress();

  await assertCustomError(ethers.deployContract("ReserveVault", [ethers.ZeroAddress, beneficiary.address, owner.address]), "InvalidAddress");
  await assertCustomError(ethers.deployContract("ReserveVault", [tokenAddress, ethers.ZeroAddress, owner.address]), "InvalidAddress");
  await assertCustomError(ethers.deployContract("ReserveVault", [tokenAddress, beneficiary.address, ethers.ZeroAddress]), "OwnableInvalidOwner");
});

test("ReserveVault exposes the fixed allocation and immutable destinations", async () => {
  const { owner, beneficiary, token, reserve } = await deployReserve();

  assert.equal(await reserve.TOTAL_ALLOCATION(), TOTAL_ALLOCATION);
  assert.equal(await reserve.TRANCHE_COUNT(), 20n);
  assert.equal(await reserve.TRANCHE_AMOUNT(), TRANCHE_AMOUNT);
  assert.equal(await reserve.token(), await token.getAddress());
  assert.equal(await reserve.beneficiary(), beneficiary.address);
  assert.equal(await reserve.owner(), owner.address);
});

test("ReserveVault releases one exact tranche only to the beneficiary", async () => {
  const { beneficiary, outsider, token, reserve } = await deployReserve();

  await reserve.releaseNextTranche();
  assert.equal(await reserve.releasedTranches(), 1n);
  assert.equal(await token.balanceOf(beneficiary.address), TRANCHE_AMOUNT);
  assert.equal(await token.balanceOf(outsider.address), 0n);
  assert.equal(await token.balanceOf(await reserve.getAddress()), TOTAL_ALLOCATION - TRANCHE_AMOUNT);
});

test("ReserveVault blocks non-owner releases", async () => {
  const { outsider, reserve } = await deployReserve();

  await assertCustomError(reserve.connect(outsider).releaseNextTranche(), "OwnableUnauthorizedAccount");
  assert.equal(await reserve.releasedTranches(), 0n);
});

test("ReserveVault rolls state back when a tranche is underfunded", async () => {
  const { beneficiary, token, reserve } = await deployReserve(TRANCHE_AMOUNT - 1n);

  await assertCustomError(reserve.releaseNextTranche(), "InsufficientVaultBalance");
  assert.equal(await reserve.releasedTranches(), 0n);
  assert.equal(await token.balanceOf(beneficiary.address), 0n);
});

test("ReserveVault releases exactly twenty tranches and rejects a twenty-first", async () => {
  const { beneficiary, token, reserve } = await deployReserve();

  for (let tranche = 1; tranche <= 20; tranche += 1) {
    await reserve.releaseNextTranche();
    assert.equal(await reserve.releasedTranches(), BigInt(tranche));
  }
  assert.equal(await token.balanceOf(beneficiary.address), TOTAL_ALLOCATION);
  assert.equal(await token.balanceOf(await reserve.getAddress()), 0n);
  await assertCustomError(reserve.releaseNextTranche(), "AllTranchesReleased");
});

test("ReserveVault ownership transfer requires acceptance by the pending owner", async () => {
  const { owner, outsider, nextOwner, reserve } = await deployReserve();

  await reserve.connect(owner).transferOwnership(nextOwner.address);
  await assertCustomError(reserve.connect(outsider).acceptOwnership(), "OwnableUnauthorizedAccount");
  await reserve.connect(nextOwner).acceptOwnership();
  await reserve.connect(nextOwner).releaseNextTranche();
  assert.equal(await reserve.owner(), nextOwner.address);
  assert.equal(await reserve.releasedTranches(), 1n);
});
