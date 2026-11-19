// Speicherstand mit Versionsnummer. Ältere Stände werden beim Laden umgewandelt,
// unbekannte oder kaputte Werte durch sichere Standardwerte ersetzt.
// Reine Logik ohne Browser: der Speicher (localStorage) wird hereingereicht.
import { PARTS, PART, SLOTS, BALANCE } from '../data/index.ts';
import type { Equip } from '../data/index.ts';
import { canEquip, maxOwn } from './stats.ts';
import { ABILITY_IDS } from './constants.ts';
import type { AbilityId } from './constants.ts';

/** v4: Archetypen – Fähigkeits-Limit und gewählte Fähigkeiten */
export const SAVE_VERSION = 4;
export const SAVE_KEY = 'soulstitch-save';
/** v2: Leichenhaufen mit Knochen (Prototyp 0.3), v1: erster Prototyp, nur der Rekord zählt noch. */
export const LEGACY_KEYS = { v2: 'soulstitch2', v1: 'soulstitch' } as const;

export interface SaveData {
  v: number;
  best: number;
  bones: number;
  own: Record<string, number>;
  eq: Equip;
  limit: number;      // wie viele Fähigkeiten gleichzeitig aktiv sein dürfen
  sel: AbilityId[];   // im Abgrund gewählte Fähigkeiten (Vorrang bei der Auswahl)
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function defaultEquip(): Equip {
  const eq = {} as Equip;
  for (const sl of SLOTS) eq[sl.k] = PARTS[sl.t][0].id;
  return eq;
}

export function defaultSave(): SaveData {
  return { v: SAVE_VERSION, best: 0, bones: 0, own: {}, eq: defaultEquip(), limit: BALANCE.archetype.startLimit, sel: [] };
}

const int = (v: unknown, lo: number, hi: number): number => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Macht aus beliebigen Daten (v2, v3 oder v4) einen gültigen Speicherstand. */
export function sanitize(raw: unknown): SaveData {
  const s = defaultSave();
  if (!isObj(raw)) return s;
  s.best = int(raw.best, 0, 999);
  s.bones = int(raw.bones, 0, Number.MAX_SAFE_INTEGER);
  if (raw.limit !== undefined) s.limit = int(raw.limit, 1, ABILITY_IDS.length);
  if (Array.isArray(raw.sel)) s.sel = [...new Set(raw.sel)].filter((id): id is AbilityId => (ABILITY_IDS as readonly unknown[]).includes(id));
  if (isObj(raw.own)) {
    for (const id in PART) {
      const n = int(raw.own[id], 0, maxOwn(PART[id]));
      if (n > 0 && PART[id].p > 0) s.own[id] = n;
    }
  }
  if (isObj(raw.eq)) {
    // Platz für Platz übernehmen; was man nicht (oft genug) besitzt, wird durch das Startteil ersetzt.
    // canEquip zählt nur die schon übernommenen Plätze, also behält bei Knappheit der erste Platz das Teil.
    for (const sl of SLOTS) {
      const id = raw.eq[sl.k];
      if (typeof id === 'string' && PART[id] && PART[id].typ === sl.t && canEquip(s, sl, PART[id])) s.eq[sl.k] = id;
    }
  }
  return s;
}

function parse(text: string | null): unknown {
  if (text === null) return null;
  try { return JSON.parse(text); } catch { return null; }
}

/** Lädt den neuesten vorhandenen Stand; ältere Formate werden übernommen. */
export function loadSave(store: Store | null): SaveData {
  if (!store) return defaultSave();
  try {
    const cur = parse(store.getItem(SAVE_KEY));
    if (isObj(cur)) return sanitize(cur);
    const v2 = parse(store.getItem(LEGACY_KEYS.v2));
    if (isObj(v2)) return sanitize(v2);
    const v1 = parse(store.getItem(LEGACY_KEYS.v1));
    if (isObj(v1)) return { ...defaultSave(), best: int(v1.best, 0, 999) };
  } catch { /* Speicher gesperrt: mit leerem Stand weiterspielen */ }
  return defaultSave();
}

export function writeSave(store: Store, s: SaveData): void {
  store.setItem(SAVE_KEY, JSON.stringify({ ...s, v: SAVE_VERSION }));
}
