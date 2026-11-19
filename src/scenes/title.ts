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
import { prof, enterTestMode } from '../game/profile.ts';
import { go } from '../game/scenes.ts';
import type { Scene } from '../game/scenes.ts';

/** Knöpfe auf dem Titelbild: Spielen, Testmodus */
const TB = [{ x: 206, y: 244, w: 108, h: 28 }, { x: 326, y: 244, w: 108, h: 28 }];
let titleSel = 0, introLine = 0;

function backdrop(): void {
  drawStage(); ctx.drawImage(bg.front, 0, 0, W, H);
  ctx.fillStyle = 'rgba(8,5,7,.62)'; ctx.fillRect(0, 0, W, H);
}

export const titleScene: Scene = {
  update() {
    if (KP('KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight')) { titleSel ^= 1; beep(300, .03); }
    let pick = ok() ? titleSel : -1;
    if (mouse.click) pick = inR(TB[1], mouse.x, mouse.y) ? 1 : 0;
    if (pick === 0) { beep(440, .1); go('intro'); }
    else if (pick === 1) { beep(660, .1); enterTestMode(); go('abyss', TEXTS.abyss.test); }
  },
  draw() {
    backdrop();
    ctx.shadowColor = '#3ff'; ctx.shadowBlur = 24; txt(TEXTS.title, W / 2, 62, '#7ff', 'center', 64, true, true); ctx.shadowBlur = 0;
    txt(TEXTS.subtitle, W / 2, 138, '#e0d6bc', 'center', 16, false, true);
    drawBody(W / 2, 236, 2.2, prof.save.eq, { run: 0 });
    for (let i = 0; i < 2; i++) {
      const r = TB[i], sel = i === titleSel;
      rr(ctx, r.x, r.y, r.w, r.h, 7);
      ctx.fillStyle = i ? 'rgba(140,72,30,.9)' : 'rgba(36,98,122,.92)'; ctx.fill();
      ctx.strokeStyle = sel ? ((G.time * 2 | 0) % 2 ? '#fff' : '#bff') : OUT; ctx.lineWidth = sel ? 2 : 1.4; ctx.stroke();
      txt(i ? 'Testmodus' : 'Spielen', r.x + r.w / 2, r.y + 6, '#fff', 'center', 14, true);
    }
    txt(touch.mode ? TEXTS.controls.touch : TEXTS.controls.keyboard, W / 2, 300, '#b0a090', 'center', 12);
    if (prof.save.best) txt('Rekord: ' + prof.save.best + ' Bosse', W / 2, 322, '#ffd040', 'center', 13, true);
  },
};

export const introScene: Scene = {
  enter() { introLine = 0; },
  update() {
    if (!(ok() || mouse.click)) return;
    beep(440, .06);
    if (++introLine >= TEXTS.intro.length) go('abyss', TEXTS.abyss.first);
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
