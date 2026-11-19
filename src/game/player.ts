// Die Spielfigur im Kampf: Bewegung, Fähigkeits-Module, Nahkampf-Combo, Magie-Schüsse (nur alte Bosse)
// und ihre Darstellung.
import { ctx } from '../core/canvas.ts';
import { GY, AL, AR } from '../core/constants.ts';
import { rnd, clamp } from '../core/util.ts';
import { G } from '../core/state.ts';
import { beep } from '../core/audio.ts';
import { K, KP, mouse, touch } from '../core/input.ts';
import { circ } from '../render/draw.ts';
import { drawBody } from '../render/body.ts';
import { BALANCE } from '../data/index.ts';
import { prof } from './profile.ts';
import { reach } from './stats.ts';
import type { Stats } from './stats.ts';
import { ABILITIES } from './abilities.ts';
import type { Intent, AbilityId } from './abilities.ts';
import { world, pb, overlap, playerBox, burst } from './world.ts';
import type { Player, Rect } from './world.ts';

export function newPlayer(st: Stats): Player {
  return {
    x: 140, y: GY, vy: 0, vx: 0, gnd: true, hp: st.hp, inv: 0, iv: 0, cd: 0, dcd: 0, dashT: 0, jb: 0,
    mf: 1, f: 1, run: 0, aim: 0, jumps: 0, hits: 0, horned: true, hurt: false,
    blocking: false, blockT: 0, atk: null, combo: 0, comboT: 0, buf: 0,
  };
}

/** Eingaben aus Tastatur, Maus und Touch zu einer Absicht zusammenfassen */
export function readIntent(): Intent {
  let move = (K('KeyD', 'ArrowRight') ? 1 : 0) - (K('KeyA', 'ArrowLeft') ? 1 : 0);
  if (touch.joy && Math.abs(touch.joy.dx) > 0.25) move = Math.sign(touch.joy.dx);
  const aim = touch.mode ? touch.aim : mouse.down ? mouse : null;
  return {
    move,
    jumpPressed: KP('Space', 'KeyW', 'ArrowUp'),
    jumpHeld: K('Space', 'KeyW', 'ArrowUp'),
    dodgePressed: KP('ShiftLeft', 'ShiftRight', 'KeyL'),
    blockHeld: K('KeyK', 'KeyS', 'ArrowDown') || mouse.rdown,
    attackPressed: KP('KeyJ', 'KeyX') || (!touch.mode && mouse.click),
    attackHeld: K('KeyJ', 'KeyX') || mouse.down || !!touch.aim,
    aimX: aim ? aim.x : null,
    aimY: aim ? aim.y : null,
  };
}

type SwingDef = (typeof BALANCE.melee.combo)[number] & { heavy?: boolean };
const swingDef = (i: number): SwingDef => (i < 0 ? BALANCE.melee.air : BALANCE.melee.combo[i]) as SwingDef;
const swingLen = (d: SwingDef) => d.startup + d.active + d.recovery;

/** Trefferzone des Schlags vor der Figur */
export function swingBox(p: Player, st: Stats): Rect {
  const R = BALANCE.melee.reach * reach(st), air = p.atk && p.atk.i < 0;
  const y = air ? p.y - 44 : p.y - 42, h = air ? 50 : 38;
  return p.f > 0 ? { x: p.x + 2, y, w: R, h } : { x: p.x - 2 - R, y, w: R, h };
}

export interface UpdateOpts { magic: boolean; canAct: boolean; active: readonly AbilityId[] }

