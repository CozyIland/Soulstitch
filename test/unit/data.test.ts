// Prüft die Inhalte in src/data/*.json, damit Tippfehler sofort auffallen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTS, PART, SLOTS, BOSSES, TEXTS } from '../../src/data/index.ts';
import { ATTACK_NAMES, MOVES, SHAPE_NAMES } from '../../src/game/constants.ts';

test('jeder Platz hat ein kostenloses Startteil an erster Stelle', () => {
  for (const sl of SLOTS) {
    assert.ok(PARTS[sl.t]?.length, `keine Teile für ${sl.t}`);
    assert.equal(PARTS[sl.t][0].p, 0, `${sl.t}: erstes Teil muss kostenlos sein`);
  }
});

test('Teile-IDs sind eindeutig und Preise nicht negativ', () => {
  const ids = Object.values(PARTS).flat().map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(PART[id].p >= 0, id);
});

test('Bosse nutzen nur bekannte Formen, Bewegungen und Angriffe', () => {
  assert.ok(BOSSES.length > 0);
  for (const b of BOSSES) {
    assert.ok((SHAPE_NAMES as readonly string[]).includes(b.shape), `${b.name}: Form ${b.shape}`);
    assert.ok((MOVES as readonly string[]).includes(b.move), `${b.name}: Bewegung ${b.move}`);
    assert.ok([1, 2, 3].includes(b.size), `${b.name}: Größe ${b.size}`);
    assert.ok(b.cooldown > 0, `${b.name}: Angriffspause`);
    assert.ok(b.attacks.length > 0, `${b.name}: keine Angriffe`);
    for (const [name, ...args] of b.attacks) {
      assert.ok((ATTACK_NAMES as readonly string[]).includes(name), `${b.name}: Angriff ${name}`);
      for (const a of args) assert.equal(typeof a, 'number', `${b.name}: ${name}`);
    }
  }
});

test('Intro hat Zeilen', () => {
  assert.ok(TEXTS.intro.length > 0);
  for (const page of TEXTS.intro) assert.ok(page.length > 0);
});
