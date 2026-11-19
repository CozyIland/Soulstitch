// Die aktuelle Tastenbelegung dieses Browsers (getrennt vom Spielstand gespeichert)
// und Abfragen nach Aktionen statt nach festen Tasten.
import { keys, pressed, hooks } from './input.ts';
import { defaultKeyMap, sanitizeKeyMap, assignKey } from './keymap.ts';
import type { ActionId, KeyMap } from './keymap.ts';

const STORE_KEY = 'soulstitch-keys';
const storage: Storage | null = (() => { try { return window.localStorage; } catch { return null; } })();

function load(): KeyMap {
  try { const t = storage?.getItem(STORE_KEY); if (t) return sanitizeKeyMap(JSON.parse(t)); } catch { /* Standard */ }
  return defaultKeyMap();
}

export const bindings = { map: load() };
hooks.bound = (code) => Object.values(bindings.map).some((s) => s.includes(code));

function store(): void {
  try { storage?.setItem(STORE_KEY, JSON.stringify(bindings.map)); } catch { /* nicht speicherbar */ }
}

export function setKey(action: ActionId, slot: 0 | 1, code: string | null): void {
  bindings.map = assignKey(bindings.map, action, slot, code);
  store();
}

export function resetKeys(): void {
  bindings.map = defaultKeyMap();
  store();
}

/** Aktion gehalten? Touch-Knöpfe melden sich als virtuelle Taste 'v:<aktion>'. */
export const act = (id: ActionId): boolean =>
  keys.has('v:' + id) || bindings.map[id].some((c) => c !== null && keys.has(c));

/** Aktion in diesem Frame neu gedrückt? */
export const actP = (id: ActionId): boolean =>
  pressed.has('v:' + id) || bindings.map[id].some((c) => c !== null && pressed.has(c));
