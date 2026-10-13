import assert from "node:assert/strict";
import { network } from "hardhat";
import { frozenArtifact } from "./frozen-staking.js";

export const U = 10n ** 18n, CAP = 115_000_000n * U, DAY = 86_400n, YEAR = 365n * DAY;
export const rates = [200n, 500n, 800n, 1200n];
export const terms = [0n, 30n * DAY, 60n * DAY, 90n * DAY];
export const rewardFor = (amount: bigint, mode: number, seconds: bigint) => amount * rates[mode] * seconds / (10_000n * YEAR);

export async function securityFixture(frozen: boolean) {
  const connection = await network.create("hardhatMainnet");
  const { ethers, provider } = connection;
  const [treasury, ...signers] = await ethers.getSigners();
  const users = signers.slice(0, 6);
  const token = await ethers.deployContract("contracts/verified/ArexAIToken.sol:ArexAIToken", [treasury.address]);
  const safe = await ethers.deployContract("StakingSafeHarness", users.slice(0, 3).map(u => u.address));
  const factory = frozen
    ? new ethers.ContractFactory(frozenArtifact.abi, frozenArtifact.bytecode, treasury)
    : await ethers.getContractFactory("ArexAIStaking", treasury);
  const s: any = await factory.deploy(await token.getAddress(), await safe.getAddress());
  await s.waitForDeployment();
  const address = await s.getAddress();
  await token.approve(address, CAP);
  await s.fundAndActivate();
  for (const user of users) {
    await token.transfer(user.address, 50_000_000n * U);
    await token.connect(user).approve(address, ethers.MaxUint256);
  }
  const now = async () => BigInt((await provider.send("eth_getBlockByNumber", ["latest", false]) as {timestamp: string}).timestamp);
  const jump = async (at: bigint) => {
    await provider.send("evm_setNextBlockTimestamp", [Number(at)]);
    await provider.send("evm_mine", []);
  };
  const invariant = async () => {
    const [principal, free, reserved, owed, paid, burned, balance, supply] = await Promise.all([
      s.totalPrincipal(), s.freeRewards(), s.reservedLocked(), s.owedFlexible(), s.paidRewards(),
      s.burnedRewards(), token.balanceOf(address), token.totalSupply(),
    ]);
    assert.equal(free + reserved + owed + paid + burned, CAP, "reward cap conservation");
    assert.equal(balance, principal + free + reserved + owed, "principal and unpaid rewards fully covered");
    assert.equal(supply, 1_000_000_000n * U - burned, "only recorded surplus is burned");
    return { principal, free, reserved, owed, paid, burned, balance, supply };
  };
  const close = async () => {
    const data = s.interface.encodeFunctionData("emergencyClose");
    await safe.connect(users[0]).confirm(address, data);
    await safe.connect(users[1]).confirm(address, data);
    return safe.execute(address, data);
  };
  const finish = async (work = 1) => {
    let calls = 0;
    while (await s.phase() !== 0n) {
      assert(++calls <= 500, "settlement terminates within the fixture bound");
      await s.connect(users[5]).checkpoint(work);
      await invariant();
    }
    return calls;
  };
  return { connection, ethers, provider, treasury, users, token, safe, s, address, now, jump, invariant, close, finish };
}

export type SecurityFixture = Awaited<ReturnType<typeof securityFixture>>;
