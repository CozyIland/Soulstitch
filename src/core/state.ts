// Zustand, den mehrere Teile des Spiels gemeinsam nutzen.
export type SceneName = 'title' | 'intro' | 'abyss' | 'descent' | 'possess' | 'fight' | 'victory' | 'help' | 'keys';

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; col: string; r: number;
  g?: number; // Schwerkraft
}

export const G = {
  scene: 'title' as SceneName,
  time: 0,  // Sekunden seit Start
  shake: 0, // Bildschirmwackeln
  hitstop: 0, // kurzes Einfrieren bei Treffern (Sekunden)
  fx: [] as Particle[], // Partikel; wird nur geleert, nie ersetzt
  debug: { god: false }, // Debug: unverwundbar
};
