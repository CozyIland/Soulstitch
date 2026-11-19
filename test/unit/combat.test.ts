// Kampflogik ohne Browser: Treffer-Auflösung der Fähigkeiten und der Gladiator.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveHit, ABILITY_IDS, JUMP, DODGE, BLOCK } from '../../src/game/abilities.ts';
import type { Intent } from '../../src/game/abilities.ts';
import { createGlad, updateGlad, gladAttackBox, hurtGlad, forceAttack, gladDeflected } from '../../src/game/gladiator.ts';
import { overlap, playerBox } from '../../src/game/world.ts';
import type { Player } from '../../src/game/world.ts';
import { computeStats } from '../../src/game/stats.ts';
import { defaultEquip } from '../../src/game/save.ts';
import { GLADIATOR, GLADIATORS, GLAD_ATTACKS, RUN_FIGHTS, BALANCE } from '../../src/data/index.ts';
import { GY } from '../../src/core/constants.ts';

const player = (o: Partial<Player> = {}): Player => ({
  x: 260, y: GY, vy: 0, vx: 0, gnd: true, hp: 1, inv: 0, iv: 0, cd: 0, dcd: 0, dashT: 0, jb: 0,
  mf: 1, f: 1, run: 0, aim: 0, jumps: 0, hits: 0, horned: true, hurt: false,
  blocking: false, blockT: 0, atk: null, combo: 0, comboT: 0, buf: 0, ...o,
});
const intent = (o: Partial<Intent> = {}): Intent => ({
  move: 0, jumpPressed: false, jumpHeld: false, dodgePressed: false, blockHeld: false,
  attackPressed: false, attackHeld: false, aimX: null, aimY: null, ...o,
});
const st = computeStats(defaultEquip());
const all = ABILITY_IDS;

test('Treffer-Auflösung: Block nur von vorn und nur, wenn blockbar', () => {
  const p = player({ blocking: true, blockT: 0.5, f: 1 });
  assert.equal(resolveHit(p, { x: 300, dmg: 1, blockable: true }, all), 'block');
  assert.equal(resolveHit(p, { x: 200, dmg: 1, blockable: true }, all), 'hit');   // von hinten
  assert.equal(resolveHit(p, { x: 300, dmg: 1, blockable: false }, all), 'hit');  // Fegeschlag
  assert.equal(resolveHit(p, { x: 300, dmg: 1, blockable: true }, ['jump', 'dodge']), 'hit'); // Block nicht aktiv
});

test('Treffer-Auflösung: Parade im frühen Block-Fenster, Ausweichen schlägt alles', () => {
  assert.equal(resolveHit(player({ blocking: true, blockT: 0.05 }), { x: 300, dmg: 1, blockable: true }, all), 'parry');
  assert.equal(resolveHit(player({ iv: 0.2 }), { x: 300, dmg: 1, blockable: false }, all), 'evade');
  assert.equal(resolveHit(player({ iv: 0.2 }), { x: 300, dmg: 1, blockable: false }, ['block']), 'hit');
});

test('Fähigkeiten: Sprung nur vom Boden, Dash mit Abklingzeit, Block nur am Boden', () => {
  const p = player();
  JUMP.update(p, intent({ jumpPressed: true }), st, 1 / 60);
  assert.ok(p.vy < 0 && !p.gnd);
  const q = player();
  DODGE.update(q, intent({ dodgePressed: true }), st, 1 / 60);
  assert.ok(q.dashT > 0 && q.iv > 0 && q.dcd > 0);
  const r = player({ gnd: false });
  BLOCK.update(r, intent({ blockHeld: true }), st, 1 / 60);
  assert.equal(r.blocking, false);
});

test('Fegeschlag trifft am Boden, nicht im Sprung', () => {
  const g = createGlad(GLADIATOR.veteran, 320);
  forceAttack(g, 'feger', 260);
  while (g.state === 'tele') updateGlad(g, 1 / 60, 260);
  const box = gladAttackBox(g)!;
  assert.ok(box, 'Angriff aktiv');
  assert.ok(overlap(box, playerBox(player())));
  assert.ok(!overlap(box, playerBox(player({ y: GY - 40, gnd: false }))));
});

test('Gladiator: Ankündigung → Angriff → Erholung', () => {
  const g = createGlad(GLADIATOR.rekrut, 320);
  forceAttack(g, 'hieb', 260);
  assert.equal(g.state, 'tele');
  const seen = new Set<string>();
  for (let i = 0; i < 180; i++) { updateGlad(g, 1 / 60, 260); seen.add(g.state); }
  assert.ok(seen.has('act') && seen.has('rec'), [...seen].join());
  assert.equal(g.f, -1); // schaut zur Spielfigur
});

test('Gladiator: Parade lässt taumeln, Schild hält Treffer von vorn ab', () => {
  const g = createGlad(GLADIATOR.champion, 320);
  forceAttack(g, 'hieb', 260);
  gladDeflected(g, true);
  assert.equal(g.state, 'stagger');
  g.state = 'guard'; g.f = -1;
  const front = hurtGlad(g, 1, 1, 50, false);   // Schlag von links (Spieler links, Schlag nach rechts)
  assert.equal(front.ok, false);
  const back = hurtGlad(g, 1, -1, 50, false);   // von hinten
  assert.equal(back.ok, true);
});

test('Gladiator: drei schnelle Treffer oder ein schwerer Treffer unterbrechen', () => {
  const g = createGlad(GLADIATOR.rekrut, 320); // Rekrut hebt nie den Schild
  g.state = 'rec';
  hurtGlad(g, 1, 1, 50, false); hurtGlad(g, 1, 1, 50, false);
  const r = hurtGlad(g, 1, 1, 50, false);
  assert.equal(r.ev, 'stagger');
  const h = createGlad(GLADIATOR.rekrut, 320);
  h.state = 'walk';
  assert.equal(hurtGlad(h, 2, 1, 170, true).ev, 'stagger');
});

test('Daten: Gladiatoren, Angriffe und Kampf-Reihenfolge sind gültig', () => {
  assert.ok(RUN_FIGHTS.length > 0);
  for (const f of RUN_FIGHTS) assert.ok(f.kind === 'gladiator' && GLADIATOR[f.id], JSON.stringify(f));
  for (const g of GLADIATORS) {
    assert.ok(g.hp > 0 && g.speed > 0 && g.bones >= 0, g.id);
    assert.ok(g.pause[0] <= g.pause[1], g.id);
    for (const a of g.attacks) assert.ok(GLAD_ATTACKS[a], `${g.id}: ${a}`);
  }
  for (const [id, a] of Object.entries(GLAD_ATTACKS)) {
    assert.ok(a.tele > 0 && a.act > 0 && a.rec > 0, id);
    assert.ok(!(a.low && a.blockable), `${id}: tiefe Angriffe sollen nicht blockbar sein`);
  }
  assert.equal(BALANCE.melee.combo.length, 3);
});
