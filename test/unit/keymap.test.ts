import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultKeyMap, sanitizeKeyMap, assignKey, keyLabel, ACTION_IDS } from '../../src/core/keymap.ts';

test('Standardbelegung: jede Aktion hat eine Taste, keine doppelt', () => {
  const m = defaultKeyMap();
  const all = ACTION_IDS.flatMap((id) => m[id]).filter(Boolean);
  for (const id of ACTION_IDS) assert.ok(m[id][0], id);
  assert.equal(new Set(all).size, all.length);
});

test('Taste neu belegen entfernt sie bei der alten Aktion', () => {
  const m = assignKey(defaultKeyMap(), 'attack', 0, 'Space'); // Space war Springen
  assert.equal(m.attack[0], 'Space');
  assert.ok(!m.jump.includes('Space'));
  assert.equal(defaultKeyMap().jump[1], 'Space'); // Original unverändert
});

test('Escape lässt sich nicht belegen, Platz leeren geht', () => {
  const m = assignKey(defaultKeyMap(), 'jump', 0, 'Escape');
  assert.equal(m.jump[0], 'KeyW');
  assert.equal(assignKey(m, 'jump', 1, null).jump[1], null);
});

test('gespeicherte Belegung wird geprüft', () => {
  const m = sanitizeKeyMap({ jump: ['KeyU', 'KeyU'], attack: ['Escape', 42], block: 'kaputt' });
  assert.deepEqual(m.jump, ['KeyU', null]);       // doppelt → zweiter Platz leer
  assert.deepEqual(m.attack, [null, null]);        // Escape und Unsinn fallen weg
  assert.deepEqual(m.block, defaultKeyMap().block); // kaputter Eintrag → Standard
  assert.deepEqual(sanitizeKeyMap(null), defaultKeyMap());
});

test('Tastennamen sind lesbar', () => {
  assert.equal(keyLabel('KeyW'), 'W');
  assert.equal(keyLabel('Space'), 'Leertaste');
  assert.equal(keyLabel('ArrowLeft'), '←');
  assert.equal(keyLabel('Digit3'), '3');
  assert.equal(keyLabel(null), '–');
});
