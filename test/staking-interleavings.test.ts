import assert from "node:assert/strict";
import { test } from "node:test";
import { CAP, DAY, U, rewardFor, securityFixture, type SecurityFixture } from "./helpers/staking-security.js";

type Entry = { id: number; holder: number; amount: bigint; started: bigint; daily: bigint };
async function flexCohort(f: SecurityFixture, large = false): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (let i = 0; i < 8; i++) {
    const holder = i % 6, amount = (large ? 10_000_000n + BigInt(i) * 100_003n : 100_003n + BigInt(i) * 37n) * U + BigInt(17 + i);
    const id = Number(await f.s.nextId());
    await f.s.connect(f.users[holder]).stake(amount, 0);
    entries.push({ id, holder, amount, started: (await f.s.positions(id)).started, daily: rewardFor(amount, 0, DAY) });
  }
  return entries;
}
async function catchUp(f: SecurityFixture) {
  let rounds = 0;
  while (await f.s.phase() !== 0n || await f.now() + 1n >= await f.s.nextFlexibleDue()) {
    assert(++rounds < 100, "finite fixture catches up");
    await f.s.checkpoint(7); await f.invariant(); await f.finish(7);
  }
}
async function principalOnce(f: SecurityFixture, entry: Entry) {
  const user = f.users[entry.holder], before = await f.token.balanceOf(user.address);
  await f.s.connect(user).withdrawPrincipal(entry.id);
  assert.equal(await f.token.balanceOf(user.address), before + entry.amount);
  await assert.rejects(f.s.connect(user).withdrawPrincipal(entry.id), /PrincipalAlreadyWithdrawn/);
  await f.invariant();
}
async function blockedWhileBusy(f: SecurityFixture, id: number, holder: number) {
  const before = await f.invariant(), nonce = await f.safe.nonce(), at = await f.s.checkpointAt();
  await assert.rejects(f.s.connect(f.users[holder]).withdraw(id), /CheckpointRequired/);
  await assert.rejects(f.s.connect(f.users[holder]).stake(U, 0), /CheckpointRequired/);
  for (const work of [0, 65]) await assert.rejects(f.s.checkpoint(work), /InvalidBatch/);
  await assert.rejects(f.close(), /CheckpointRequired/);
  assert.equal(await f.safe.nonce(), nonce); assert.equal(await f.s.permanentlyClosed(), false);
  assert.equal(await f.s.checkpointAt(), at); assert.deepEqual(await f.invariant(), before);
}

