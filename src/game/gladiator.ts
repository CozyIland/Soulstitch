// Der Gladiator: Nahkampf-Gegner mit drei klar angekündigten Angriffen.
//   Hieb        – von oben, blockbar.                  Antwort: blocken, ausweichen, zurückweichen
//   Fegeschlag  – flach am Boden, NICHT blockbar.      Antwort: springen, ausweichen, zurückweichen
//   Sturmangriff – rennt quer durch die Arena.         Antwort: drüberspringen, durchdashen, blocken
// Nach jedem Angriff folgt eine Erholung: das Fenster zum Zurückschlagen.
// Reine Logik ohne Browser; gezeichnet wird in render/gladiator.ts.
import { GY, AL, AR } from '../core/constants.ts';
import { rnd, clamp } from '../core/util.ts';
import type { Rect } from '../core/util.ts';
import { GLAD_ATTACKS } from '../data/index.ts';
import type { GladiatorDef, GladAttackId, GladAttack } from '../data/index.ts';

export type GladState = 'walk' | 'wait' | 'tele' | 'act' | 'rec' | 'stagger' | 'guard' | 'dead';

export interface Glad {
  def: GladiatorDef;
  x: number; f: number; vx: number;
  hp: number; max: number;
  state: GladState;
  t: number;        // Zeit im aktuellen Zustand
  dur: number;      // Dauer des aktuellen Zustands
  atk: GladAttackId | null; // laufender oder nächster Angriff
  next: GladAttackId;
  hitDone: boolean; // dieser Angriff hat schon getroffen (oder wurde abgewehrt)
  chained: boolean; // zweiter Angriff einer Kette
  recent: number;   // Treffer kurz hintereinander (Taumeln ab 3)
  recentT: number;
  flash: number;    // Aufblitzen nach Treffer
  walk: number;     // Laufphase für die Animation
}

/** Ereignisse, die das Kampfmodul in Ton und Effekte übersetzt */
export type GladEvent = 'tele' | 'swing' | 'charge' | 'wall' | 'guard' | 'clang' | 'stagger';

/** Ankündigung bei Ketten und Gegenhieb, relativ zur normalen (kürzer, aber noch reagierbar) */
export const QUICK_TELE = 0.85;
export const GLAD_HALF_W = 14;
export const GLAD_H = 62;

export function createGlad(def: GladiatorDef, x = 470): Glad {
  return {
    def, x, f: -1, vx: 0, hp: def.hp, max: def.hp,
    state: 'wait', t: 0, dur: 0.8, atk: null, next: pick(def),
    hitDone: false, chained: false, recent: 0, recentT: 0, flash: 0, walk: 0,
  };
}

const pick = (def: GladiatorDef): GladAttackId => def.attacks[Math.floor(Math.random() * def.attacks.length)];
export const attackDef = (g: Glad): GladAttack | null => (g.atk ? GLAD_ATTACKS[g.atk] : null);

/** Gewünschter Abstand zum Spieler, um den nächsten Angriff zu starten */
function wantDist(id: GladAttackId): [number, number] {
  return id === 'sturm' ? [110, 999] : [0, GLAD_ATTACKS[id].range - 8];
}

function setState(g: Glad, s: GladState, dur: number): void {
  g.state = s; g.t = 0; g.dur = dur;
}

function startAttack(g: Glad, id: GladAttackId, px: number, quick = false): void {
  g.atk = id;
  g.f = px >= g.x ? 1 : -1;
  g.hitDone = false;
  setState(g, 'tele', GLAD_ATTACKS[id].tele * g.def.teleScale * (quick ? QUICK_TELE : 1));
}

/** Debug/Tests: sofort einen bestimmten Angriff ankündigen */
export function forceAttack(g: Glad, id: GladAttackId, px: number): void {
  g.chained = true; // keine Kette anhängen
  startAttack(g, id, px);
}

