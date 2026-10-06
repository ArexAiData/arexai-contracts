import assert from "node:assert/strict";
import { test } from "node:test";
import { network } from "hardhat";

const E = 10n ** 18n;
const START = 1_789_689_600;
const END = START + 30 * 86_400;
const CAP = 50_000_000n * E;
const PAYMENT = 100n * E;

async function fixture() {
  const { ethers } = await network.create("hardhatMainnet");
  const [owner, recipient, buyer, newOwner] = await ethers.getSigners();
  const token = await ethers.deployContract("contracts/verified/ArexAIToken.sol:ArexAIToken", [owner.address]);
  const payment = await ethers.deployContract("MockBlocklistToken");
  const sale = await ethers.deployContract("PresaleRound", [await token.getAddress(), await payment.getAddress(), recipient.address, owner.address, START, END, CAP, 10n ** 16n, PAYMENT, 30_000n * E]);
  await token.transfer(await sale.getAddress(), CAP);
  await payment.mint(buyer.address, 1_000n * E);
  await payment.connect(buyer).approve(await sale.getAddress(), 1_000n * E);
  await ethers.provider.send("evm_setNextBlockTimestamp", [START]);
  await ethers.provider.send("evm_mine", []);
  return { ethers, owner, recipient, buyer, newOwner, token, payment, sale };
}

test("Recipient risk: blocked treasury rolls back payment, delivery, allowance and sale accounting", async () => {
  const { recipient, buyer, token, payment, sale } = await fixture();
  const address = await sale.getAddress();
  await payment.setBlocked(recipient.address, true);
  const beforeBalance = await payment.balanceOf(buyer.address);
  const beforeAllowance = await payment.allowance(buyer.address, address);
  await assert.rejects(sale.connect(buyer).buy(PAYMENT), /BlockedAccount/);
  assert.equal(await payment.balanceOf(buyer.address), beforeBalance);
  assert.equal(await payment.balanceOf(recipient.address), 0n);
  assert.equal(await payment.allowance(buyer.address, address), beforeAllowance);
  assert.equal(await token.balanceOf(buyer.address), 0n);
  assert.equal(await token.balanceOf(address), CAP);
  assert.equal(await sale.totalSold(), 0n);
  assert.equal(await sale.contributed(buyer.address), 0n);
  await payment.setBlocked(recipient.address, false);
  await sale.connect(buyer).buy(PAYMENT);
  assert.equal(await payment.balanceOf(recipient.address), PAYMENT);
  assert.equal(await token.balanceOf(buyer.address), 10_000n * E);
});

test("Recipient risk: blocked buyer cannot pay and contributes nothing", async () => {
  const { buyer, payment, sale } = await fixture();
  await payment.setBlocked(buyer.address, true);
  await assert.rejects(sale.connect(buyer).buy(PAYMENT), /BlockedAccount/);
  assert.equal(await sale.contributed(buyer.address), 0n);
  assert.equal(await sale.totalSold(), 0n);
});

test("Pause policy: unpause within the original window resumes without extending the deadline", async () => {
  const { ethers, buyer, sale } = await fixture();
  await sale.pause();
  await assert.rejects(sale.connect(buyer).buy(PAYMENT), /EnforcedPause/);
  await ethers.provider.send("evm_setNextBlockTimestamp", [START + 7 * 86_400]);
  await sale.unpause();
  assert.equal(await sale.endTime(), BigInt(END));
  await sale.connect(buyer).buy(PAYMENT);
  assert.equal(await sale.totalSold(), 10_000n * E);
});

test("Pause policy: unpause after end does not reopen the sale; finalization still burns unsold tokens", async () => {
  const { ethers, buyer, sale, token } = await fixture();
  await sale.pause();
  await ethers.provider.send("evm_setNextBlockTimestamp", [END + 2 * 86_400]);
  await sale.unpause();
  assert.equal(await sale.endTime(), BigInt(END));
  await assert.rejects(sale.connect(buyer).buy(PAYMENT), /SaleNotActive/);
  const supply = await token.totalSupply();
  await sale.finalize();
  assert.equal(await token.totalSupply(), supply - CAP);
  assert.equal(await sale.finalized(), true);
});

