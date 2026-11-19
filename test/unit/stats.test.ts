import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, canEquip, owned, bossReward, reach, bossMaxHp, chooseAbilities, levelOf } from '../../src/game/stats.ts';
import { defaultEquip } from '../../src/game/save.ts';
import { PART, PARTS, SLOTS, BALANCE } from '../../src/data/index.ts';
import type { Equip } from '../../src/data/index.ts';
import { ABILITY_IDS } from '../../src/game/constants.ts';

const slot = (k: string) => SLOTS.find((s) => s.k === k)!;
const body = (o: Partial<Equip>) => computeStats({ ...defaultEquip(), ...o });
const BLOCK_BODY: Partial<Equip> = { armL: 'a4', armR: 'a4' };
const JUMP_BODY: Partial<Equip> = { beinL: 'l3', beinR: 'l3' };

test('Grundkörper: ein Herz, ein Archetyp (Ausweichen über die Läuferbeine)', () => {
  const s = computeStats(defaultEquip());
  assert.equal(s.hp, BALANCE.player.hp);
  assert.equal(s.size, BALANCE.body.baseSize);
  assert.equal(s.weight, BALANCE.body.baseWeight);
  assert.equal(s.speed, BALANCE.player.speed * BALANCE.body.speedAtBase);
  assert.deepEqual(s.lvl, { block: 0, jump: 0, dodge: 1 });
  assert.equal(reach(s), 1);
});

test('kostenlose Starter-Teile machen jeden Archetyp möglich', () => {
  for (const id of ABILITY_IDS) {
    const free = SLOTS.map((sl) => PARTS[sl.t].filter((q) => q.p === 0 && q.arch === id).length).reduce((a, b) => a + b, 0);
    assert.ok(free > 0, `kein kostenloses Teil für ${id}`);
  }
  assert.equal(body(BLOCK_BODY).lvl.block, 1);
  assert.equal(body(JUMP_BODY).lvl.jump, 1);
});

test('Stufe II ab 4 Punkten: Doppelsprung, leichtere Parade, schnellerer Dash', () => {
  assert.equal(levelOf(1), 0); assert.equal(levelOf(2), 1); assert.equal(levelOf(4), 2);
  const j = body({ ...JUMP_BODY, kopf: 'k3', brust: 'b4' });
  assert.equal(j.lvl.jump, 2);
  const b = body({ ...BLOCK_BODY, brust: 'b1' });
  assert.equal(b.lvl.block, 2);
  assert.ok(b.parry > computeStats(defaultEquip()).parry);
  const d = body({ armL: 'a2', herz: 'h2' });
  assert.equal(d.lvl.dodge, 2);
  assert.ok(d.dcd < computeStats(defaultEquip()).dcd);
});

test('Block-Körper und Sprung-Körper spielen sich verschieden', () => {
  const b = body({ ...BLOCK_BODY, brust: 'b1', kopf: 'k2' });
  const j = body({ ...JUMP_BODY, brust: 'b4', kopf: 'k3' });
  assert.ok(b.hp > j.hp, 'Block-Körper hat mehr Herzen');
  assert.ok(j.speed > b.speed, 'Sprung-Körper ist schneller');
  assert.ok(j.jmp > b.jmp, 'Sprung-Körper springt höher');
});

test('Größe gibt Herzen, Gewicht kostet Tempo', () => {
  const colossus = body({ brust: 'b3' });
  assert.ok(colossus.hp > 1);
  assert.ok(colossus.speed < computeStats(defaultEquip()).speed);
});

test('Fähigkeits-Limit: gewählte zuerst, sonst die stärkste, höchstens N', () => {
  const s = body({ ...BLOCK_BODY, beinL: 'l0', beinR: 'l0' }); // Block 2, Ausweichen 2
  assert.equal(chooseAbilities(s, 1).length, 1);
  assert.deepEqual(chooseAbilities(s, 1, ['dodge']), ['dodge']);
  assert.deepEqual(chooseAbilities(s, 1, ['block']), ['block']);
  assert.deepEqual(chooseAbilities(s, 3).sort(), ['block', 'dodge']);
  assert.deepEqual(chooseAbilities(s, 1, ['jump']).length, 1); // nicht vorhandene Wahl wird übergangen
  assert.ok(!chooseAbilities(s, 1, ['jump']).includes('jump'));
});

test('Arme wirken pro Stück: zwei Kanonenarme verdoppeln den Bonus', () => {
  assert.equal(body({ armR: 'a3' }).dmg, 1.5);
  const two = body({ armL: 'a3', armR: 'a3' });
  assert.equal(two.dmg, 2);
  assert.ok(Math.abs(two.fr - 0.7) < 1e-9);
});

test('Ein gekaufter Arm passt nur an eine Seite', () => {
  const inv = { own: { a3: 1 }, eq: { ...defaultEquip(), armL: 'a3' } };
  assert.equal(canEquip(inv, slot('armR'), PART.a3), false);
  assert.equal(canEquip(inv, slot('armL'), PART.a3), true);
  inv.own.a3 = 2;
  assert.equal(canEquip(inv, slot('armR'), PART.a3), true);
});

test('Startteile gibt es unbegrenzt', () => {
  assert.ok(owned({ own: {}, eq: defaultEquip() }, 'a4') > 2);
  assert.equal(owned({ own: {}, eq: defaultEquip() }, 'a3'), 0);
});

test('jedes Teil hat Größe, Gewicht und gültigen Archetyp', () => {
  for (const q of Object.values(PART)) {
    assert.ok(q.size >= 0 && q.weight >= 0, q.id);
    if (q.arch) assert.ok((ABILITY_IDS as readonly string[]).includes(q.arch), q.id);
    assert.ok(q.look || q.typ === 'herz', `${q.id}: Aussehen fehlt`);
  }
});

test('Belohnung: Grundwert + Boss-Nummer, Bonus ohne Treffer', () => {
  const R = BALANCE.rewards;
  assert.equal(bossReward(1, true), R.base + R.perBoss);
  assert.equal(bossReward(5, false), R.base + 5 * R.perBoss + R.noHitBonus);
  assert.equal(bossMaxHp(30), 30 * BALANCE.boss.hpPerLevel);
});
