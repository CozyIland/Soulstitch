// Werte eines zusammengenähten Körpers. Reine Logik ohne Browser, damit sie testbar ist.
import { PART, SLOTS, BALANCE } from '../data/index.ts';
import type { Equip, Part, Slot } from '../data/index.ts';
import { ABILITY_IDS } from './constants.ts';
import type { AbilityId } from './constants.ts';

export interface Inventory { own: Record<string, number>; eq: Equip }

/** Arme und Beine kann man zweimal besitzen (für beide Seiten), alles andere einmal. */
export const maxOwn = (q: Part): number => (q.typ === 'arm' || q.typ === 'bein' ? 2 : 1);

/** Startteile (Preis 0) gibt es unbegrenzt. */
export const owned = (inv: Inventory, id: string): number => (PART[id].p === 0 ? 99 : inv.own[id] | 0);

/** Darf Teil q in Platz sl? Es muss genug Stück geben, die nicht schon in einem anderen Platz stecken. */
export const canEquip = (inv: Inventory, sl: Slot, q: Part): boolean =>
  owned(inv, q.id) > SLOTS.filter((s) => s.k !== sl.k && inv.eq[s.k] === q.id).length;

export interface Stats {
  hp: number; speed: number; fr: number; dmg: number; bs: number; life: number;
  dcd: number; jmp: number; twin: boolean; home: boolean; horn: boolean;
  inv: number; rage: boolean; leech: number;
  size: number; weight: number;           // Summen über alle Teile
  arch: Record<AbilityId, number>;        // Archetyp-Punkte
  lvl: Record<AbilityId, 0 | 1 | 2>;      // 0 = fehlt, 1 = vorhanden, 2 = verstärkt
  parry: number;      // Paraden-Fenster (Sekunden)
  blockMove: number;  // Lauftempo beim Blocken
  dodgeInv: number;   // Unverwundbarkeit beim Dash
}

type NumKey = 'hp' | 'sp' | 'fr' | 'dmg' | 'bs' | 'life' | 'dcd' | 'jmp' | 'inv' | 'leech';
type FlagKey = 'twin' | 'home' | 'horn' | 'rage';

/** Stufe einer Fähigkeit aus ihren Archetyp-Punkten */
export const levelOf = (pts: number): 0 | 1 | 2 =>
  pts >= BALANCE.archetype.level2 ? 2 : pts >= BALANCE.archetype.level1 ? 1 : 0;

export function computeStats(eq: Equip): Stats {
  const B = BALANCE.player, BD = BALANCE.body, AR = BALANCE.archetype;
  const E = SLOTS.map((sl) => PART[eq[sl.k]]);
  const sum = (f: NumKey) => E.reduce((a, q) => a + (q[f] || 0), 0);
  const has = (f: FlagKey) => E.some((q) => !!q[f]);
  const size = E.reduce((a, q) => a + q.size, 0), weight = E.reduce((a, q) => a + q.weight, 0);
  const arch = { block: 0, jump: 0, dodge: 0 } as Record<AbilityId, number>;
  for (const q of E) if (q.arch) arch[q.arch] += q.pts || 1;
  const lvl = { block: levelOf(arch.block), jump: levelOf(arch.jump), dodge: levelOf(arch.dodge) };
  // Masse gibt Herzen, Gewicht kostet Tempo und Sprunghöhe
  const massHp = Math.max(0, Math.floor((size - BD.baseSize) / BD.sizePerHeart));
  const wSpeed = Math.max(BD.minSpeed, BD.speedAtBase - BD.speedPerWeight * (weight - BD.baseWeight));
  const wJump = Math.max(BD.minJump, Math.min(1.1, 1 - BD.jumpPerWeight * (weight - BD.baseWeight)));
  return {
    hp: B.hp + massHp + sum('hp'),
    speed: B.speed * Math.max(0.4, wSpeed + sum('sp')),
    fr: Math.max(0.3, 1 + sum('fr')),
    dmg: 1 + sum('dmg'),
    bs: B.bulletSpeed * (1 + sum('bs')),
    life: B.bulletLife * (1 + sum('life')),
    dcd: B.dashCooldown * Math.max(0.3, 1 - sum('dcd')) * (lvl.dodge === 2 ? AR.dodge2.cooldownFactor : 1),
    jmp: wJump * (1 + sum('jmp')),
    twin: has('twin'), home: has('home'), horn: has('horn'),
    inv: sum('inv'), rage: has('rage'), leech: sum('leech'),
    size, weight, arch, lvl,
    parry: lvl.block === 2 ? AR.block2.parryWindow : BALANCE.block.parryWindow,
    blockMove: lvl.block === 2 ? AR.block2.moveFactor : BALANCE.block.moveFactor,
    dodgeInv: 0.32 + (lvl.dodge === 2 ? AR.dodge2.extraInvulnerability : 0),
  };
}

/**
 * Welche Fähigkeiten sind aktiv? Der Körper bringt die mit, deren Archetyp-Punkte reichen;
 * davon sind höchstens `limit` gleichzeitig aktiv. Gewählte (sel) zuerst, dann die stärksten.
 */
export function chooseAbilities(st: Stats, limit: number, sel: readonly AbilityId[] = []): AbilityId[] {
  const avail = ABILITY_IDS.filter((id) => st.lvl[id] > 0);
  const order = [...sel.filter((id) => avail.includes(id)), ...avail.filter((id) => !sel.includes(id)).sort((a, b) => st.arch[b] - st.arch[a])];
  return order.slice(0, Math.max(0, limit));
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