/** Ein Schritt KI. px = x-Position der Spielfigur. Gibt Ereignisse für Ton/Effekte zurück. */
export function updateGlad(g: Glad, dt: number, px: number): GladEvent[] {
  const ev: GladEvent[] = [];
  g.t += dt;
  g.flash = Math.max(0, g.flash - dt);
  g.recentT -= dt;
  if (g.recentT <= 0) g.recent = 0;
  // Rückstoß
  g.x += g.vx * dt;
  g.vx *= Math.pow(0.002, dt);
  const d = px - g.x, ad = Math.abs(d);

  switch (g.state) {
    case 'wait':
      g.f = d >= 0 ? 1 : -1;
      if (g.t >= g.dur) setState(g, 'walk', 4);
      break;
    case 'walk': {
      g.f = d >= 0 ? 1 : -1;
      const [lo, hi] = wantDist(g.next);
      let dir = 0;
      if (ad > hi) dir = g.f;
      else if (ad < lo) dir = -g.f;
      // an der Wand gefangen oder zu lange gelaufen: einfach angreifen
      const stuck = dir === -g.f && (g.x < AL + 30 || g.x > AR - 30);
      if (dir === 0 || stuck || g.t > g.dur) { startAttack(g, g.next, px); ev.push('tele'); break; }
      g.x += dir * g.def.speed * (dir === g.f ? 1 : 0.8) * dt;
      g.walk += dt * g.def.speed * 0.09;
      break;
    }
    case 'tele':
      if (g.t >= g.dur) {
        const a = attackDef(g)!;
        setState(g, 'act', a.act);
        ev.push(g.atk === 'sturm' ? 'charge' : 'swing');
      }
      break;
    case 'act': {
      const a = attackDef(g)!;
      if (g.atk === 'sturm') {
        g.x += g.f * a.speed! * dt;
        if (g.x <= AL + GLAD_HALF_W || g.x >= AR - GLAD_HALF_W) { ev.push('wall'); endAttack(g); break; }
      }
      if (g.t >= g.dur) endAttack(g);
      break;
    }
    case 'rec':
    case 'stagger':
      if (g.t >= g.dur) { g.next = pick(g.def); setState(g, 'wait', rnd(g.def.pause[0], g.def.pause[1])); }
      break;
    case 'guard':
      g.f = d >= 0 ? 1 : -1;
      // nach dem Schild kommt sofort ein schneller Gegenhieb
      if (g.t >= g.dur) { startAttack(g, 'hieb', px, true); ev.push('tele'); }
      break;
  }
  g.x = clamp(g.x, AL + GLAD_HALF_W, AR - GLAD_HALF_W);
  return ev;

  function endAttack(gg: Glad): void {
    const a = attackDef(gg)!;
    if (!gg.chained && gg.atk !== 'sturm' && Math.random() < gg.def.chain) {
      gg.chained = true;
      startAttack(gg, pick(gg.def) === 'feger' ? 'feger' : 'hieb', px, true);
      ev.push('tele');
    } else {
      gg.chained = false;
      setState(gg, 'rec', a.rec);
    }
  }
}

/** Trefferfläche des laufenden Angriffs, nur während er aktiv ist */
export function gladAttackBox(g: Glad): Rect | null {
  if (g.state !== 'act' || g.hitDone) return null;
  const a = attackDef(g)!;
  if (g.atk === 'sturm') return { x: g.x - 16, y: GY - 44, w: 32, h: 44 };
  const x0 = g.f > 0 ? g.x + 4 : g.x - a.range;
  return a.low ? { x: x0, y: GY - 16, w: a.range - 4, h: 16 } : { x: x0, y: GY - 64, w: a.range - 4, h: 56 };
}

export const gladHurtbox = (g: Glad): Rect => ({ x: g.x - GLAD_HALF_W, y: GY - GLAD_H, w: GLAD_HALF_W * 2, h: GLAD_H });

/** Der Angriff wurde geblockt oder pariert: Sturmangriff prallt ab, Parade lässt taumeln. */
export function gladDeflected(g: Glad, parry: boolean): void {
  g.hitDone = true;
  if (parry) { stagger(g, 0.9); return; }
  if (g.atk === 'sturm') { g.vx = -g.f * 120; setState(g, 'rec', 0.8); }
}

export function stagger(g: Glad, dur: number): void {
  g.atk = null; g.chained = false; g.recent = 0;
  setState(g, 'stagger', dur);
}

/** Schaden durch die Spielfigur. Gibt zurück, ob er wirkte, und ein Ereignis (Schild, Taumeln). */
export function hurtGlad(g: Glad, dmg: number, dir: number, knock: number, heavy: boolean): { ok: boolean; ev?: GladEvent } {
  if (g.state === 'dead') return { ok: false };
  const fromFront = Math.sign(-dir) === g.f;
  if (g.state === 'guard' && fromFront) { g.vx = dir * knock * 0.4; return { ok: false, ev: 'clang' }; }
  g.hp = Math.max(0, g.hp - dmg);
  g.flash = 0.12;
  g.vx = dir * knock;
  if (g.hp <= 0) { setState(g, 'dead', 99); return { ok: true }; }
  g.recent++; g.recentT = 1.2;
  // Während der Ankündigung unterbricht nur ein schwerer Treffer; in der Erholung taumelt er leichter.
  if (heavy && g.state !== 'act') { stagger(g, 0.55); return { ok: true, ev: 'stagger' }; }
  if (g.recent >= 3 && (g.state === 'rec' || g.state === 'walk' || g.state === 'wait')) {
    if (Math.random() < g.def.guard) { setState(g, 'guard', 0.8); g.recent = 0; return { ok: true, ev: 'guard' }; }
    stagger(g, 0.45); return { ok: true, ev: 'stagger' };
  }
  return { ok: true };
}