test("Pause policy: owner may finalize an ended round while it remains paused", async () => {
  const { ethers, sale, token } = await fixture();
  await sale.pause();
  await ethers.provider.send("evm_setNextBlockTimestamp", [END]);
  await sale.finalize();
  assert.equal(await sale.paused(), true);
  assert.equal(await sale.finalized(), true);
  assert.equal(await token.balanceOf(await sale.getAddress()), 0n);
});

test("Recipient risk: reserve ownership rotation does not redirect its immutable beneficiary", async () => {
  const { ethers, owner, recipient, newOwner, payment } = await fixture();
  const vault = await ethers.deployContract("ReserveVault", [await payment.getAddress(), recipient.address, owner.address]);
  const tranche = await vault.TRANCHE_AMOUNT();
  await payment.mint(await vault.getAddress(), tranche);
  await vault.transferOwnership(newOwner.address);
  await vault.connect(newOwner).acceptOwnership();
  assert.equal(await vault.beneficiary(), recipient.address);
  await payment.setBlocked(recipient.address, true);
  await assert.rejects(vault.connect(newOwner).releaseNextTranche(), /BlockedAccount/);
  assert.equal(await vault.releasedTranches(), 0n);
  assert.equal(await payment.balanceOf(await vault.getAddress()), tranche);
  await payment.setBlocked(recipient.address, false);
  await vault.connect(newOwner).releaseNextTranche();
  assert.equal(await payment.balanceOf(recipient.address), tranche);
  assert.equal(await payment.balanceOf(newOwner.address), 0n);
});

test("Recipient risk: liquidity release rolls back its counter when the immutable manager is blocked", async () => {
  const { ethers, owner, recipient, payment } = await fixture();
  const vault = await ethers.deployContract("LiquidityReserveVault", [await payment.getAddress(), recipient.address, owner.address]);
  await payment.mint(await vault.getAddress(), 100n * E);
  await payment.setBlocked(recipient.address, true);
  await assert.rejects(vault.releaseForLiquidity(100n * E), /BlockedAccount/);
  assert.equal(await vault.released(), 0n);
  assert.equal(await payment.balanceOf(await vault.getAddress()), 100n * E);
  await payment.setBlocked(recipient.address, false);
  await vault.releaseForLiquidity(100n * E);
  assert.equal(await payment.balanceOf(recipient.address), 100n * E);
});

for (const implementation of ["TeamVesting", "ArexAITeamVesting"]) {
  test(`Recipient risk: ${implementation} retains earned liability after a blocked beneficiary transfer`, async () => {
    const { ethers, recipient, buyer, payment } = await fixture();
    const schedule = Array.from({ length: 20 }, (_, i) => END + (i + 1) * 30 * 86_400);
    const args = implementation === "TeamVesting" ? [await payment.getAddress(), recipient.address, schedule] : [await payment.getAddress(), recipient.address];
    const vesting = await ethers.deployContract(implementation, args);
    const first = implementation === "TeamVesting" ? schedule[0] : Number(await vesting.releaseTime(0));
    const tranche = await vesting.TRANCHE_AMOUNT();
    const callerBalance = await payment.balanceOf(buyer.address);
    await payment.mint(await vesting.getAddress(), tranche);
    await payment.setBlocked(recipient.address, true);
    await ethers.provider.send("evm_setNextBlockTimestamp", [first]);
    await ethers.provider.send("evm_mine", []);
    await assert.rejects(vesting.connect(buyer).release(), /BlockedAccount/);
    assert.equal(await vesting.released(), 0n);
    assert.equal(await vesting.releasable(), tranche);
    assert.equal(await payment.balanceOf(await vesting.getAddress()), tranche);
    await payment.setBlocked(recipient.address, false);
    await vesting.connect(buyer).release();
    assert.equal(await payment.balanceOf(recipient.address), tranche);
    assert.equal(await payment.balanceOf(buyer.address), callerBalance);
  });
}
