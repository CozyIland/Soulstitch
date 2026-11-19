// Debug-Werkzeuge: ein Panel im Testmodus (oder mit ?debug in der Adresse) und window.__dbg für Tests.
import { G } from './core/state.ts';
import { TEXTS } from './data/index.ts';
import { prof, persist } from './game/profile.ts';
import { go } from './game/scenes.ts';
import { startRun, abortRun, fightsFrom, R } from './game/run.ts';
import { ABILITY_IDS } from './game/abilities.ts';
import type { AbilityId } from './game/abilities.ts';
import type { GladAttackId } from './data/index.ts';
import { fightDebug } from './game/fight.ts';

const ACTIONS: Record<string, () => void> = {
  bones: () => { prof.save.bones += 100; persist(); },
  win: () => fightDebug.kill(),
  god: () => { G.debug.god = !G.debug.god; },
  die: () => fightDebug.die(),
  abyss: () => { abortRun(); go('abyss', TEXTS.abyss.debug); },
  abil: () => {
    // Körper → alle → nur Blocken → nur Springen → nur Ausweichen → Körper
    const o = prof.abilityOverride;
    const cur = o === null ? -1 : ABILITY_SETS.findIndex((s) => s.join() === o.join());
    const next = cur + 1;
    prof.abilityOverride = next >= ABILITY_SETS.length ? null : [...ABILITY_SETS[next]];
  },
};
const ABILITY_SETS: AbilityId[][] = [[...ABILITY_IDS], ['block'], ['jump'], ['dodge']];
const ABILITY_NAMES: Record<AbilityId, string> = { block: 'Blocken', jump: 'Springen', dodge: 'Ausweichen' };
const abilLabel = () => {
  const o = prof.abilityOverride;
  return 'Fähigkeiten: ' + (o === null ? 'vom Körper' : o.length === ABILITY_IDS.length ? 'alle' : o.map((a) => ABILITY_NAMES[a]).join(', '));
};

export function initDebug(): void {
  const forced = new URLSearchParams(location.search).has('debug');
  const box = document.getElementById('dbg') as HTMLElement;
  const panel = document.getElementById('dbgPanel') as HTMLElement;
  const godBtn = panel.querySelector('[data-act="god"]') as HTMLButtonElement;
  const abilBtn = panel.querySelector('[data-act="abil"]') as HTMLButtonElement;
  (document.getElementById('dbgToggle') as HTMLButtonElement).addEventListener('click', () => { panel.hidden = !panel.hidden; });
  panel.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).dataset.act;
    if (act && ACTIONS[act]) ACTIONS[act]();
    godBtn.textContent = 'Unverwundbar: ' + (G.debug.god ? 'an' : 'aus');
    abilBtn.textContent = abilLabel();
  });
  // Sichtbarkeit jedes Bild prüfen: der Testmodus kann jederzeit eingeschaltet werden
  const tick = () => { box.hidden = !(forced || prof.test); requestAnimationFrame(tick); };
  tick();

  // Für automatische Tests und die Browser-Konsole
  (window as unknown as { __dbg: unknown }).__dbg = {
    /** Run ab einem Kampf starten: 'rekrut' usw. für Gladiatoren, eine Zahl für alte Boss n */
    fight: (ref: string | number) => startRun(fightsFrom(typeof ref === 'number' ? { kind: 'boss', n: ref } : { kind: 'gladiator', id: ref })),
    /** Fähigkeiten erzwingen; null = wieder vom Körper bestimmen */
    abilities: (ids: AbilityId[] | null) => { prof.abilityOverride = ids ? [...ids] : null; },
    equip: (eq: Record<string, string>) => { Object.assign(prof.save.eq, eq); },
    sel: (ids: AbilityId[]) => { prof.save.sel = [...ids]; },
    attack: (id: GladAttackId) => fightDebug.attack(id),
    place: (x: number, f: number) => fightDebug.place(x, f),
    gladAt: (x: number) => fightDebug.gladAt(x),
    bones: (n: number) => { prof.save.bones = n; },
    pile: () => go('abyss', 'Test'),
    kill: ACTIONS.win,
    die: ACTIONS.die,
    god: (on: boolean) => { G.debug.god = on; },
    get s() { return { scene: G.scene, ...fightDebug.info(), run: R.run ? { ...R.run } : null, last: R.last ? { ...R.last } : null }; },
  };
}
