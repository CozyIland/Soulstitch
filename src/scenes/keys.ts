// Tasten belegen (PC): jede Aktion hat zwei Plätze. Platz wählen, neue Taste drücken.
import { ctx } from '../core/canvas.ts';
import { W, H, OUT } from '../core/constants.ts';
import { inR } from '../core/util.ts';
import { G } from '../core/state.ts';
import { beep } from '../core/audio.ts';
import { KP, ok, mouse, lastKey } from '../core/input.ts';
import { bindings, setKey, resetKeys } from '../core/bindings.ts';
import { ACTIONS, keyLabel } from '../core/keymap.ts';
import { txt, rr } from '../render/draw.ts';
import { bg } from '../render/backgrounds.ts';
import { TEXTS } from '../data/index.ts';
import { go } from '../game/scenes.ts';
import type { Scene } from '../game/scenes.ts';

const ROW_Y = (i: number) => 64 + i * 30;
const SLOT = (i: number, s: number) => ({ x: 262 + s * 132, y: ROW_Y(i), w: 124, h: 24 });
const BTN = [{ x: W / 2 - 140, y: 292, w: 130, h: 28 }, { x: W / 2 + 10, y: 292, w: 130, h: 28 }]; // Standard, Fertig
const N = ACTIONS.length;

let sel = 0, slot: 0 | 1 = 0;
/** 0 = aus, 1 = gerade gestartet (diese Taste zählt noch nicht), 2 = wartet auf Taste */
let capture = 0;

function back(): void { capture = 0; beep(440, .05); go('help'); }

export const keysScene: Scene = {
  enter() { sel = 0; slot = 0; capture = 0; },
  update() {
    if (capture === 1) { capture = 2; return; }
    if (capture === 2) {
      const code = lastKey.code;
      if (mouse.click) { capture = 0; return; } // Klick bricht ab
      if (!code) return;
      capture = 0;
      if (code === 'Escape') { beep(200, .05); return; }
      if (code === 'Delete' || code === 'Backspace') { setKey(ACTIONS[sel].id, slot, null); beep(300, .05); return; }
      setKey(ACTIONS[sel].id, slot, code); beep(660, .08, 'triangle', .05, 200);
      return;
    }
    const rows = N + 1; // Aktionen + Knopfzeile
    if (KP('ArrowUp', 'KeyW')) { sel = (sel + rows - 1) % rows; beep(300, .03); }
    if (KP('ArrowDown', 'KeyS')) { sel = (sel + 1) % rows; beep(300, .03); }
    if (KP('ArrowLeft', 'KeyA')) { slot = 0; beep(300, .03); }
    if (KP('ArrowRight', 'KeyD')) { slot = 1; beep(300, .03); }
    if (KP('Escape')) return back();
    if (ok()) {
      if (sel < N) { capture = 1; beep(520, .05); }
      else if (slot === 0) { resetKeys(); beep(400, .1); }
      else return back();
    }
    if (mouse.click) {
      for (let i = 0; i < N; i++) for (const s of [0, 1] as const)
        if (inR(SLOT(i, s), mouse.x, mouse.y)) { sel = i; slot = s; capture = 1; beep(520, .05); }
      if (inR(BTN[0], mouse.x, mouse.y)) { resetKeys(); beep(400, .1); }
      if (inR(BTN[1], mouse.x, mouse.y)) back();
    }
  },
  draw() {
    const T = TEXTS.keys;
    ctx.drawImage(bg.morgue, 0, 0, W, H);
    ctx.fillStyle = 'rgba(8,5,7,.88)'; ctx.fillRect(0, 0, W, H);
    txt(T.title, W / 2, 10, '#f4ead4', 'center', 26, true, true);
    txt(capture ? T.capture : T.hint, W / 2, 42, capture ? '#ffd878' : '#9a8a80', 'center', 11, !!capture);
    ACTIONS.forEach((a, i) => {
      const y = ROW_Y(i);
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(60, y - 3, W - 120, 30); }
      txt(a.name, 80, y + 5, i === sel ? '#8fe6ff' : '#f0e8d0', 'left', 13, true);
      for (const s of [0, 1] as const) {
        const r = SLOT(i, s), on = i === sel && s === slot, cap = on && capture > 0;
        rr(ctx, r.x, r.y, r.w, r.h, 6);
        ctx.fillStyle = cap ? ((G.time * 4 | 0) % 2 ? 'rgba(255,216,120,.35)' : 'rgba(255,216,120,.15)') : on ? 'rgba(110,210,255,.22)' : 'rgba(0,0,0,.4)';
        ctx.fill(); ctx.strokeStyle = cap ? '#ffd878' : on ? '#8fe6ff' : 'rgba(240,224,176,.25)'; ctx.lineWidth = on ? 1.8 : 1.1; ctx.stroke();
        const code = bindings.map[a.id][s];
        txt(cap ? '…' : keyLabel(code), r.x + r.w / 2, r.y + 5, code ? '#fff' : '#6e625c', 'center', 12, true);
      }
    });
    T.buttons.forEach((label, i) => {
      const r = BTN[i], on = sel === N && slot === i;
      rr(ctx, r.x, r.y, r.w, r.h, 7); ctx.fillStyle = i ? '#24627a' : 'rgba(60,46,52,.92)'; ctx.fill();
      ctx.strokeStyle = on ? '#fff' : OUT; ctx.lineWidth = on ? 2 : 1.4; ctx.stroke();
      txt(label, r.x + r.w / 2, r.y + 7, '#fff', 'center', 13, true);
    });
    txt(T.note, W / 2, 334, '#6e625c', 'center', 10);
  },
};
