// Zentrale Szenenverwaltung. Jeder Szenenwechsel läuft über go().
//
//   title → intro → abyss ⇄ (possess → fight … fight) → descent → abyss
//                                              └→ victory → abyss
import { G } from '../core/state.ts';
import type { SceneName } from '../core/state.ts';

export interface Scene {
  enter?(arg?: unknown): void;
  update(dt: number): void;
  draw(): void;
}

const scenes = {} as Record<SceneName, Scene>;

export function registerScene(name: SceneName, scene: Scene): void {
  scenes[name] = scene;
}

export function go(name: SceneName, arg?: unknown): void {
  G.scene = name;
  scenes[name].enter?.(arg);
}

export const updateScene = (dt: number): void => scenes[G.scene].update(dt);
export const drawScene = (): void => scenes[G.scene].draw();