for (const frozen of [false, true]) {
  const label = frozen ? "Frozen mainnet" : "Development";
  test(`${label} interleaving: delayed principal exit retains post-snapshot days and stops future accrual`, async () => {
    const f = await securityFixture(frozen), { s } = f, entries = await flexCohort(f);
    await f.jump(entries.at(-1)!.started + 2n * DAY + 3600n); await catchUp(f);
    await f.jump(await f.now() + DAY); await s.checkpoint(1);
    assert.equal(await s.phase(), 1n); assert.equal(await s.checkpointFullBudget(), true);
    const at = await s.checkpointAt(), already = entries[0], exiting = entries[7];
    const allocated = (await s.positions(already.id)).reward;
    assert.equal(allocated, (at - already.started) / DAY * already.daily);
    await s.connect(f.users[already.holder]).claim(already.id);
    await blockedWhileBusy(f, exiting.id, exiting.holder);
    await f.jump(at + 2n * DAY + 3600n); await principalOnce(f, exiting);
    const exitAt = await s.exitedAt(exiting.id);
    await f.finish(1); assert.equal(await s.checkpointAt(), at);
    await catchUp(f);
    const expected = (exitAt - exiting.started) / DAY * exiting.daily;
    assert.equal((await s.positions(exiting.id)).reward, expected);
    await f.jump(await f.now() + 90n * DAY); await catchUp(f);
    assert.equal((await s.positions(exiting.id)).reward, expected, "no accrual after principal exit cutoff");
    const before = await f.token.balanceOf(f.users[exiting.holder].address);
    await s.connect(f.users[exiting.holder]).withdraw(exiting.id);
    assert.equal(await f.token.balanceOf(f.users[exiting.holder].address), before + expected);
    await assert.rejects(s.connect(f.users[exiting.holder]).withdraw(exiting.id), /InvalidPosition/);
    await f.invariant(); await f.connection.close();
  });

  for (const stage of ["scan", "allocate"] as const) test(`${label} interleaving: exhaustion ${stage} permits allocated claims and exits without changing pro-rata shares`, async () => {
    const f = await securityFixture(frozen), { s } = f, entries = await flexCohort(f, true);
    await f.jump(entries.at(-1)!.started + 2n * DAY + 3600n); await catchUp(f);
    const prior = await Promise.all(entries.map(e => s.positions(e.id)));
    const budget = await s.freeRewards();
    await f.jump(entries.at(-1)!.started + 1000n * 365n * DAY + 3600n);
    await s.checkpoint(1);
    assert.equal(await s.phase(), 1n); assert.equal(await s.checkpointFullBudget(), false);
    const at = await s.checkpointAt();
    const due = entries.map((e, i) => ((at - e.started) / DAY - prior[i].settledDays) * e.daily);
    const totalDue = due.reduce((a, b) => a + b, 0n);
    assert(totalDue > budget);
    let remainder = budget;
    const shares = due.map((value, i) => { const share = i === due.length - 1 ? remainder : value * budget / totalDue; remainder -= share; return share; });
    if (stage === "allocate") {
      while (await s.phase() === 1n) { await s.checkpoint(1); await f.invariant(); }
      assert.equal(await s.phase(), 2n);
      await s.checkpoint(1); // One beneficiary receives an allocation while peers remain pending.
      assert.equal(await s.phase(), 2n);
      await f.jump(at + 7n * DAY); // Later batches must retain the captured exhaustion time.
    }
    await blockedWhileBusy(f, entries[7].id, entries[7].holder);
    const claimed = entries.map(() => 0n);
    for (const index of [0, 4, 7]) {
      const e = entries[index], user = f.users[e.holder];
      claimed[index] = (await s.positions(e.id)).reward;
      assert(claimed[index] > 0n);
      const before = await f.token.balanceOf(user.address);
      await s.connect(user).claim(e.id);
      assert.equal(await f.token.balanceOf(user.address), before + claimed[index]);
      await assert.rejects(s.connect(user).claim(e.id), /NoReward/);
      await principalOnce(f, e);
    }
    await f.finish(1);
    assert.equal(await s.checkpointAt(), at); assert.equal(await s.freeRewards(), 0n); assert.equal(await s.flexPaused(), true);
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i], user = f.users[e.holder], expected = prior[i].reward + shares[i] - claimed[i];
      assert.equal((await s.positions(e.id)).reward, expected, `independent share ${e.id}`);
      if (expected > 0n) await s.connect(user).claim(e.id);
      const before = await f.token.balanceOf(user.address), principal = await s.exitedAt(e.id) === 0n ? e.amount : 0n;
      await s.connect(user).withdraw(e.id);
      assert.equal(await f.token.balanceOf(user.address), before + principal);
      await assert.rejects(s.connect(user).withdrawPrincipal(e.id), /InvalidPosition/);
      await f.invariant();
    }
    assert.equal(await s.paidRewards(), CAP); assert.equal(await s.totalPrincipal(), 0n);
    assert.equal(await f.token.balanceOf(f.address), 0n);
    await f.close(); await assert.rejects(f.close(), /AlreadyClosed/);
    assert.equal(await s.burnedRewards(), 0n); await f.invariant(); await f.connection.close();
  });

  for (const stage of ["scan", "allocate"] as const) test(`${label} interleaving: emergency ${stage} preserves mixed liabilities across exits, claims and delayed batches`, async () => {
    const f = await securityFixture(frozen), { s } = f;
    const fixed = [];
    for (let mode = 1; mode <= 3; mode++) {
      const amount = BigInt(100_001 + mode) * U + BigInt(mode), holder = mode - 1, id = Number(await s.nextId());
      await s.connect(f.users[holder]).stake(amount, mode);
      const p = await s.positions(id);
      fixed.push({ id, holder, amount, mode, started: p.started, ends: p.ends, daily: 0n });
    }
    const flex = await flexCohort(f);
    await f.jump(flex.at(-1)!.started + 20n * DAY + 3600n); await catchUp(f);
    await principalOnce(f, fixed[0]); // Voluntary early exit before closure forfeits this position's reward.
    assert.equal(await s.forfeitedRewards(fixed[0].id), true);
    const preClaim = flex[2], prePaid = (await s.positions(preClaim.id)).reward;
    await s.connect(f.users[preClaim.holder]).claim(preClaim.id);
    await f.close(); const cutoff = await s.shutdownAt();
    if (stage === "scan") { await s.checkpoint(1); assert.equal(await s.phase(), 1n); }
    else {
      while (await s.phase() === 1n) { await s.checkpoint(1); await f.invariant(); }
      await s.checkpoint(1); assert.equal(await s.phase(), 2n);
    }
    const principalBefore = await s.totalPrincipal();
    for (const e of [fixed[1], fixed[2], flex[0], flex[7]]) await principalOnce(f, e);
    assert.equal(await s.totalPrincipal(), principalBefore - fixed[1].amount - fixed[2].amount - flex[0].amount - flex[7].amount);
    const during = flex[4], duringPaid = (await s.positions(during.id)).reward;
    await s.connect(f.users[during.holder]).claim(during.id);
    await assert.rejects(s.connect(f.users[during.holder]).withdraw(during.id), /CheckpointRequired/);
    await assert.rejects(s.connect(f.users[0]).emergencyClose(), /NotGovernance/);
    await assert.rejects(s.connect(f.users[0]).stake(U, 0), /Closed/);
    await f.jump(cutoff + 60n * DAY); // Ending wall time must not extend the emergency cutoff.
    const work = [1, 7, 64]; let call = 0;
    while (await s.phase() !== 0n) {
      assert(call < 100); await s.connect(f.users[call % 6]).checkpoint(work[call++ % work.length]);
      assert.equal(await s.checkpointAt(), cutoff); await f.invariant();
    }
    let totalEarned = 0n;
    for (const e of fixed) {
      const expected = e.id === fixed[0].id ? 0n : rewardFor(e.amount, e.mode, (cutoff < e.ends ? cutoff : e.ends) - e.started);
      assert.equal((await s.positions(e.id)).reward, expected); totalEarned += expected;
    }
    for (const e of flex) {
      const earned = (cutoff - e.started) / DAY * e.daily;
      const alreadyPaid = e.id === preClaim.id ? prePaid : e.id === during.id ? duringPaid : 0n;
      assert.equal((await s.positions(e.id)).reward, earned - alreadyPaid); totalEarned += earned;
    }
    assert.equal(await s.shutdownFinalized(), true); assert.equal(await s.burnedRewards(), CAP - totalEarned);
    const burned = await s.burnedRewards(), supply = await f.token.totalSupply();
    await assert.rejects(s.checkpoint(1), /NotReady/); await assert.rejects(f.close(), /AlreadyClosed/);
    for (const e of [...flex].reverse().concat(fixed)) {
      const user = f.users[e.holder], p = await s.positions(e.id), before = await f.token.balanceOf(user.address);
      const principal = await s.exitedAt(e.id) === 0n ? e.amount : 0n;
      await s.connect(user).withdraw(e.id);
      assert.equal(await f.token.balanceOf(user.address), before + principal + p.reward);
      await assert.rejects(s.connect(user).withdraw(e.id), /InvalidPosition/); await f.invariant();
    }
    assert.equal(await s.burnedRewards(), burned); assert.equal(await f.token.totalSupply(), supply);
    assert.equal(await s.paidRewards(), totalEarned); assert.equal(await f.token.balanceOf(f.address), 0n);
    assert.equal(await s.totalPrincipal(), 0n); await f.connection.close();
  });
}
