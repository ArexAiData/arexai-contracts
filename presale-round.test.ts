import assert from "node:assert/strict";
import { test } from "node:test";
import { network } from "hardhat";

const ether = 10n ** 18n;
const START = 1_789_689_600;
const END = 1_792_281_600;
const ALLOCATION = 50_000_000n * ether;
const PRICE = 10n ** 16n;
const MINIMUM = 100n * ether;
const MAXIMUM = 30_000n * ether;

async function deployRound(activate = true) {
  const { ethers } = await network.create("hardhatMainnet");
  const [owner, treasury, buyer, buyer2, outsider] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [owner.address]);
  const usdt = await ethers.deployContract("MockUSDT");
  const presale = await ethers.deployContract("PresaleRound", [
    await token.getAddress(),
    await usdt.getAddress(),
    treasury.address,
    owner.address,
    START,
    END,
    ALLOCATION,
    PRICE,
    MINIMUM,
    MAXIMUM,
  ]);

  await token.transfer(await presale.getAddress(), ALLOCATION);
  await usdt.mint(buyer.address, 60_000n * ether);
  await usdt.mint(buyer2.address, 60_000n * ether);
  await usdt.connect(buyer).approve(await presale.getAddress(), 60_000n * ether);
  await usdt.connect(buyer2).approve(await presale.getAddress(), 60_000n * ether);
  if (activate) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [START]);
    await ethers.provider.send("evm_mine", []);
  }

  return { ethers, owner, treasury, buyer, buyer2, outsider, token, usdt, presale };
}

async function assertCustomError(promise: Promise<unknown>, errorName: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.match(String(error), new RegExp(errorName));
    return true;
  });
}

async function deploySmallRound(options?: {
  allocation?: bigint;
  price?: bigint;
  minimum?: bigint;
  maximum?: bigint;
  inventory?: bigint;
  activate?: boolean;
}) {
  const { ethers } = await network.create("hardhatMainnet");
  const [owner, treasury, buyer, buyer2, outsider] = await ethers.getSigners();
  const allocation = options?.allocation ?? 10_000n * ether;
  const price = options?.price ?? PRICE;
  const minimum = options?.minimum ?? MINIMUM;
  const maximum = options?.maximum ?? MAXIMUM;
  const inventory = options?.inventory ?? allocation;
  const token = await ethers.deployContract("ArexAI", [owner.address]);
  const usdt = await ethers.deployContract("MockUSDT");
  const presale = await ethers.deployContract("PresaleRound", [
    await token.getAddress(),
    await usdt.getAddress(),
    treasury.address,
    owner.address,
    START,
    END,
    allocation,
    price,
    minimum,
    maximum,
  ]);

  if (inventory > 0n) await token.transfer(await presale.getAddress(), inventory);
  for (const account of [buyer, buyer2]) {
    await usdt.mint(account.address, 60_000n * ether);
    await usdt.connect(account).approve(await presale.getAddress(), 60_000n * ether);
  }
  if (options?.activate ?? true) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [START]);
    await ethers.provider.send("evm_mine", []);
  }

  return { ethers, owner, treasury, buyer, buyer2, outsider, token, usdt, presale };
}

test("PresaleRound routes exact payment and delivers ARXAI immediately", async () => {
  const { treasury, buyer, token, usdt, presale } = await deployRound();

  await presale.connect(buyer).buy(100n * ether);

  assert.equal(await usdt.balanceOf(treasury.address), 100n * ether);
  assert.equal(await token.balanceOf(buyer.address), 10_000n * ether);
  assert.equal(await presale.contributed(buyer.address), 100n * ether);
  assert.equal(await presale.totalSold(), 10_000n * ether);
});

test("PresaleRound enforces minimum and cumulative wallet maximum", async () => {
  const { buyer, presale } = await deployRound();

  await assert.rejects(presale.connect(buyer).buy(99n * ether));
  await presale.connect(buyer).buy(MAXIMUM);
  await assert.rejects(presale.connect(buyer).buy(MINIMUM));
});

test("PresaleRound consumes an exact payment-token approval", async () => {
  const { buyer, usdt, presale } = await deployRound();
  const presaleAddress = await presale.getAddress();

  await usdt.connect(buyer).approve(presaleAddress, 0n);
  await usdt.connect(buyer).approve(presaleAddress, MINIMUM);
  await presale.connect(buyer).buy(MINIMUM);

  assert.equal(await usdt.allowance(buyer.address, presaleAddress), 0n);
});

