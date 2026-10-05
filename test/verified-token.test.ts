import assert from "node:assert/strict";
import { test } from "node:test";
import { network } from "hardhat";

const supply = 1_000_000_000n * 10n ** 18n;

test("ArexAIToken verified source rejects a zero initial holder and has no privileged supply controls", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [holder] = await ethers.getSigners();
  await assert.rejects(ethers.deployContract("contracts/verified/ArexAIToken.sol:ArexAIToken", [ethers.ZeroAddress]), /InvalidInitialHolder/);
  const token = await ethers.deployContract("contracts/verified/ArexAIToken.sol:ArexAIToken", [holder.address]);
  assert.equal(await token.totalSupply(), supply);
  assert.equal(await token.balanceOf(holder.address), supply);
  for (const signature of ["owner()", "mint(address,uint256)", "pause()", "blacklist(address)", "upgradeToAndCall(address,bytes)"]) {
    assert.equal(token.interface.hasFunction(signature), false, signature);
  }
});

test("ArexAIToken conserves balances and burned supply through a reproducible mixed operation sequence", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const actors = (await ethers.getSigners()).slice(0, 4);
  const token = await ethers.deployContract("contracts/verified/ArexAIToken.sol:ArexAIToken", [actors[0].address]);
  const balances = [supply, 0n, 0n, 0n];
  let burned = 0n;
  let seed = 0x41525841;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  for (let step = 0; step < 100; step++) {
    const from = next() % actors.length;
    const to = (from + 1 + next() % 3) % actors.length;
    const amount = balances[from] === 0n ? 0n : BigInt(next()) % (balances[from] + 1n);
    if (step % 3 === 0) {
      await token.connect(actors[from]).burn(amount);
      balances[from] -= amount;
      burned += amount;
    } else {
      await token.connect(actors[from]).transfer(actors[to].address, amount);
      balances[from] -= amount;
      balances[to] += amount;
    }
    for (let i = 0; i < actors.length; i++) assert.equal(await token.balanceOf(actors[i].address), balances[i], `step ${step}, actor ${i}`);
    assert.equal(await token.totalSupply(), supply - burned, `step ${step}`);
    assert.equal(balances.reduce((a, b) => a + b, 0n), await token.totalSupply());
  }
});

test("ArexAIToken failed delegated burns preserve supply, balance and allowance", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [holder, operator] = await ethers.getSigners();
  for (const amount of [1n, 10n ** 18n, supply]) {
    const token = await ethers.deployContract("contracts/verified/ArexAIToken.sol:ArexAIToken", [holder.address]);
    await token.approve(operator.address, amount - 1n);
    await assert.rejects(token.connect(operator).burnFrom(holder.address, amount));
    assert.equal(await token.totalSupply(), supply);
    assert.equal(await token.balanceOf(holder.address), supply);
    assert.equal(await token.allowance(holder.address, operator.address), amount - 1n);
    await token.approve(operator.address, amount);
    await token.connect(operator).burnFrom(holder.address, amount);
    assert.equal(await token.allowance(holder.address, operator.address), 0n);
    assert.equal(await token.totalSupply(), supply - amount);

  }
});
