// Zeichnung des Gladiators im gemeinsamen Stil: Umriss LW, Licht von oben links, Nähte.
// Die Pose ergibt sich aus Zustand und Fortschritt (g.t / g.dur) – jeder Angriff hat eine eigene,
// gut lesbare Ausholbewegung.
import { ctx } from '../core/canvas.ts';
import { GY, OUT, LW } from '../core/constants.ts';
import { TAU, clamp } from '../core/util.ts';
import { G } from '../core/state.ts';
import { circ, poly, rr, txt, shade } from './draw.ts';
import type { Glad } from '../game/gladiator.ts';
import { attackDef } from '../game/gladiator.ts';

const S = 2; // Spieleinheiten pro Körpereinheit

interface Pose { sword: number; lean: number; crouch: number; shield: 'side' | 'front' | 'up'; legs: number; run: boolean }

const ease = (k: number) => 1 - (1 - k) * (1 - k);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function pose(g: Glad): Pose {
  const k = g.dur > 0 ? clamp(g.t / g.dur, 0, 1) : 0;
  const idle = Math.sin(G.time * 2.4) * 0.06;
  const p: Pose = { sword: 0.55 + idle, lean: 0, crouch: 0, shield: 'side', legs: 0, run: false };
  switch (g.state) {
    case 'walk': p.legs = Math.sin(g.walk) ; break;
    case 'rec': p.sword = 1.1; p.lean = -0.08; p.crouch = 0.2 + Math.sin(G.time * 6) * 0.05; break;
    case 'stagger': p.sword = 1.35; p.lean = -0.32 + Math.sin(G.time * 18) * 0.05; break;
    case 'guard': p.shield = 'up'; p.sword = 1.0; p.crouch = 0.25; break;
    case 'tele':
      if (g.atk === 'hieb') { p.sword = lerp(0.55, -2.35, ease(k)); p.lean = -0.12 * k; }
      else if (g.atk === 'feger') { p.sword = lerp(0.55, 2.7, ease(k)); p.crouch = 0.85 * k; p.lean = 0.1 * k; }
      else { p.lean = -0.18 * k; p.crouch = 0.45 * k; p.shield = 'front'; p.sword = 1.2; }
      break;
    case 'act':
      if (g.atk === 'hieb') { p.sword = lerp(-2.35, 1.15, Math.sqrt(k)); p.lean = 0.16; }
      else if (g.atk === 'feger') { p.sword = lerp(2.7, -0.15, Math.sqrt(k)); p.crouch = 0.85; p.lean = 0.12; }
      else { p.lean = 0.35; p.shield = 'front'; p.sword = 1.25; p.run = true; p.legs = Math.sin(G.time * 26); }
      break;
  }
  return p;
}

