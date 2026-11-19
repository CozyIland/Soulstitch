// Ein Run: vom Verlassen des Abgrunds bis zum Tod oder Sieg.
// Abgrund → Run → Kampf → … → Run-Ende → Abgrund
import { BOSSES } from '../data/index.ts';
import { go } from './scenes.ts';

export interface Run {
  startBoss: number;
  boss: number;      // aktueller Boss (1-basiert)
  bones: number;     // in diesem Run verdiente Knochen
  won: number;       // gewonnene Kämpfe
  result: null | 'death' | 'victory';
}

export const R = {
  run: null as Run | null,
  last: null as Run | null, // zuletzt beendeter Run, für Auswertungen
};

export function startRun(startBoss = 1): void {
  R.run = { startBoss, boss: startBoss, bones: 0, won: 0, result: null };
  go('fight', startBoss);
}

/** Der Kampf ist gewonnen; die Belohnung ist schon gutgeschrieben. */
export function fightWon(bones: number): void {
  if (!R.run) return;
  R.run.bones += bones;
  R.run.won++;
}

/** Nach dem Sieg-Banner: nächster Boss oder Ende des Runs. */
export function nextFight(): void {
  if (!R.run) return;
  if (R.run.boss >= BOSSES.length) return endRun('victory');
  R.run.boss++;
  go('fight', R.run.boss);
}

export function endRun(result: 'death' | 'victory', abyssMessage?: string): void {
  if (R.run) { R.run.result = result; R.last = R.run; }
  R.run = null;
  if (result === 'victory') go('victory');
  else go('descent', abyssMessage);
}

/** Debug: Run abbrechen, ohne Ergebnis. */
export function abortRun(): void {
  R.run = null;
}
