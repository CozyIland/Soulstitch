// Platzhalter-Klänge per Web Audio. Startet erst nach der ersten Eingabe (Browser-Regel).
let ac: AudioContext | null = null;

export function initAudio(): void {
  if (ac) return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ac = new Ctor();
  } catch { /* kein Ton */ }
}

export function beep(f: number, d = 0.08, type: OscillatorType = 'square', v = 0.05, slide = 0): void {
  if (!ac) return;
  try {
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t);
    g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + d);
  } catch { /* Ton ist nicht wichtig genug für einen Absturz */ }
}
