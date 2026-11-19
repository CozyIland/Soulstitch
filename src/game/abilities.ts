// Fähigkeits-Module: Blocken, Springen, Ausweichen.
// Alle haben dieselbe Schnittstelle. Welche aktiv sind, entscheidet später der Körper (Phase 2);
// bis dahin sind alle aktiv und lassen sich im Debug-Panel einzeln testen.
// Reine Logik ohne Browser, damit sie testbar ist.
import { BALANCE } from '../data/index.ts';
import type { Player } from './world.ts';
import type { Stats } from './stats.ts';

export type AbilityId = 'block' | 'jump' | 'dodge';
export const ABILITY_IDS: readonly AbilityId[] = ['block', 'jump', 'dodge'];

/** Was der Spieler in diesem Frame will – unabhängig davon, ob per Tastatur, Maus oder Touch. */
export interface Intent {
  move: number;          // -1, 0, 1
  jumpPressed: boolean;
  jumpHeld: boolean;
  dodgePressed: boolean;
  blockHeld: boolean;
  attackPressed: boolean;
  attackHeld: boolean;
  aimX: number | null;   // Zielpunkt (Maus/Touch), sonst null
  aimY: number | null;
}

/** Ein ankommender Treffer. x = woher er kommt (für Block von vorn). */
export interface IncomingHit { x: number; dmg: number; blockable: boolean }
export type HitResult = 'evade' | 'parry' | 'block' | 'hit';

export interface Ability {
  id: AbilityId;
  name: string;
  label: string; // Beschriftung des Touch-Knopfs
  /** Eingabe auswerten und Zustand der Spielfigur ändern */
  update(p: Player, intent: Intent, st: Stats, dt: number): void;
  /** Darf diese Fähigkeit den Treffer abwenden? null = nicht zuständig */
  onIncoming?(p: Player, hit: IncomingHit): HitResult | null;
}

export const JUMP: Ability = {
  id: 'jump', name: 'Springen', label: 'SPRUNG',
  update(p, intent, st) {
    if (intent.jumpPressed) p.jb = 0.12; // kurzer Puffer: etwas zu früh gedrückt zählt trotzdem
    if (p.jb > 0 && p.dashT <= 0 && !p.blocking && (p.gnd || (st.dbl && p.jumps < 2))) {
      p.vy = -BALANCE.player.jump * st.jmp;
      p.jumps = p.gnd ? 1 : 2;
      p.gnd = false;
      p.jb = 0;
    }
  },
};

export const DODGE: Ability = {
  id: 'dodge', name: 'Ausweichen', label: 'DASH',
  update(p, intent, st) {
    if (intent.dodgePressed && p.dcd <= 0 && p.dashT <= 0 && !p.blocking) {
      p.dashT = 0.22; p.iv = 0.32; p.dcd = st.dcd; p.horned = false;
      p.ddx = intent.move || p.mf;
      p.atk = null; // Ausweichen bricht einen Schlag ab
    }
  },
  onIncoming(p) {
    return p.iv > 0 ? 'evade' : null;
  },
};

export const BLOCK: Ability = {
  id: 'block', name: 'Blocken', label: 'BLOCK',
  update(p, intent, _st, dt) {
    const can = intent.blockHeld && p.gnd && p.dashT <= 0 && !p.atk;
    if (can && !p.blocking) p.blockT = 0;
    else if (can) p.blockT += dt;
    p.blocking = can;
  },
  onIncoming(p, hit) {
    if (!p.blocking || !hit.blockable) return null;
    const fromFront = hit.x === p.x || Math.sign(hit.x - p.x) === p.f;
    if (!fromFront) return null;
    return p.blockT <= BALANCE.block.parryWindow ? 'parry' : 'block';
  },
};

export const ABILITIES: Record<AbilityId, Ability> = { block: BLOCK, jump: JUMP, dodge: DODGE };

/** Entscheidet, was ein Treffer bewirkt: Ausweichen vor Block vor Treffer. */
export function resolveHit(p: Player, hit: IncomingHit, active: readonly AbilityId[]): HitResult {
  for (const id of ['dodge', 'block'] as const) {
    if (!active.includes(id)) continue;
    const r = ABILITIES[id].onIncoming?.(p, hit);
    if (r) return r;
  }
  return 'hit';
}