export function updatePlayer(p: Player, st: Stats, intent: Intent, dt: number, o: UpdateOpts): void {
  const rage = st.rage && p.hp === 1, spd = st.speed * (rage ? 1.4 : 1);
  const foe = world.foe;
  p.inv -= dt; p.iv -= dt; p.cd -= dt; p.dcd -= dt; p.jb -= dt; p.comboT -= dt; p.buf -= dt;
  p.vx *= Math.pow(0.004, dt);

  const wasDash = p.dashT > 0, jumpsBefore = p.jumps;
  if (o.canAct) for (const id of o.active) ABILITIES[id].update(p, intent, st, dt);
  if (!wasDash && p.dashT > 0) beep(700, .08, 'square', .04, 400);
  if (p.jumps > jumpsBefore) {
    beep(p.jumps > 1 ? 480 : 380, .07, 'square', .03, 260);
    if (p.jumps > 1) for (let i = 0; i < 6; i++) G.fx.push({ x: p.x + rnd(-6, 6), y: p.y, vx: rnd(-50, 50), vy: rnd(10, 60), life: .3, col: '#8fd08f', r: 2 });
  }
  if (!o.active.includes('block')) p.blocking = false;
  if (p.blocking && foe) p.f = foe.x >= p.x ? 1 : -1;

  if (p.dashT > 0) {
    // Ausweichen: schneller Dash mit Unverwundbarkeit
    p.dashT -= dt; p.x += p.ddx * 460 * dt; p.vy = 0;
    if (st.horn && !p.horned && foe && !foe.hidden && overlap(playerBox(p), foe.box())) {
      p.horned = true;
      if (foe.hurt(3, p.ddx, 120, true)) { G.hitstop = BALANCE.hitstop.heavy; beep(160, .15, 'sawtooth', .07); }
    }
    G.fx.push({ x: p.x, y: p.y - 17 + rnd(-10, 10), vx: 0, vy: 0, life: .22, col: '#55ffff', r: 3 });
  } else {
    let mx = intent.move;
    if (p.atk && p.gnd) mx *= 0.25;
    if (p.blocking) mx *= BALANCE.block.moveFactor;
    p.x += mx * spd * dt;
    if (mx) { p.run += dt * spd * 0.085; p.mf = Math.sign(mx); } else p.run = 0;
    if (!p.atk && !p.blocking && !o.magic && intent.move) p.f = Math.sign(intent.move);
    const wasAir = !p.gnd;
    p.vy += BALANCE.player.gravity * dt * (p.vy < 0 && !intent.jumpHeld ? 2.6 : 1);
    p.y += p.vy * dt;
    if (p.y >= GY) {
      p.y = GY; p.vy = 0;
      if (wasAir) {
        p.gnd = true; p.jumps = 0;
        if (p.atk && p.atk.i < 0) p.atk = null; // Luftangriff endet bei der Landung
        for (let i = 0; i < 4; i++) G.fx.push({ x: p.x + rnd(-6, 6), y: GY, vx: rnd(-40, 40), vy: rnd(-30, 0), life: .25, col: '#8a6a50', r: 2 });
      }
    }
  }
  p.x = clamp(p.x + p.vx * dt, AL + 8, AR - 8);

  if (o.magic) shoot(p, st, intent, o.canAct, rage);
  else melee(p, st, intent, dt, o.canAct, rage);
}

function melee(p: Player, st: Stats, intent: Intent, dt: number, canAct: boolean, rage: boolean): void {
  if (canAct && intent.attackPressed) p.buf = BALANCE.melee.buffer;
  // neuen Schlag beginnen (auch aus dem Puffer, sobald der letzte vorbei ist)
  if (!p.atk && p.buf > 0 && canAct && p.dashT <= 0 && !p.blocking) {
    const i = !p.gnd ? -1 : p.comboT > 0 ? p.combo : 0;
    if (intent.aimX !== null) p.f = intent.aimX >= p.x ? 1 : -1;
    else if (intent.move) p.f = Math.sign(intent.move);
    p.atk = { i, t: 0, speed: st.fr * (rage ? 1.4 : 1), hit: false };
    p.buf = 0;
    if (i === 2) p.vx += p.f * 110;
    beep(i === 2 ? 260 : 420 + i * 60, .06, 'triangle', .04, i === 2 ? -120 : 200);
  }
  const a = p.atk;
  if (!a) return;
  const d = swingDef(a.i);
  a.t += dt * a.speed;
  const foe = world.foe;
  if (!a.hit && a.t >= d.startup && a.t < d.startup + d.active && foe && !foe.hidden && overlap(swingBox(p, st), foe.box())) {
    a.hit = true;
    const heavy = !!d.heavy;
    if (foe.hurt(d.dmg * st.dmg, p.f, d.knock, heavy)) {
      G.hitstop = heavy ? BALANCE.hitstop.heavy : BALANCE.hitstop.light;
      G.shake = Math.max(G.shake, heavy ? 6 : 3);
      const hx = p.x + p.f * BALANCE.melee.reach * 0.8;
      burst(hx, p.y - 24, heavy ? 16 : 9, '#e8fbff', heavy ? 170 : 110);
      beep(heavy ? 150 : 230, .08, 'square', .06, -80);
      if (st.leech && ++p.hits % st.leech === 0 && p.hp < st.hp) {
        p.hp++; burst(p.x, p.y - 17, 12, '#40e0ff'); beep(880, .12, 'sine', .06, 300);
      }
    } else {
      // abgewehrt (Schild): Funken, kurzer Rückstoß
      G.hitstop = BALANCE.hitstop.light; p.vx -= p.f * 120;
      burst(p.x + p.f * 22, p.y - 26, 8, '#ffd27a', 120); beep(1200, .05, 'square', .04, -400);
    }
  }
  if (a.t >= swingLen(d)) {
    p.combo = a.i < 0 ? 0 : (a.i + 1) % BALANCE.melee.combo.length;
    p.comboT = a.i === BALANCE.melee.combo.length - 1 ? 0 : BALANCE.melee.comboReset;
    p.atk = null;
  }
}

