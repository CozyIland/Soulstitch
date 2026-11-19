// Der Spielstand dieses Browsers und der Testmodus.
import { PART } from '../data/index.ts';
import { loadSave, writeSave, SAVE_VERSION } from './save.ts';
import type { SaveData } from './save.ts';
import { computeStats, maxOwn, chooseAbilities } from './stats.ts';
import type { Stats } from './stats.ts';
import { ABILITY_IDS } from './constants.ts';
import type { AbilityId } from './constants.ts';

const storage: Storage | null = (() => { try { return window.localStorage; } catch { return null; } })();

export const prof = {
  save: loadSave(storage) as SaveData,
  test: false,  // Testmodus: alle Teile frei, unendlich Knochen, nichts wird gespeichert
  testFight: 0, // Start-Kampf im Testmodus (Index in TEST_FIGHTS)
  /** Debug: Fähigkeiten unabhängig vom Körper erzwingen (null = der Körper entscheidet) */
  abilityOverride: null as AbilityId[] | null,
};

export function persist(): void {
  if (prof.test || !storage) return;
  try { writeSave(storage, prof.save); } catch { /* Speicher voll oder gesperrt */ }
}

/** Ersetzt den Spielstand durch einen Test-Stand. Der echte Stand im Speicher bleibt unberührt. */
export function enterTestMode(): void {
  prof.test = true;
  prof.save = { v: SAVE_VERSION, best: prof.save.best, bones: 99999, own: {}, eq: { ...prof.save.eq }, limit: ABILITY_IDS.length, sel: [...prof.save.sel] };
  for (const id in PART) prof.save.own[id] = maxOwn(PART[id]);
}

export const bonesTxt = (): string => (prof.test ? '∞' : String(prof.save.bones));
export const stats = (): Stats => computeStats(prof.save.eq);

/** Die im Kampf aktiven Fähigkeiten: vom Körper bestimmt, bis zum Limit, gewählte zuerst */
export const activeAbilities = (st: Stats = stats()): AbilityId[] =>
  prof.abilityOverride ?? chooseAbilities(st, prof.save.limit, prof.save.sel);