test("PresaleRound rejects purchases before start and at the end timestamp", async () => {
  const { ethers, buyer, presale } = await deployRound(false);

  await assert.rejects(presale.connect(buyer).buy(MINIMUM));
  await ethers.provider.send("evm_setNextBlockTimestamp", [END]);
  await ethers.provider.send("evm_mine", []);
  await assert.rejects(presale.connect(buyer).buy(MINIMUM));
});

test("PresaleRound pause control belongs only to the owner", async () => {
  const { owner, buyer, presale } = await deployRound();

  await assert.rejects(presale.connect(buyer).pause());
  await presale.connect(owner).pause();
  await assert.rejects(presale.connect(buyer).buy(MINIMUM));
  await presale.connect(owner).unpause();
  await presale.connect(buyer).buy(MINIMUM);
});

test("PresaleRound ownership transfer requires acceptance by the pending owner", async () => {
  const { owner, buyer, presale } = await deployRound();

  await presale.connect(owner).transferOwnership(buyer.address);
  assert.equal(await presale.owner(), owner.address);
  assert.equal(await presale.pendingOwner(), buyer.address);
  await assert.rejects(presale.connect(buyer).pause());

  await presale.connect(buyer).acceptOwnership();
  assert.equal(await presale.owner(), buyer.address);
  await presale.connect(buyer).pause();
  assert.equal(await presale.paused(), true);
});

test("PresaleRound burns only the unsold allocation after the round", async () => {
  const { ethers, owner, buyer, token, presale } = await deployRound();
  await presale.connect(buyer).buy(MINIMUM);

  const supplyBefore = await token.totalSupply();
  const sold = 10_000n * ether;
  const unsold = ALLOCATION - sold;

  await assert.rejects(presale.connect(owner).finalize());
  await ethers.provider.send("evm_setNextBlockTimestamp", [END]);
  await ethers.provider.send("evm_mine", []);
  await presale.connect(owner).finalize();

  assert.equal(await token.totalSupply(), supplyBefore - unsold);
  assert.equal(await token.balanceOf(await presale.getAddress()), 0n);
  assert.equal(await presale.finalized(), true);
  await assert.rejects(presale.connect(owner).finalize());
});

test("PresaleRound rejects invalid constructor configuration", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [owner, treasury] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [owner.address]);
  const usdt = await ethers.deployContract("MockUSDT");
  const base = [
    await token.getAddress(),
    await usdt.getAddress(),
    treasury.address,
    owner.address,
  ] as const;

  await assert.rejects(ethers.deployContract("PresaleRound", [
    ...base, START, START, ALLOCATION, PRICE, MINIMUM, MAXIMUM,
  ]));
  await assert.rejects(ethers.deployContract("PresaleRound", [
    ...base, START, END, 0n, PRICE, MINIMUM, MAXIMUM,
  ]));
});

test("PresaleRound rejects a purchase when sale-token inventory is insufficient", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [owner, treasury, buyer] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [owner.address]);
  const usdt = await ethers.deployContract("MockUSDT");
  const presale = await ethers.deployContract("PresaleRound", [
    await token.getAddress(),
    await usdt.getAddress(),
    treasury.address,
    owner.address,
    START,
    END,
    ALLOCATION,
    PRICE,
    MINIMUM,
    MAXIMUM,
  ]);

  await usdt.mint(buyer.address, MINIMUM);
  await usdt.connect(buyer).approve(await presale.getAddress(), MINIMUM);
  await ethers.provider.send("evm_setNextBlockTimestamp", [START]);
  await ethers.provider.send("evm_mine", []);

  await assert.rejects(presale.connect(buyer).buy(MINIMUM));
  assert.equal(await usdt.balanceOf(treasury.address), 0n);
  assert.equal(await token.balanceOf(buyer.address), 0n);
});

test("PresaleRound returns an exact quote and restricts finalization to the owner", async () => {
  const { ethers, owner, buyer, presale } = await deployRound();

  assert.equal(await presale.quote(MINIMUM), 10_000n * ether);
  await ethers.provider.send("evm_setNextBlockTimestamp", [END]);
  await ethers.provider.send("evm_mine", []);
  await assert.rejects(presale.connect(buyer).finalize());
  await presale.connect(owner).finalize();
  assert.equal(await presale.finalized(), true);
});

