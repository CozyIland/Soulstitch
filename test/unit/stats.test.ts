import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, canEquip, owned, bossReward, reach, bossMaxHp } from '../../src/game/stats.ts';
import { defaultEquip } from '../../src/game/save.ts';
import { PART, SLOTS, BALANCE } from '../../src/data/index.ts';

const slot = (k: string) => SLOTS.find((s) => s.k === k)!;

test('Grundkörper hat die Grundwerte', () => {
  const s = computeStats(defaultEquip());
  assert.equal(s.hp, BALANCE.player.hp);
  assert.equal(s.speed, BALANCE.player.speed);
  assert.equal(s.fr, 1);
  assert.equal(s.dmg, 1);
  assert.equal(reach(s), 1);
  assert.equal(s.dbl, false);
});

test('Arme wirken pro Stück: zwei Kanonenarme verdoppeln den Bonus', () => {
  const one = computeStats({ ...defaultEquip(), armR: 'a3' });
  const two = computeStats({ ...defaultEquip(), armL: 'a3', armR: 'a3' });
  assert.equal(one.dmg, 1.5);
  assert.equal(two.dmg, 2);
  assert.ok(Math.abs(two.fr - 0.7) < 1e-9);
});

test('Doppelsprung nur mit zwei Froschbeinen', () => {
  assert.equal(computeStats({ ...defaultEquip(), beinL: 'l3' }).dbl, false);
  assert.equal(computeStats({ ...defaultEquip(), beinL: 'l3', beinR: 'l3' }).dbl, true);
});

test('Herzen addieren sich aus Brust und Herz', () => {
  assert.equal(computeStats({ ...defaultEquip(), brust: 'b3', herz: 'h1' }).hp, BALANCE.player.hp + 3);
});

test('Ein gekaufter Arm passt nur an eine Seite', () => {
  const inv = { own: { a3: 1 }, eq: { ...defaultEquip(), armL: 'a3' } };
  assert.equal(canEquip(inv, slot('armR'), PART.a3), false);
  assert.equal(canEquip(inv, slot('armL'), PART.a3), true);
  inv.own.a3 = 2;
  assert.equal(canEquip(inv, slot('armR'), PART.a3), true);
});

test('Startteile gibt es unbegrenzt', () => {
  assert.ok(owned({ own: {}, eq: defaultEquip() }, 'a0') > 2);
  assert.equal(owned({ own: {}, eq: defaultEquip() }, 'a3'), 0);
});

test('Belohnung: Grundwert + Boss-Nummer, Bonus ohne Treffer', () => {
  const R = BALANCE.rewards;
  assert.equal(bossReward(1, true), R.base + R.perBoss);
  assert.equal(bossReward(5, false), R.base + 5 * R.perBoss + R.noHitBonus);
  assert.equal(bossMaxHp(30), 30 * BALANCE.boss.hpPerLevel);
});
