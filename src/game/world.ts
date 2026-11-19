// Alles, was während eines Kampfes in der Arena lebt: Spielfigur, Boss, Geschosse, Gefahrenzonen.
// Die Listen werden nur geleert (length = 0), nie ersetzt, damit alle Module dieselben sehen.
import { SP } from '../core/constants.ts';
import { TAU, rnd, clamp } from '../core/util.ts';
import { G } from '../core/state.ts';
import type { BossDef } from '../data/index.ts';
import type { Rect } from '../core/util.ts';
export type { Rect };

export interface Player {
  x: number; y: number; vy: number; gnd: boolean; hp: number;
  inv: number;  // Schutzzeit nach Treffer
  iv: number;   // Unverwundbarkeit beim Dash
  cd: number; dcd: number; dashT: number; jb: number;
  mf: number;   // letzte Laufrichtung
  f: number;    // Blickrichtung
  run: number; aim: number; jumps: number; hits: number;
  horned: boolean; hurt: boolean;
  ddx?: number; dieY?: number;
  vx: number;         // Rückstoß, klingt ab
  blocking: boolean; blockT: number; // Block gehalten / seit wann
  atk: MeleeSwing | null;            // laufender Nahkampfschlag
  combo: number;      // Index des nächsten Combo-Schlags
  comboT: number;     // Restzeit, in der die Combo weiterläuft
  buf: number;        // Eingabepuffer für den nächsten Schlag
}

/** Ein Nahkampfschlag: Ausholen → trifft → Erholung */
export interface MeleeSwing {
  i: number;          // Combo-Schritt 0..2, -1 = Luftangriff
  t: number;          // vergangene Zeit
  speed: number;      // Tempo-Faktor (Feuerrate-Boni)
  hit: boolean;       // hat in diesem Schlag schon getroffen
}

export const overlap = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Der aktuelle Gegner, gleich ob Gladiator oder alter Boss: für HUD, Zielen und Nahkampftreffer. */
export interface Foe {
  name: string; hp: number; max: number; accent: string;
  x: number; y: number;
  hidden: boolean;
  box(): Rect;
  /** Schaden nehmen; false, wenn abgewehrt (z. B. Schild). dir = Richtung des Stoßes */
  hurt(dmg: number, dir: number, knock: number, heavy: boolean): boolean;
}

export type BossMode = 'move' | 'tele' | 'charge' | 'leap' | 'hidden';
export interface Boss {
  def: BossDef; n: number; hp: number; max: number;
  vr: number; r: number; gnd: boolean;
  x: number; y: number; f: number; inv: number;
  atk: number; ai: number; timers: { t: number; fn: () => void }[];
  state: BossMode; st: number; dir: number; oa: number; bvx: number; bvy: number;
  ca?: number; cs?: number; cn?: number;           // Ansturm
  lt?: number; lx?: number; ly?: number; tx?: number; ty?: number; // Sprung / Teleport
  tn?: number;
}

export interface EnemyShot {
  x: number; y: number; vx: number; vy: number; r: number; life: number; col: string;
  home?: number; acc?: number; ax?: number; ay?: number; g?: number; stick?: number;
  bounce?: number; split?: number; wave?: number;
  orb?: { cx: number; cy: number; a: number; rad: number; da: number; dr: number };
}
export interface PlayerShot { x: number; y: number; vx: number; vy: number; life: number; dmg: number; home: boolean }
export type Hazard =
  | { k: 'col'; x: number; w: number; t: number; T: number; act: number; hit?: number }
  | { k: 'beam'; b: Boss; a: number; w: number; t: number; tele: number; act: number };

export const world = { p: null as unknown as Player, b: null as unknown as Boss, foe: null as unknown as Foe };
export const eb: EnemyShot[] = [];
export const pb: PlayerShot[] = [];
export const hz: Hazard[] = [];

export function clearArena(): void {
  eb.length = 0; pb.length = 0; hz.length = 0; G.fx.length = 0;
}

/** Winkel von o zur Körpermitte der Spielfigur */
export const aim = (o: { x: number; y: number }): number => Math.atan2(world.p.y - 17 - o.y, world.p.x - o.x);

export function shot(x: number, y: number, a: number, s: number, o?: Partial<EnemyShot>): void {
  s *= SP;
  eb.push(Object.assign({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 4.5, life: 9, col: '#ff5a4a' }, o));
}

export const after = (b: Boss, t: number, fn: () => void): void => { b.timers.push({ t, fn }); };

export function burst(x: number, y: number, n: number, col: string, sp = 100): void {
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU), s = rnd(sp * 0.2, sp);
    G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.2, 0.6), col, r: rnd(1.5, 3.5) });
  }
}

/** Trefferfläche der Spielfigur für Nahkampf-Angriffe */
export const playerBox = (p: Player): Rect => ({ x: p.x - 6, y: p.y - 34, w: 12, h: 32 });

/** Trefferfläche der Spielfigur gegen Geschosse: Rechteck gegen Kreis */
export function hitP(x: number, y: number, r: number): boolean {
  const p = world.p;
  const dx = x - clamp(x, p.x - 5, p.x + 5), dy = y - clamp(y, p.y - 30, p.y - 3);
  return dx * dx + dy * dy < r * r;
}