test("PresaleRound rejects every zero-address constructor dependency", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [owner, treasury] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [owner.address]);
  const usdt = await ethers.deployContract("MockUSDT");
  const tokenAddress = await token.getAddress();
  const usdtAddress = await usdt.getAddress();
  const zero = ethers.ZeroAddress;
  const tail = [START, END, ALLOCATION, PRICE, MINIMUM, MAXIMUM] as const;

  await assertCustomError(ethers.deployContract("PresaleRound", [
    zero, usdtAddress, treasury.address, owner.address, ...tail,
  ]), "InvalidAddress");
  await assertCustomError(ethers.deployContract("PresaleRound", [
    tokenAddress, zero, treasury.address, owner.address, ...tail,
  ]), "InvalidAddress");
  await assertCustomError(ethers.deployContract("PresaleRound", [
    tokenAddress, usdtAddress, zero, owner.address, ...tail,
  ]), "InvalidAddress");
  await assertCustomError(ethers.deployContract("PresaleRound", [
    tokenAddress, usdtAddress, treasury.address, zero, ...tail,
  ]), "OwnableInvalidOwner");
});

test("PresaleRound rejects every invalid numeric constructor configuration", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [owner, treasury] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [owner.address]);
  const usdt = await ethers.deployContract("MockUSDT");
  const base = [
    await token.getAddress(), await usdt.getAddress(), treasury.address, owner.address,
  ] as const;

  await assertCustomError(ethers.deployContract("PresaleRound", [
    ...base, START, END, 0n, PRICE, MINIMUM, MAXIMUM,
  ]), "InvalidConfiguration");
  await assertCustomError(ethers.deployContract("PresaleRound", [
    ...base, START, END, ALLOCATION, 0n, MINIMUM, MAXIMUM,
  ]), "InvalidConfiguration");
  await assertCustomError(ethers.deployContract("PresaleRound", [
    ...base, START, END, ALLOCATION, PRICE, 0n, MAXIMUM,
  ]), "InvalidConfiguration");
  await assertCustomError(ethers.deployContract("PresaleRound", [
    ...base, START, END, ALLOCATION, PRICE, MINIMUM, MINIMUM - 1n,
  ]), "InvalidConfiguration");
});

test("PresaleRound rejects payment tokens with more than 18 decimals", async () => {
  const { ethers } = await network.create("hardhatMainnet");
  const [owner, treasury] = await ethers.getSigners();
  const token = await ethers.deployContract("ArexAI", [owner.address]);
  const paymentToken = await ethers.deployContract("MockERC20Decimals", [19]);
  await paymentToken.mint(owner.address, 1n);

  await assertCustomError(ethers.deployContract("PresaleRound", [
    await token.getAddress(), await paymentToken.getAddress(), treasury.address, owner.address,
    START, END, ALLOCATION, PRICE, MINIMUM, MAXIMUM,
  ]), "PaymentDecimalsTooLarge");
});

test("PresaleRound rejects a payment that rounds down to zero ARXAI", async () => {
  const { buyer, presale } = await deploySmallRound({
    allocation: ether,
    price: 10n ** 30n,
    minimum: 1n,
    maximum: 100n,
  });

  await assertCustomError(presale.connect(buyer).buy(1n), "ZeroTokenOutput");
});

test("PresaleRound rejects purchases beyond the configured allocation", async () => {
  const { buyer, buyer2, presale } = await deploySmallRound();

  await presale.connect(buyer).buy(MINIMUM);
  await assertCustomError(presale.connect(buyer2).buy(MINIMUM), "AllocationExceeded");
});

test("PresaleRound rejects finalization when unsold inventory is underfunded", async () => {
  const { ethers, owner, presale } = await deploySmallRound({ inventory: 0n });
  await ethers.provider.send("evm_setNextBlockTimestamp", [END]);
  await ethers.provider.send("evm_mine", []);

  await assertCustomError(presale.connect(owner).finalize(), "InsufficientInventory");
  assert.equal(await presale.finalized(), false);
});

test("PresaleRound rolls state back when allowance is insufficient", async () => {
  const { treasury, buyer, token, usdt, presale } = await deployRound();
  const presaleAddress = await presale.getAddress();
  await usdt.connect(buyer).approve(presaleAddress, MINIMUM - 1n);

  await assert.rejects(presale.connect(buyer).buy(MINIMUM));

  assert.equal(await presale.totalSold(), 0n);
  assert.equal(await presale.contributed(buyer.address), 0n);
  assert.equal(await usdt.balanceOf(treasury.address), 0n);
  assert.equal(await token.balanceOf(buyer.address), 0n);
});

