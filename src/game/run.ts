// Ein Run: vom Verlassen des Abgrunds bis zum Tod oder Sieg.
// Abgrund → Run → Kampf → … → Run-Ende → Abgrund
import { RUN_FIGHTS, BOSSES } from '../data/index.ts';
import type { FightRef } from '../data/index.ts';
import { go } from './scenes.ts';

export interface Run {
  fights: FightRef[]; // Reihenfolge der Kämpfe
  i: number;          // aktueller Kampf (0-basiert)
  bones: number;      // in diesem Run verdiente Knochen
  won: number;        // gewonnene Kämpfe
  result: null | 'death' | 'victory';
}

export const R = {
  run: null as Run | null,
  last: null as Run | null, // zuletzt beendeter Run, für Auswertungen
};

/** Alle Kämpfe, die im Testmodus als Start gewählt werden können: Gladiatoren, dann die alten Schuss-Bosse. */
export const TEST_FIGHTS: FightRef[] = [
  ...RUN_FIGHTS,
  ...BOSSES.map((_, i) => ({ kind: 'boss' as const, n: i + 1 })),
];

/** Kampfliste ab einem gewählten Start: Gladiatoren laufen den normalen Run ab, alte Bosse die alte Boss-Reihe. */
export function fightsFrom(start: FightRef): FightRef[] {
  if (start.kind === 'boss') return BOSSES.map((_, i) => ({ kind: 'boss' as const, n: i + 1 })).slice(start.n - 1);
  const i = RUN_FIGHTS.findIndex((f) => f.kind === 'gladiator' && f.id === start.id);
  return RUN_FIGHTS.slice(Math.max(0, i));
}

export function startRun(fights: FightRef[] = RUN_FIGHTS): void {
  R.run = { fights, i: 0, bones: 0, won: 0, result: null };
  go('fight', fights[0]);
}

export const currentFight = (): FightRef | null => (R.run ? R.run.fights[R.run.i] : null);

/** Der Kampf ist gewonnen; die Belohnung ist schon gutgeschrieben. */
export function fightWon(bones: number): void {
  if (!R.run) return;
  R.run.bones += bones;
  R.run.won++;
}

/** Nach dem Sieg-Banner: nächster Kampf oder Ende des Runs. */
export function nextFight(): void {
  if (!R.run) return;
  if (R.run.i >= R.run.fights.length - 1) return endRun('victory');
  R.run.i++;
  go('fight', R.run.fights[R.run.i]);
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
