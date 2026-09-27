import assert from "node:assert/strict";
import { test } from "node:test";
import { network } from "hardhat";

const ether = 10n ** 18n;
const INITIAL_SUPPLY = 1_000_000_000n * ether;

async function assertCustomError(promise: Promise<unknown>, errorName: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.match(String(error), new RegExp(errorName));
    return true;
  });
}

test("ArexAI rejects a zero treasury", async () => {
  const { ethers } = await network.create("hardhatMainnet");

  await assertCustomError(
    ethers.deployContract("ArexAI", [ethers.ZeroAddress]),
    "ZeroTreasury",
  );
});

test("ArexAI mints the fixed supply once to the configured treasury", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [treasury, outsider] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [treasury.address]);

  assert.equal(await token.name(), "ArexAI");
  assert.equal(await token.symbol(), "ARXAI");
  assert.equal(await token.decimals(), 18n);
  assert.equal(await token.INITIAL_SUPPLY(), INITIAL_SUPPLY);
  assert.equal(await token.totalSupply(), INITIAL_SUPPLY);
  assert.equal(await token.balanceOf(treasury.address), INITIAL_SUPPLY);
  assert.equal(await token.balanceOf(outsider.address), 0n);
});

test("ArexAI holders can burn only their own balance", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [treasury, holder, outsider] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [treasury.address]);
  const amount = 1_000n * ether;
  const burnAmount = 250n * ether;
  await token.transfer(holder.address, amount);

  await assert.rejects(token.connect(outsider).burn(1n));
  await token.connect(holder).burn(burnAmount);

  assert.equal(await token.balanceOf(holder.address), amount - burnAmount);
  assert.equal(await token.totalSupply(), INITIAL_SUPPLY - burnAmount);
});

test("ArexAI burnFrom requires and consumes holder allowance", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [treasury, holder, operator] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [treasury.address]);
  const amount = 500n * ether;
  const burnAmount = 200n * ether;
  await token.transfer(holder.address, amount);

  await assert.rejects(token.connect(operator).burnFrom(holder.address, burnAmount));
  await token.connect(holder).approve(operator.address, burnAmount);
  await token.connect(operator).burnFrom(holder.address, burnAmount);

  assert.equal(await token.allowance(holder.address, operator.address), 0n);
  assert.equal(await token.balanceOf(holder.address), amount - burnAmount);
  assert.equal(await token.totalSupply(), INITIAL_SUPPLY - burnAmount);
});

test("ArexAI exposes no owner, mint, pause, blacklist or upgrade entry points", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [treasury] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [treasury.address]);

  for (const signature of [
    "owner()",
    "mint(address,uint256)",
    "pause()",
    "blacklist(address)",
    "upgradeToAndCall(address,bytes)",
  ]) {
    assert.equal(token.interface.hasFunction(signature), false, signature);
  }
});
