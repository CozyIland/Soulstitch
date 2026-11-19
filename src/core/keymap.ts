// Tastenbelegung: welche Tasten (KeyboardEvent.code) welche Aktion auslösen.
// Reine Logik ohne Browser, damit sie testbar ist; gespeichert wird in core/bindings.ts.
import controls from '../data/controls.json' with { type: 'json' };

export type ActionId = 'left' | 'right' | 'jump' | 'attack' | 'block' | 'dodge' | 'pause';
/** Zwei Plätze pro Aktion; null = leer */
export type KeyMap = Record<ActionId, [string | null, string | null]>;

export const ACTIONS = controls.actions as { id: ActionId; name: string; keys: [string | null, string | null] }[];
export const ACTION_IDS = ACTIONS.map((a) => a.id);

/** Tasten, die nicht belegt werden können (Escape bleibt immer Pause/Zurück) */
export const RESERVED = ['Escape'];

export function defaultKeyMap(): KeyMap {
  const m = {} as KeyMap;
  for (const a of ACTIONS) m[a.id] = [a.keys[0] ?? null, a.keys[1] ?? null];
  return m;
}

/** Gespeicherte Belegung prüfen; Unbekanntes oder Kaputtes durch den Standard ersetzen */
export function sanitizeKeyMap(raw: unknown): KeyMap {
  const m = defaultKeyMap();
  if (typeof raw !== 'object' || raw === null) return m;
  const r = raw as Record<string, unknown>;
  const used = new Set<string>();
  for (const id of ACTION_IDS) {
    const v = r[id];
    if (!Array.isArray(v)) continue;
    const slots = [0, 1].map((i) => {
      const c = v[i];
      if (typeof c !== 'string' || !c || c.length > 32 || RESERVED.includes(c) || used.has(c)) return null;
      used.add(c);
      return c;
    }) as [string | null, string | null];
    m[id] = slots;
  }
  // Doppelte Tasten aus dem Standard entfernen, falls gespeicherte Belegung sie schon nutzt
  const seen = new Set<string>();
  for (const id of ACTION_IDS) for (const i of [0, 1]) {
    const c = m[id][i];
    if (c && seen.has(c)) m[id][i] = null;
    else if (c) seen.add(c);
  }
  return m;
}

/** Taste auf einen Platz legen. Hatte eine andere Aktion dieselbe Taste, wird sie dort entfernt. */
export function assignKey(m: KeyMap, action: ActionId, slot: 0 | 1, code: string | null): KeyMap {
  if (code && RESERVED.includes(code)) return m;
  const n = structuredClone(m);
  if (code) for (const id of ACTION_IDS) for (const i of [0, 1] as const) if (n[id][i] === code) n[id][i] = null;
  n[action][slot] = code;
  return n;
}

const NAMES: Record<string, string> = {
  Space: 'Leertaste', ShiftLeft: 'Shift', ShiftRight: 'Shift rechts', ControlLeft: 'Strg', ControlRight: 'Strg rechts',
  AltLeft: 'Alt', AltRight: 'Alt Gr', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
  Enter: 'Enter', NumpadEnter: 'Enter (Ziffernblock)', Tab: 'Tab', Backspace: 'Rücktaste', CapsLock: 'Feststell',
  Escape: 'Esc', Delete: 'Entf', Insert: 'Einfg', Home: 'Pos1', End: 'Ende', PageUp: 'Bild ↑', PageDown: 'Bild ↓',
  Comma: ',', Period: '.', Minus: 'ß', Slash: '-', Semicolon: 'Ö', Quote: 'Ä', BracketLeft: 'Ü', BracketRight: '+', Backquote: '^', IntlBackslash: '<',
};

/** Lesbarer Name einer Taste (deutsche Tastatur) */
export function keyLabel(code: string | null): string {
  if (!code) return '–';
  if (NAMES[code]) return NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code;
}