test("PresaleRound rolls state back when payment-token balance is insufficient", async () => {
  const { owner, treasury, buyer, token, usdt, presale } = await deployRound();
  await usdt.connect(buyer).transfer(owner.address, 60_000n * ether);

  await assert.rejects(presale.connect(buyer).buy(MINIMUM));

  assert.equal(await presale.totalSold(), 0n);
  assert.equal(await presale.contributed(buyer.address), 0n);
  assert.equal(await usdt.balanceOf(treasury.address), 0n);
  assert.equal(await token.balanceOf(buyer.address), 0n);
});

test("PresaleRound rejects purchases after finalization", async () => {
  const { ethers, owner, buyer, presale } = await deployRound();
  await ethers.provider.send("evm_setNextBlockTimestamp", [END]);
  await ethers.provider.send("evm_mine", []);
  await presale.connect(owner).finalize();

  await assertCustomError(presale.connect(buyer).buy(MINIMUM), "SaleNotActive");
});

test("PresaleRound finalizes without burning when the allocation is sold out", async () => {
  const { ethers, owner, buyer, token, presale } = await deploySmallRound();
  const supplyBefore = await token.totalSupply();
  await presale.connect(buyer).buy(MINIMUM);
  await ethers.provider.send("evm_setNextBlockTimestamp", [END]);
  await ethers.provider.send("evm_mine", []);
  await presale.connect(owner).finalize();

  assert.equal(await presale.totalSold(), 10_000n * ether);
  assert.equal(await token.totalSupply(), supplyBefore);
  assert.equal(await token.balanceOf(await presale.getAddress()), 0n);
});

test("PresaleRound allows only the pending owner to accept ownership", async () => {
  const { owner, buyer, outsider, presale } = await deployRound();
  await presale.connect(owner).transferOwnership(buyer.address);

  await assert.rejects(presale.connect(outsider).acceptOwnership());
  assert.equal(await presale.owner(), owner.address);
  assert.equal(await presale.pendingOwner(), buyer.address);

  await presale.connect(buyer).acceptOwnership();
  assert.equal(await presale.owner(), buyer.address);
});

test("PresaleRound documents the operational consequences of ownership renunciation", async () => {
  const { ethers, owner, presale } = await deployRound();
  await presale.connect(owner).renounceOwnership();
  assert.equal(await presale.owner(), ethers.ZeroAddress);

  await assert.rejects(presale.connect(owner).pause());
  await ethers.provider.send("evm_setNextBlockTimestamp", [END]);
  await ethers.provider.send("evm_mine", []);
  await assert.rejects(presale.connect(owner).finalize());
  assert.equal(await presale.finalized(), false);
});

test("PresaleRound enforces START-1, START, END-1 and END boundaries", async () => {
  const { ethers, buyer, buyer2, presale } = await deployRound(false);

  await ethers.provider.send("evm_setNextBlockTimestamp", [START - 1]);
  await assertCustomError(presale.connect(buyer).buy(MINIMUM), "SaleNotActive");

  await ethers.provider.send("evm_setNextBlockTimestamp", [START]);
  await presale.connect(buyer).buy(MINIMUM);

  await ethers.provider.send("evm_setNextBlockTimestamp", [END - 1]);
  await presale.connect(buyer2).buy(MINIMUM);

  await ethers.provider.send("evm_setNextBlockTimestamp", [END]);
  await assertCustomError(presale.connect(buyer).buy(MINIMUM), "SaleNotActive");
});

test("PresaleRound tracks maximum contributions independently per buyer", async () => {
  const { buyer, buyer2, presale } = await deployRound();

  await presale.connect(buyer).buy(MAXIMUM);
  await presale.connect(buyer2).buy(MAXIMUM);

  assert.equal(await presale.contributed(buyer.address), MAXIMUM);
  assert.equal(await presale.contributed(buyer2.address), MAXIMUM);
});

test("PresaleRound rejects cumulative small purchases above the wallet maximum", async () => {
  const { buyer, presale } = await deployRound();
  const half = MAXIMUM / 2n;

  await presale.connect(buyer).buy(half);
  await presale.connect(buyer).buy(half);
  await assertCustomError(presale.connect(buyer).buy(MINIMUM), "WalletMaximumExceeded");
  assert.equal(await presale.contributed(buyer.address), MAXIMUM);
});