/** Magie-Schüsse – im Moment nur gegen die alten Bosse (Vorschau auf Akt II) */
function shoot(p: Player, st: Stats, intent: Intent, canAct: boolean, rage: boolean): void {
  const foe = world.foe;
  const a = intent.aimX !== null ? Math.atan2(intent.aimY! - (p.y - 25), intent.aimX - p.x)
    : touch.mode ? (p.mf < 0 ? Math.PI : 0) : Math.atan2(foe.y - (p.y - 25), foe.x - p.x);
  p.aim = a; p.f = Math.cos(a) >= 0 ? 1 : -1;
  if (canAct && intent.attackHeld && p.cd <= 0 && !p.blocking) {
    for (const o of st.twin ? [-.1, .1] : [0]) pb.push({ x: p.x + Math.cos(a) * 12, y: p.y - 25 + Math.sin(a) * 12, vx: Math.cos(a + o) * st.bs, vy: Math.sin(a + o) * st.bs, life: st.life, dmg: st.dmg, home: st.home });
    p.cd = BALANCE.player.fireCooldown / st.fr / (rage ? 1.4 : 1);
    beep(st.dmg > 1 ? 180 : 660, .05, 'square', .03, st.dmg > 1 ? -60 : -200);
  }
}

// ---------- Darstellung ----------
/** Armwinkel (in Blickrichtung) für jeden Combo-Schritt: von → bis */
const SWING_ARC: Record<number, [number, number]> = { [-1]: [-1.6, 1.4], 0: [-1.3, 0.7], 1: [0.8, -1.0], 2: [-2.1, 1.0] };

export function drawPlayer(p: Player, st: Stats, magic: boolean): void {
  // Blinken in der Schutzzeit nach einem Treffer
  if (p.inv > 0 && (G.time * 16 | 0) % 2) return;
  let aim: number | undefined = magic ? p.aim : undefined, arc: [number, number, number] | null = null;
  const toWorld = (a: number) => (p.f > 0 ? a : Math.PI - a);
  if (!magic && p.atk) {
    const d = swingDef(p.atk.i), [a0, a1] = SWING_ARC[p.atk.i];
    const k = clamp(p.atk.t / (d.startup + d.active), 0, 1), e = 1 - (1 - k) * (1 - k);
    aim = toWorld(a0 + (a1 - a0) * e);
    if (p.atk.t >= d.startup * 0.6 && p.atk.t < d.startup + d.active + 0.06) arc = [a0, a0 + (a1 - a0) * e, p.atk.i];
  } else if (!magic && p.blocking) aim = toWorld(-0.35);
  drawBody(p.x, p.y, 1.2, prof.save.eq, { f: p.f, run: p.run, air: !p.gnd, aim, flash: p.dashT > 0 });

  // Schlagspur
  if (arc) {
    const R = BALANCE.melee.reach * reach(st) * 0.9, heavy = arc[2] === 2, cx = p.x, cy = p.y - 26;
    const s0 = toWorld(arc[0]), s1 = toWorld(arc[1]);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [w, col] of [[heavy ? 11 : 7, 'rgba(90,220,255,.35)'], [heavy ? 4 : 2.5, '#e8fbff']] as [number, string][]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
      ctx.arc(cx, cy, R, Math.min(s0, s1), Math.max(s0, s1)); ctx.stroke();
    }
    ctx.restore();
  }
  // Block: Schutzbogen vor der Figur, hell im Paraden-Fenster
  if (!magic && p.blocking) {
    const parry = p.blockT <= BALANCE.block.parryWindow;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const cx = p.x + p.f * 4, cy = p.y - 22, a = p.f > 0 ? 0 : Math.PI, r = 19;
    ctx.fillStyle = parry ? 'rgba(200,250,255,.28)' : 'rgba(90,200,255,.16)';
    ctx.beginPath(); ctx.arc(cx, cy, r, a - 1.15, a + 1.15); ctx.arc(cx, cy, r - 7, a + 1.15, a - 1.15, true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = parry ? 'rgba(235,255,255,.95)' : 'rgba(120,225,255,.8)'; ctx.lineWidth = parry ? 3.5 : 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, a - 1.15, a + 1.15); ctx.stroke();
    if (parry) circ(ctx, cx + p.f * r, cy, 2.8, '#fff');
    ctx.restore();
  }
}
