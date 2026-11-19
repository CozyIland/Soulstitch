// Spielinhalte als Daten. Diese Datei typisiert die JSON-Dateien und bereitet sie auf;
// neue Teile, Bosse oder Texte werden in den JSON-Dateien ergänzt, nicht hier.
import partsJson from './parts.json' with { type: 'json' };
import bossesJson from './bosses.json' with { type: 'json' };
import balanceJson from './balance.json' with { type: 'json' };
import textsJson from './texts.json' with { type: 'json' };
import type { AttackName, MoveName, ShapeName } from '../game/constants.ts';

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

/** Ersetzt {platzhalter} in einem Text. */
export function fmt(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
