// Werte eines zusammengenähten Körpers. Reine Logik ohne Browser, damit sie testbar ist.
import { PART, SLOTS, BALANCE } from '../data/index.ts';
import type { Equip, Part, Slot } from '../data/index.ts';

export interface Inventory { own: Record<string, number>; eq: Equip }

export interface Stats {
  hp: number; speed: number; fr: number; dmg: number; bs: number; life: number;
  dcd: number; jmp: number; dbl: boolean; twin: boolean; home: boolean; horn: boolean;
  inv: number; rage: boolean; leech: number;
}

/** Arme und Beine kann man zweimal besitzen (für beide Seiten), alles andere einmal. */
export const maxOwn = (q: Part): number => (q.typ === 'arm' || q.typ === 'bein' ? 2 : 1);

/** Startteile (Preis 0) gibt es unbegrenzt. */
export const owned = (inv: Inventory, id: string): number => (PART[id].p === 0 ? 99 : inv.own[id] | 0);

/** Darf Teil q in Platz sl? Es muss genug Stück geben, die nicht schon in einem anderen Platz stecken. */
export const canEquip = (inv: Inventory, sl: Slot, q: Part): boolean =>
  owned(inv, q.id) > SLOTS.filter((s) => s.k !== sl.k && inv.eq[s.k] === q.id).length;

type NumKey = 'hp' | 'sp' | 'fr' | 'dmg' | 'bs' | 'life' | 'dcd' | 'jmp' | 'inv' | 'leech';
type FlagKey = 'twin' | 'home' | 'horn' | 'rage';

export function computeStats(eq: Equip): Stats {
  const B = BALANCE.player;
  const E = SLOTS.map((sl) => PART[eq[sl.k]]);
  const sum = (f: NumKey) => E.reduce((a, q) => a + (q[f] || 0), 0);
  const has = (f: FlagKey) => E.some((q) => !!q[f]);
  return {
    hp: B.hp + sum('hp'),
    speed: B.speed * Math.max(0.4, 1 + sum('sp')),
    fr: Math.max(0.3, 1 + sum('fr')),
    dmg: 1 + sum('dmg'),
    bs: B.bulletSpeed * (1 + sum('bs')),
    life: B.bulletLife * (1 + sum('life')),
    dcd: B.dashCooldown * Math.max(0.3, 1 - sum('dcd')),
    jmp: 1 + sum('jmp'),
    dbl: eq.beinL === 'l3' && eq.beinR === 'l3',
    twin: has('twin'), home: has('home'), horn: has('horn'),
    inv: sum('inv'), rage: has('rage'), leech: sum('leech'),
  };
}

/** Reichweite relativ zum Grundkörper (1 = 100 %). */
export const reach = (s: Stats): number =>
  (s.bs * s.life) / (BALANCE.player.bulletSpeed * BALANCE.player.bulletLife);

/** Knochen für einen besiegten Boss. */
export function bossReward(n: number, hurt: boolean): number {
  const R = BALANCE.rewards;
  return R.base + n * R.perBoss + (hurt ? 0 : R.noHitBonus);
}

export const bossMaxHp = (n: number): number => n * BALANCE.boss.hpPerLevel;
