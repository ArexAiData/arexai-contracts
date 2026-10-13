import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { CAP, DAY, U, terms, rewardFor, securityFixture } from "./helpers/staking-security.js";

const SEEDS = [17, 2026, 64091, 0xA4E, 0xDEADBEEF, 0x9E3779B9, 0x13579BDF, 0x2468ACE];
const STEPS = 256;
type Position = { holder: number; principal: bigint; started: bigint; ends: bigint; mode: number; days: bigint; reward: bigint; active: boolean };
const records: object[] = [];
const stringify = (value: unknown) => JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v);

async function runModel(seed: number, frozen: boolean) {
  const f = await securityFixture(frozen), { s, token, users } = f;
  const model = new Map<number, Position>();
  const balances = users.map(() => 50_000_000n * U);
  let state = seed >>> 0, paid = 0n, burned = 0n, closed = false, observations = 0, checkpointCalls = 0;
  const digest = createHash("sha256");
  const counts = { stakes: [0, 0, 0, 0], timeJumps: 0, claims: 0, earlyExits: 0, matureExits: 0, unauthorized: 0, invalidAmount: 0, rejectedClaims: 0 };
  const random = (max: number) => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) % max;
  };
  async function inspect(compareModel = true) {
    const actual = await f.invariant();
    const active = [...model.values()].filter(p => p.active);
    assert.equal(actual.principal, active.reduce((sum, p) => sum + p.principal, 0n));
    const walletBalances = await Promise.all(users.map(u => token.balanceOf(u.address)));
    assert.deepEqual(walletBalances, balances, "independent holder balance model");
    if (compareModel) {
      assert.equal(actual.paid, paid);
      assert.equal(actual.burned, burned);
      assert.equal(await s.activeCount(), BigInt(active.length));
      assert.equal(actual.reserved, active.filter(p => p.mode !== 0).reduce((sum, p) => sum + p.reward, 0n));
      assert.equal(actual.owed, active.filter(p => p.mode === 0).reduce((sum, p) => sum + p.reward, 0n));
      const positions = await Promise.all([...model].map(async ([id, p]) => {
        const a = await s.positions(id);
        assert.equal(a.active, p.active, `position ${id} active`);
        assert.equal(a.principal, p.active ? p.principal : 0n, `position ${id} principal`);
        assert.equal(a.reward, p.active ? p.reward : 0n, `position ${id} reward`);
        return [id, a.principal, a.started, a.ends, a.settledDays, a.reward, a.mode, a.active];
      }));
      digest.update(stringify({ actual, walletBalances, positions, phase: await s.phase(), next: await s.nextFlexibleDue() }) + "\n");
      observations++;
    }
  }
  async function settle() {
    if (await s.phase() === 0n && (await s.shutdownFinalized() || (!closed && await f.now() < await s.nextFlexibleDue()))) return;
    let calls = 0;
    do {
      assert(++calls < 500, "bounded model fixture must terminate");
      await s.checkpoint(1 + random(64)); checkpointCalls++;
      await inspect(false);
    } while (await s.phase() !== 0n);
    const at = await s.checkpointAt();
    for (const p of model.values()) if (p.active) {
      if (p.mode === 0) {
        const days = (at - p.started) / DAY;
        p.reward += (days - p.days) * rewardFor(p.principal, 0, DAY); p.days = days;
      } else if (closed) p.reward = rewardFor(p.principal, p.mode, (at < p.ends ? at : p.ends) - p.started);
    }
    if (closed) burned = CAP - paid - [...model.values()].filter(p => p.active).reduce((sum, p) => sum + p.reward, 0n);
    await inspect();
  }
  async function stake(holder: number, mode: number, amount: bigint) {
    const id = Number(await s.nextId());
    await s.connect(users[holder]).stake(amount, mode);
    const started = await f.now();
    model.set(id, { holder, principal: amount, started, ends: mode ? started + terms[mode] : 0n, mode, days: 0n, reward: mode ? rewardFor(amount, mode, terms[mode]) : 0n, active: true });
    balances[holder] -= amount; counts.stakes[mode]++;
  }
  // Force all terms and sub-token/rounding amounts into every reproducible run.
  for (let i = 0; i < 8; i++) await stake(i % users.length, i % 4, i < 4 ? BigInt(i + 1) : (10_000n + BigInt(i)) * U + BigInt(i));
  await inspect();
  // A deterministic prefix ensures every seed includes a paid flexible claim;
  // random operation coverage must not depend on a lucky seed selection.
  await f.jump(await f.now() + 2n * DAY + 3600n); counts.timeJumps++; await settle();
  const initialClaim = model.get(5)!;
  assert(initialClaim.reward > 0n);
  await s.connect(users[initialClaim.holder]).claim(5);
  balances[initialClaim.holder] += initialClaim.reward; paid += initialClaim.reward;
  initialClaim.reward = 0n; counts.claims++; await inspect();
  for (let step = 0; step < STEPS; step++) {
    try {
      await settle();
      const active = [...model].filter(([, p]) => p.active), op = random(7);
      if (op === 0 || op === 4 || active.length === 0) {
        const holder = random(users.length), mode = random(4);
        const amount = (100n + BigInt(random(100_000))) * U + BigInt(random(1000));
        await stake(holder, mode, amount);
      } else if (op === 1) {
        await f.jump(await f.now() + BigInt(1 + random(Number(15n * DAY)))); counts.timeJumps++; await settle();
      } else if (op === 2) {
        const [id, p] = active[random(active.length)];
        if (p.mode === 0 && p.reward > 0n) {
          await s.connect(users[p.holder]).claim(id); balances[p.holder] += p.reward; paid += p.reward; p.reward = 0n; counts.claims++;
          await assert.rejects(s.connect(users[p.holder]).claim(id), /NoReward/); counts.rejectedClaims++;
        } else {
          await assert.rejects(s.connect(users[p.holder]).claim(id), p.mode ? /WrongMode/ : /NoReward/); counts.rejectedClaims++;
        }
      } else if (op === 3) {
        const [id, p] = active[random(active.length)];
        await s.connect(users[p.holder]).withdraw(id);
        const early = p.mode !== 0 && await f.now() < p.ends;
        const reward = early ? 0n : p.reward;
        balances[p.holder] += p.principal + reward; paid += reward; p.active = false;
        if (early) counts.earlyExits++; else counts.matureExits++;
        await assert.rejects(s.connect(users[p.holder]).withdraw(id), /InvalidPosition/);
      } else if (op === 5) {
        const [id, p] = active[random(active.length)], outsider = users[(p.holder + 1) % users.length];
        for (const method of ["withdraw", "withdrawPrincipal", "claim"]) await assert.rejects(s.connect(outsider)[method](id), /NotHolder/);
        counts.unauthorized++;
      } else {
        await assert.rejects(s.connect(users[random(users.length)]).stake(0, random(4)), /InvalidAmount/); counts.invalidAmount++;
      }
      await inspect();
    } catch (error) { throw new Error(`seed=${seed} implementation=${frozen ? "frozen" : "development"} step=${step}`, { cause: error }); }
  }
  await settle(); await f.close(); closed = true;
  if (await s.shutdownFinalized()) burned = CAP - paid; else await settle();
  await inspect();
  await assert.rejects(s.connect(users[0]).stake(U, 0), /Closed/);
  for (const [id, p] of model) if (p.active) {
    await s.connect(users[p.holder]).withdraw(id);
    balances[p.holder] += p.principal + p.reward; paid += p.reward; p.active = false;
    await inspect();
  }
  assert.equal(await token.balanceOf(f.address), 0n); assert.equal(paid + burned, CAP);
  assert(counts.stakes.every(n => n > 0));
  for (const key of ["timeJumps", "claims", "earlyExits", "matureExits", "unauthorized", "invalidAmount"] as const) assert(counts[key] > 0, `seed covers ${key}`);
  await f.connection.close();
  return { seed, steps: STEPS, users: users.length, observations, checkpointCalls, counts, digest: digest.digest("hex"), paid: String(paid), burned: String(burned) };
}

for (const seed of SEEDS) test(`Staking differential model ${seed}: 256 operations match independent ledger and frozen deployment`, async () => {
  const development = await runModel(seed, false), frozen = await runModel(seed, true);
  assert.deepEqual(frozen, development, "full observed state trace must match across implementations");
  records.push({ ...development, implementations: ["development", "frozen-mainnet-input"], matched: true });
  if (process.env.STAKING_STATEFUL_REPORT) writeFileSync(process.env.STAKING_STATEFUL_REPORT, JSON.stringify({ scope: "Local deterministic model tests, not a BSC fork, live governance check or independent audit.", randomizedOperationsPerImplementation: STEPS, seeds: SEEDS, completedRuns: records.length, totalRandomizedOperations: records.length * STEPS * 2, records }, null, 2) + "\n");
});
