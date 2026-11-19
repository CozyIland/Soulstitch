// Spielinhalte als Daten. Diese Datei typisiert die JSON-Dateien und bereitet sie auf;
// neue Teile, Bosse oder Texte werden in den JSON-Dateien ergänzt, nicht hier.
import partsJson from './parts.json' with { type: 'json' };
import bossesJson from './bosses.json' with { type: 'json' };
import balanceJson from './balance.json' with { type: 'json' };
import textsJson from './texts.json' with { type: 'json' };
import gladJson from './gladiators.json' with { type: 'json' };
import runJson from './run.json' with { type: 'json' };
import type { AttackName, MoveName, ShapeName, AbilityId } from '../game/constants.ts';

export type SlotType = 'kopf' | 'brust' | 'herz' | 'arm' | 'bein';
export type SlotKey = 'kopf' | 'brust' | 'herz' | 'armL' | 'armR' | 'beinL' | 'beinR';
export type Equip = Record<SlotKey, string>;

export interface Part {
  id: string;
  n: string; // Name
  d: string; // Beschreibung
  p: number; // Preis in Knochen (0 = Startteil)
  col: string;
  typ: SlotType;
  look?: string;   // Aussehen an der Figur (render/body.ts)
  size: number;    // Größe: mehr Masse = mehr Herzen
  weight: number;  // Gewicht: schwer = langsamer, springt niedriger
  arch?: AbilityId; // Archetyp, für den das Teil Punkte gibt
  pts?: number;
  hp?: number; sp?: number; fr?: number; dmg?: number; bs?: number; life?: number;
  dcd?: number; jmp?: number; inv?: number; leech?: number;
  home?: number; horn?: number; twin?: number; rage?: number;
}
export interface Slot { k: SlotKey; n: string; t: SlotType }

export interface BossDef {
  name: string;
  shape: ShapeName;
  color: string;
  accent: string;
  size: 1 | 2 | 3;
  speed: number;
  move: MoveName;
  cooldown: number;
  attacks: [AttackName, ...number[]][];
}

const types = partsJson.types as unknown as Record<SlotType, Omit<Part, 'typ'>[]>;
export const PARTS = {} as Record<SlotType, Part[]>;
export const PART: Record<string, Part> = {};
for (const t of Object.keys(types) as SlotType[]) {
  PARTS[t] = types[t].map((q) => ({ ...q, typ: t }));
  for (const q of PARTS[t]) PART[q.id] = q;
}
export const SLOTS = partsJson.slots as Slot[];
export const BOSSES = bossesJson as unknown as BossDef[];
export const BALANCE = balanceJson;
export const TEXTS = textsJson;

// ---------- Gladiatoren (Nahkampf-Gegner) ----------
export type GladAttackId = 'hieb' | 'feger' | 'sturm';
export interface GladAttack {
  name: string;
  tele: number;   // Ankündigung in Sekunden (wird mit teleScale des Gladiators multipliziert)
  act: number;    // aktive Zeit, in der der Angriff trifft
  rec: number;    // Erholung danach: hier ist der Gladiator verwundbar
  range: number;  // Reichweite nach vorn
  dmg: number;
  blockable: boolean;
  low: boolean;   // trifft nur am Boden: überspringen
  speed?: number; // nur Sturmangriff
}
export interface GladiatorDef {
  id: string; name: string; hp: number; speed: number; bones: number;
  pause: [number, number]; // Wartezeit zwischen Angriffen (min, max)
  teleScale: number;       // < 1 = kürzere Ankündigung
  guard: number;           // Wahrscheinlichkeit, nach Treffern den Schild zu heben
  chain: number;           // Wahrscheinlichkeit, direkt einen zweiten Angriff anzuhängen
  attacks: GladAttackId[];
  body: string; metal: string; accent: string;
}
export const GLAD_ATTACKS = gladJson.attacks as Record<GladAttackId, GladAttack>;
export const GLADIATORS = gladJson.gladiators as GladiatorDef[];
export const GLADIATOR: Record<string, GladiatorDef> = Object.fromEntries(GLADIATORS.map((g) => [g.id, g]));

// ---------- Kampf-Reihenfolge eines Runs ----------
/** Ein Kampf: ein Gladiator (Nahkampf) oder einer der alten Schuss-Bosse (Magie-Vorschau, nur im Testmodus). */
export type FightRef = { kind: 'gladiator'; id: string } | { kind: 'boss'; n: number };
export const RUN_FIGHTS: FightRef[] = runJson.fights.map((id) => ({ kind: 'gladiator', id }));

export function fightName(f: FightRef): string {
  return f.kind === 'gladiator' ? GLADIATOR[f.id].name : BOSSES[f.n - 1].name;
}

/** Ersetzt {platzhalter} in einem Text. */
export function fmt(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
