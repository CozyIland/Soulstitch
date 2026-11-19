// Titel, Intro-Texte und der Sieg über den letzten Boss
import { ctx } from '../core/canvas.ts';
import { W, H, OUT } from '../core/constants.ts';
import { inR } from '../core/util.ts';
import { G } from '../core/state.ts';
import { beep } from '../core/audio.ts';
import { touch, mouse, KP, ok } from '../core/input.ts';
import { txt, rr } from '../render/draw.ts';
import { drawBody } from '../render/body.ts';
import { bg, drawStage } from '../render/backgrounds.ts';
import { TEXTS } from '../data/index.ts';
import { prof, enterTestMode, leaveTestMode } from '../game/profile.ts';
import { go } from '../game/scenes.ts';
import type { Scene } from '../game/scenes.ts';
import type { SceneName } from '../core/state.ts';

/** Knöpfe auf dem Titelbild: Spielen, Testmodus, Steuerung */
const TB = [{ x: 146, y: 244, w: 108, h: 28 }, { x: 266, y: 244, w: 108, h: 28 }, { x: 386, y: 244, w: 108, h: 28 }];
const TB_LABEL = ['Spielen', 'Testmodus', 'Steuerung'];
const TB_COL = ['rgba(36,98,122,.92)', 'rgba(140,72,30,.9)', 'rgba(60,46,52,.92)'];
let titleSel = 0, introLine = 0, introSeen = false;

function backdrop(): void {
  drawStage(); ctx.drawImage(bg.front, 0, 0, W, H);
  ctx.fillStyle = 'rgba(8,5,7,.62)'; ctx.fillRect(0, 0, W, H);
}

export const titleScene: Scene = {
  enter() { leaveTestMode(); G.debug.god = false; },
  update() {
    const d = (KP('KeyD', 'ArrowRight') ? 1 : 0) - (KP('KeyA', 'ArrowLeft') ? 1 : 0);
    if (d) { titleSel = (titleSel + d + TB.length) % TB.length; beep(300, .03); }
    let pick = ok() ? titleSel : -1;
    if (mouse.click) { const i = TB.findIndex((r) => inR(r, mouse.x, mouse.y)); pick = i >= 0 ? i : 0; }
    if (KP('KeyH')) pick = 2;
    // Intro nur beim ersten Mal; wer schon gespielt hat, geht direkt in den Abgrund
    if (pick === 0) { beep(440, .1); if (introSeen || prof.save.best > 0 || prof.save.bones > 0) go('abyss', TEXTS.abyss.first); else go('intro'); }
    else if (pick === 1) { beep(660, .1); enterTestMode(); go('abyss', TEXTS.abyss.test); }
    else if (pick === 2) { beep(520, .06); go('help', 'title'); }
  },
  draw() {
    backdrop();
    ctx.shadowColor = '#3ff'; ctx.shadowBlur = 24; txt(TEXTS.title, W / 2, 62, '#7ff', 'center', 64, true, true); ctx.shadowBlur = 0;
    txt(TEXTS.subtitle, W / 2, 138, '#e0d6bc', 'center', 16, false, true);
    drawBody(W / 2, 236, 2.2, prof.save.eq, { run: 0 });
    TB.forEach((r, i) => {
      const sel = i === titleSel;
      rr(ctx, r.x, r.y, r.w, r.h, 7);
      ctx.fillStyle = TB_COL[i]; ctx.fill();
      ctx.strokeStyle = sel ? ((G.time * 2 | 0) % 2 ? '#fff' : '#bff') : OUT; ctx.lineWidth = sel ? 2 : 1.4; ctx.stroke();
      txt(TB_LABEL[i], r.x + r.w / 2, r.y + 6, '#fff', 'center', 14, true);
    });
    txt(touch.mode ? TEXTS.controls.touch : TEXTS.controls.keyboard, W / 2, 300, '#b0a090', 'center', 12);
    if (prof.save.best) txt('Rekord: ' + prof.save.best + ' Kämpfe in einem Lauf', W / 2, 322, '#ffd040', 'center', 13, true);
  },
};

export const introScene: Scene = {
  enter() { introLine = 0; },
  update() {
    if (!(ok() || mouse.click)) return;
    beep(440, .06);
    if (++introLine >= TEXTS.intro.length) { introSeen = true; go('abyss', TEXTS.abyss.first); }
  },
  draw() {
    backdrop();
    TEXTS.intro[introLine].forEach((l, i) => txt(l, W / 2, 124 + i * 28, '#f0e8d0', 'center', 19, false, true));
    if ((G.time * 2 | 0) % 2) txt(touch.mode ? 'Tippen' : 'Enter', W / 2, 250, '#b0a090', 'center', 13);
  },
};

/** Run-Ende nach dem Sieg über den letzten Boss */
export const victoryScene: Scene = {
  update() { if (ok() || mouse.click) go('abyss', TEXTS.abyss.victory); },
  draw() {
    drawStage(); ctx.fillStyle = 'rgba(8,5,7,.7)'; ctx.fillRect(0, 0, W, H);
    txt(TEXTS.victory.headline, W / 2, 70, '#ffd040', 'center', 40, true, true);
    TEXTS.victory.lines.forEach((l, i) => txt(l, W / 2, 140 + i * 26, '#f0e8d0', 'center', 18, false, true));
    drawBody(W / 2, 290, 2, prof.save.eq, { run: 0 });
    if ((G.time * 2 | 0) % 2) txt((touch.mode ? 'Tippen' : 'Enter') + ': zurück zum Leichenhaufen', W / 2, 312, '#fff', 'center', 14, true);
  },
};

/** Übersicht der Steuerung und Kampf-Tipps; arg = Szene, zu der es zurückgeht */
let helpBack: SceneName = 'title';
export const helpScene: Scene = {
  enter(arg) { helpBack = (arg as SceneName) || 'title'; },
  update() { if (ok() || mouse.click || KP('Escape', 'KeyH')) { beep(440, .05); go(helpBack); } },
  draw() {
    const H2 = TEXTS.help;
    if (helpBack === 'abyss') { ctx.drawImage(bg.morgue, 0, 0, W, H); } else { drawStage(); ctx.drawImage(bg.front, 0, 0, W, H); }
    ctx.fillStyle = 'rgba(8,5,7,.86)'; ctx.fillRect(0, 0, W, H);
    txt(H2.title, W / 2, 10, '#f4ead4', 'center', 26, true, true);
    const X = [40, 236, 412], y0 = 50, rh = 21;
    H2.head.forEach((h, i) => txt(h, X[i], y0, '#9a8a80', 'left', 10, true));
    H2.rows.forEach((row, r) => {
      const y = y0 + 16 + r * rh;
      if (r % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(30, y - 3, W - 60, rh); }
      row.forEach((c, i) => txt(c, X[i], y, i === 0 ? '#f0e8d0' : '#8fe6ff', 'left', 11.5, i === 0));
    });
    const ty = y0 + 26 + H2.rows.length * rh;
    txt('IM KAMPF', 40, ty, '#9a8a80', 'left', 10, true);
    H2.tips.forEach((l, i) => txt('·  ' + l, 40, ty + 15 + i * 16, '#d0c8b0', 'left', 11));
    if ((G.time * 2 | 0) % 2) txt(H2.back, W / 2, H - 22, '#b0a090', 'center', 11);
  },
};
