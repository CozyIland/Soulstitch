// Soulstitch – Einstiegspunkt: Szenen anmelden, Eingabe starten, Hauptschleife.
import { cv, ctx } from './core/canvas.ts';
import { W, H } from './core/constants.ts';
import { G } from './core/state.ts';
import { initInput, endFrame } from './core/input.ts';
import { initFullscreen } from './core/fullscreen.ts';
import { resize } from './render/backgrounds.ts';
import { registerScene, updateScene, drawScene } from './game/scenes.ts';
import { fightScene } from './game/fight.ts';
import { abyssScene, descentScene, possessScene } from './scenes/abyss.ts';
import { titleScene, introScene, victoryScene, helpScene } from './scenes/title.ts';
import { initDebug } from './debug.ts';

registerScene('title', titleScene);
registerScene('intro', introScene);
registerScene('abyss', abyssScene);
registerScene('descent', descentScene);
registerScene('possess', possessScene);
registerScene('fight', fightScene);
registerScene('victory', victoryScene);
registerScene('help', helpScene);

initInput();
initFullscreen();
initDebug();
addEventListener('resize', resize);

let last = performance.now();
function loop(now: number): void {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  resize();
  G.time += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 24);
  updateScene(dt);
  endFrame();
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  drawScene();
  requestAnimationFrame(loop);
}

resize();
cv.focus();
requestAnimationFrame(loop);
