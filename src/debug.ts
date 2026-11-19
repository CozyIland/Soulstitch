// Debug-Werkzeuge: ein Panel im Testmodus (oder mit ?debug in der Adresse) und window.__dbg für Tests.
import { G } from './core/state.ts';
import { TEXTS } from './data/index.ts';
import { prof, persist } from './game/profile.ts';
import { go } from './game/scenes.ts';
import { startRun, abortRun, R } from './game/run.ts';
import { fightDebug } from './game/fight.ts';

const ACTIONS: Record<string, () => void> = {
  bones: () => { prof.save.bones += 100; persist(); },
  win: () => fightDebug.kill(),
  god: () => { G.debug.god = !G.debug.god; },
  die: () => fightDebug.die(),
  abyss: () => { abortRun(); go('abyss', TEXTS.abyss.debug); },
};

export function initDebug(): void {
  const forced = new URLSearchParams(location.search).has('debug');
  const box = document.getElementById('dbg') as HTMLElement;
  const panel = document.getElementById('dbgPanel') as HTMLElement;
  const godBtn = panel.querySelector('[data-act="god"]') as HTMLButtonElement;
  (document.getElementById('dbgToggle') as HTMLButtonElement).addEventListener('click', () => { panel.hidden = !panel.hidden; });
  panel.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).dataset.act;
    if (act && ACTIONS[act]) ACTIONS[act]();
    godBtn.textContent = 'Unverwundbar: ' + (G.debug.god ? 'an' : 'aus');
  });
  // Sichtbarkeit jedes Bild prüfen: der Testmodus kann jederzeit eingeschaltet werden
  const tick = () => { box.hidden = !(forced || prof.test); requestAnimationFrame(tick); };
  tick();

  // Für automatische Tests und die Browser-Konsole
  (window as unknown as { __dbg: unknown }).__dbg = {
    fight: (n: number) => startRun(n),
    bones: (n: number) => { prof.save.bones = n; },
    pile: () => go('abyss', 'Test'),
    kill: ACTIONS.win,
    die: ACTIONS.die,
    god: (on: boolean) => { G.debug.god = on; },
    get s() { return { scene: G.scene, ...fightDebug.info(), run: R.run ? { ...R.run } : null, last: R.last ? { ...R.last } : null }; },
  };
}