export function drawGladiator(g: Glad): void {
  const d = g.def, P = pose(g), L = LW / S, fl = g.flash > 0 && (G.time * 30 | 0) % 2 === 0;
  const C = (c: string) => (fl ? '#fff' : c), D = (c: string) => (fl ? '#fff' : shade(c, 0.7));
  const legLen = 13, hip = -legLen + P.crouch * 4, th = 15, sh = hip - th + 3, hy = hip - th - 5.5;

  // Ankündigung: Leuchten in der Akzentfarbe, Warnzeichen über dem Kopf
  if (g.state === 'tele') {
    const a = attackDef(g)!, k = clamp(g.t / g.dur, 0, 1);
    const col = a.blockable ? '#ffd040' : '#ff3828';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.35 * k;
    circ(ctx, g.x, GY - 34, 34 + 6 * Math.sin(G.time * 20), a.blockable ? 'rgba(255,200,60,.35)' : 'rgba(255,60,40,.4)');
    ctx.restore(); ctx.globalAlpha = 1;
    const by = GY - 92 - Math.sin(G.time * 12) * 2;
    circ(ctx, g.x, by, 9, '#140e10'); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    txt(a.blockable ? '!' : '!!', g.x, by - 7, col, 'center', 13, true);
    if (g.atk === 'sturm') {
      for (let t = 30; t < 170; t += 24) {
        const ax = g.x + g.f * t;
        ctx.globalAlpha = ((G.time * 10 | 0) + (t / 24 | 0)) % 3 ? 0.35 : 1;
        poly(ctx, [ax - g.f * 5, GY - 30, ax + g.f * 5, GY - 23, ax - g.f * 5, GY - 16, ax - g.f, GY - 23], '#ff5040', null);
      }
      ctx.globalAlpha = 1;
    }
    if (g.atk === 'feger') { // Warnstreifen am Boden
      const x0 = g.f > 0 ? g.x : g.x - a.range;
      ctx.fillStyle = (G.time * 12 | 0) % 2 ? 'rgba(255,60,40,.45)' : 'rgba(255,160,60,.35)';
      ctx.fillRect(x0, GY - 3, a.range, 4);
    }
  }

  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(g.x, GY + 4, 22, 5, 0, 0, TAU); ctx.fill();

  ctx.save(); ctx.translate(g.x, GY); ctx.scale(S * g.f, S); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const seg = (x1: number, y1: number, x2: number, y2: number, w: number, col: string) => {
    for (const [lw, c] of [[w + L * 1.3, OUT], [w, col]] as [number, string][]) {
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  };
  const stitch = (cx: number, cy: number, r: number) => {
    if (fl) return;
    ctx.strokeStyle = OUT; ctx.lineWidth = L * 0.55; ctx.beginPath();
    ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();
  };
  const shield = (x: number, y: number, r: number) => {
    circ(ctx, x, y, r, C(d.metal));
    if (!fl) { const gr = ctx.createLinearGradient(x - r, y - r, x + r, y + r); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(0,0,0,.4)'); circ(ctx, x, y, r, gr); }
    ctx.strokeStyle = OUT; ctx.lineWidth = L; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    circ(ctx, x, y, r * 0.32, C(d.accent)); ctx.strokeStyle = OUT; ctx.lineWidth = L * 0.7; ctx.stroke();
  };

  ctx.rotate(P.lean);
  // hinteres Bein und hinterer Arm (Schildarm)
  const sw = P.legs * 5;
  const footB = P.run ? -4 - sw : -3 + sw, footF = P.run ? 4 + sw : 3 - sw;
  seg(-2.5, hip, footB - P.crouch * 3, -1, 4.2, D(d.body));
  if (P.shield === 'side') { seg(-4, sh, -6, sh + 9, 3.6, D(d.body)); shield(-6.5, sh + 9, 7); }
  else seg(-4, sh, 4, sh + 6, 3.6, D(d.body));
  seg(2.5, hip, footF + P.crouch * 2, -1, 4.2, C(d.body));
  // Füße/Sandalen
  for (const fx of [footF + P.crouch * 2]) { rr(ctx, fx - 2, -2.5, 6, 3, 1.2); ctx.fillStyle = C('#5a3e2c'); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = L * 0.8; ctx.stroke(); }

  // Rumpf mit Lederschurz und Nähten
  rr(ctx, -6.5, hip - th, 13, th + 1.5, 3.5); ctx.fillStyle = C(d.body); ctx.fill();
  if (!fl) { const gr = ctx.createLinearGradient(-6, hip - th, 6, hip); gr.addColorStop(0, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(0,0,0,.42)'); ctx.fillStyle = gr; ctx.fill(); }
  ctx.strokeStyle = OUT; ctx.lineWidth = L; ctx.stroke();
  poly(ctx, [-7, hip - 3, 7, hip - 3, 6, hip + 4, -6, hip + 4], C('#6a4a34'), OUT, L);
  if (!fl) {
    ctx.strokeStyle = OUT; ctx.lineWidth = L * 0.5; ctx.beginPath();
    for (const x of [-4, -1, 2, 5]) { ctx.moveTo(x, hip - 2); ctx.lineTo(x, hip + 3.5); }
    ctx.moveTo(-4, hip - th + 3); ctx.lineTo(3, hip - th + 9); ctx.stroke();
    stitch(-3, hip - th + 4, 0.9); stitch(0.5, hip - th + 6.5, 0.9);
  }
  // Schulterpanzer
  poly(ctx, [-6, sh - 3, 4, sh - 4, 7, sh + 1, -5, sh + 2], C(d.metal), OUT, L);

  // Kopf mit Helm
  circ(ctx, 1, hy, 6, C(d.body)); ctx.strokeStyle = OUT; ctx.lineWidth = L; ctx.beginPath(); ctx.arc(1, hy, 6, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(1, hy, 6.6, Math.PI * 1.05, Math.PI * 2.05); ctx.lineTo(7.6, hy + 2); ctx.lineTo(-5.6, hy + 2); ctx.closePath();
  ctx.fillStyle = C(d.metal); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = L; ctx.stroke();
  poly(ctx, [-3, hy - 6, 5, hy - 7, 3, hy - 11, -5, hy - 10], C(d.accent), OUT, L);
  if (!fl) {
    ctx.fillStyle = '#140e10'; ctx.fillRect(2, hy - 1, 5.5, 1.6);
    const glow = g.state === 'tele' ? '#ff4a30' : '#ffb060';
    ctx.shadowColor = glow; ctx.shadowBlur = 6; circ(ctx, 5, hy - 0.2, 0.9, glow); ctx.shadowBlur = 0;
    ctx.strokeStyle = OUT; ctx.lineWidth = L * 0.5; ctx.beginPath(); ctx.moveTo(1, hy + 3); ctx.lineTo(6, hy + 3.5); ctx.stroke();
  }

  // Schild vorn bzw. erhoben
  if (P.shield === 'front') shield(7, hip - 8, 8);
  if (P.shield === 'up') shield(8.5, sh + 2, 9.5);

  // Schwertarm und Schwert
  const ax = 2.5, ay = sh, c = Math.cos(P.sword), s = Math.sin(P.sword);
  const hx = ax + c * 10, hy2 = ay + s * 10;
  seg(ax, ay, hx, hy2, 3.8, C(d.body));
  stitch(ax + c * 3.5, ay + s * 3.5, 0.8);
  seg(hx - s * 2.5, hy2 + c * 2.5, hx + s * 2.5, hy2 - c * 2.5, 1.6, C(d.accent)); // Parierstange
  poly(ctx, [hx - s * 1.3, hy2 + c * 1.3, hx + c * 20, hy2 + s * 20, hx + s * 1.3, hy2 - c * 1.3], C('#dcd8cc'), OUT, L);
  ctx.restore();

  // Hiebspur während des Schlags
  if (g.state === 'act' && g.atk !== 'sturm') {
    const a = attackDef(g)!, k = clamp(g.t / g.dur, 0, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k * 0.6;
    ctx.strokeStyle = a.blockable ? 'rgba(255,230,170,.85)' : 'rgba(255,120,80,.9)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath();
    if (a.low) { const x0 = g.x + g.f * 6; ctx.moveTo(x0, GY - 6); ctx.lineTo(x0 + g.f * a.range * k, GY - 6); }
    else { const cy = GY - 40, r = 40; const a0 = g.f > 0 ? -2.2 : Math.PI + 2.2, a1 = g.f > 0 ? lerp(-2.2, 0.9, k) : Math.PI - lerp(-2.2, 0.9, k); ctx.arc(g.x, cy, r, Math.min(a0, a1), Math.max(a0, a1)); }
    ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
  }
  // Taumeln: kreisende Sterne
  if (g.state === 'stagger') {
    for (let i = 0; i < 3; i++) {
      const a = G.time * 6 + i * TAU / 3;
      circ(ctx, g.x + Math.cos(a) * 12, GY - 78 + Math.sin(a) * 4, 2.2, '#ffe080');
    }
  }
}
