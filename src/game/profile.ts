// Der Spielstand dieses Browsers und der Testmodus.
import { PART } from '../data/index.ts';
import { loadSave, writeSave, SAVE_VERSION } from './save.ts';
import type { SaveData } from './save.ts';
import { computeStats, maxOwn } from './stats.ts';
import type { Stats } from './stats.ts';

const storage: Storage | null = (() => { try { return window.localStorage; } catch { return null; } })();

export const prof = {
  save: loadSave(storage) as SaveData,
  test: false,  // Testmodus: alle Teile frei, unendlich Knochen, nichts wird gespeichert
  testBoss: 1,  // Start-Boss im Testmodus
};

export function persist(): void {
  if (prof.test || !storage) return;
  try { writeSave(storage, prof.save); } catch { /* Speicher voll oder gesperrt */ }
}

/** Ersetzt den Spielstand durch einen Test-Stand. Der echte Stand im Speicher bleibt unberührt. */
export function enterTestMode(): void {
  prof.test = true;
  prof.save = { v: SAVE_VERSION, best: prof.save.best, bones: 99999, own: {}, eq: { ...prof.save.eq } };
  for (const id in PART) prof.save.own[id] = maxOwn(PART[id]);
}

export const bonesTxt = (): string => (prof.test ? '∞' : String(prof.save.bones));
export const stats = (): Stats => computeStats(prof.save.eq);
