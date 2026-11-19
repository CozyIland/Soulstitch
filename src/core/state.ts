// Zustand, den mehrere Teile des Spiels gemeinsam nutzen.
export type SceneName = 'title' | 'intro' | 'abyss' | 'descent' | 'possess' | 'fight' | 'victory';

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; col: string; r: number;
  g?: number; // Schwerkraft
}

export const G = {
  scene: 'title' as SceneName,
  time: 0,  // Sekunden seit Start
  shake: 0, // Bildschirmwackeln
  fx: [] as Particle[], // Partikel; wird nur geleert, nie ersetzt
  debug: { god: false }, // Debug: unverwundbar
};
