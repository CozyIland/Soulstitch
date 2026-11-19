import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSave, writeSave, sanitize, defaultSave, SAVE_KEY, SAVE_VERSION, LEGACY_KEYS } from '../../src/game/save.ts';

/** Ein Speicher wie localStorage, nur im Arbeitsspeicher */
function memStore(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

test('ohne Speicher gibt es einen leeren Stand', () => {
  assert.deepEqual(loadSave(null), defaultSave());
  assert.deepEqual(loadSave(memStore()), defaultSave());
});

test('Stand v2 (Prototyp 0.3) wird übernommen', () => {
  const v2 = { best: 12, bones: 140, run: 1, own: { a3: 2, k2: 1 }, eq: { kopf: 'k2', brust: 'b0', herz: 'h0', armL: 'a3', armR: 'a3', beinL: 'l0', beinR: 'l0' } };
  const s = loadSave(memStore({ [LEGACY_KEYS.v2]: JSON.stringify(v2) }));
  assert.equal(s.v, SAVE_VERSION);
  assert.equal(s.best, 12);
  assert.equal(s.bones, 140);
  assert.deepEqual(s.own, { a3: 2, k2: 1 });
  assert.equal(s.eq.kopf, 'k2');
  assert.equal(s.eq.armR, 'a3');
  assert.ok(!('run' in s));
});

test('Stand v1 (erster Prototyp): nur der Rekord bleibt', () => {
  const s = loadSave(memStore({ [LEGACY_KEYS.v1]: JSON.stringify({ best: 7, lo: { kopf: 2 } }) }));
  assert.equal(s.best, 7);
  assert.deepEqual(s.own, {});
  assert.deepEqual(s.eq, defaultSave().eq);
});

test('der neue Stand hat Vorrang vor alten', () => {
  const store = memStore({ [LEGACY_KEYS.v2]: JSON.stringify({ best: 3 }) });
  writeSave(store, { ...defaultSave(), best: 9 });
  assert.equal(loadSave(store).best, 9);
  assert.equal(JSON.parse(store.m.get(SAVE_KEY)!).v, SAVE_VERSION);
});

test('kaputte Daten führen nicht zum Absturz', () => {
  assert.deepEqual(loadSave(memStore({ [SAVE_KEY]: '{kaputt' })), defaultSave());
  const s = sanitize({ best: 'viel', bones: -5, own: { a3: 99, x9: 1, a0: 3 }, eq: { kopf: 'a3', armL: 'nix' } });
  assert.equal(s.best, 0);
  assert.equal(s.bones, 0);
  assert.deepEqual(s.own, { a3: 2 });  // unbekannte IDs und Startteile fallen weg, Anzahl begrenzt
  assert.equal(s.eq.kopf, 'k0');       // ein Arm passt nicht auf den Kopf
  assert.equal(s.eq.armL, 'a0');
});

test('nicht besessene Teile werden abgelegt', () => {
  const s = sanitize({ own: { a3: 1 }, eq: { armL: 'a3', armR: 'a3', kopf: 'k3' } });
  assert.equal(s.eq.armL, 'a3');
  assert.equal(s.eq.armR, 'a0'); // nur ein Kanonenarm gekauft
  assert.equal(s.eq.kopf, 'k0'); // Doppelschädel nie gekauft
});
