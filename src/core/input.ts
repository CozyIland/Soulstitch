// Tastatur, Maus und Touch.
// Touch im Kampf: links ziehen = laufen (nach oben = springen), rechts tippen = angreifen
// (gegen alte Bosse: dorthin schießen), Knöpfe rechts unten für die aktiven Fähigkeiten.
import { W, H } from './constants.ts';
import { clamp } from './util.ts';
import { cv } from './canvas.ts';
import { initAudio } from './audio.ts';
import { goFull } from './fullscreen.ts';
import { G } from './state.ts';

export const keys = new Set<string>();
export const pressed = new Set<string>(); // nur in diesem Frame neu gedrückt
export const mouse = { x: W / 2, y: H / 2, down: false, click: false, rdown: false };

export interface Joy { id: number; ox: number; oy: number; dx: number; up: boolean }
/** Touch-Knöpfe im Kampf; welche es gibt, legt das Kampfmodul je nach aktiven Fähigkeiten fest. */
export interface TouchButton { id: 'jump' | 'dodge' | 'block' | 'pause'; x: number; y: number; r: number; label: string; on?: boolean }
export const touch = {
  mode: false,
  joy: null as Joy | null,
  aim: null as { id: number; x: number; y: number } | null, // rechter Daumen: Angriff / Ziel
  jumpId: null as number | null,
  blockId: null as number | null,
  buttons: [] as TouchButton[],
};

export const K = (...c: string[]): boolean => c.some((k) => keys.has(k));
export const KP = (...c: string[]): boolean => c.some((k) => pressed.has(k));
export const ok = (): boolean => KP('Enter', 'NumpadEnter', 'Space');

/** Am Ende jedes Frames: Einmal-Ereignisse zurücksetzen. */
export function endFrame(): void {
  pressed.clear();
  mouse.click = false;
}

function jumpKey(): void {
  const on = touch.jumpId !== null || !!(touch.joy && touch.joy.up);
  if (on && !keys.has('Space')) { pressed.add('Space'); keys.add('Space'); }
  if (!on) keys.delete('Space');
}

const toGame = (cx: number, cy: number) => {
  const r = cv.getBoundingClientRect();
  return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
};

export function initInput(): void {
  addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) e.preventDefault();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
    initAudio();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); mouse.down = false; mouse.rdown = false; });

  const mpos = (e: MouseEvent) => { const q = toGame(e.clientX, e.clientY); mouse.x = q.x; mouse.y = q.y; };
  cv.addEventListener('mousemove', mpos);
  cv.addEventListener('mousedown', (e) => {
    mpos(e);
    if (e.button === 2) mouse.rdown = true; else { mouse.down = true; mouse.click = true; }
    cv.focus(); initAudio(); e.preventDefault();
  });
  addEventListener('mouseup', (e) => { if (e.button === 2) mouse.rdown = false; else mouse.down = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  cv.addEventListener('touchstart', (e) => {
    e.preventDefault(); touch.mode = true; initAudio();
    for (const t of Array.from(e.changedTouches)) {
      const q = toGame(t.clientX, t.clientY);
      mouse.x = q.x; mouse.y = q.y; mouse.click = true;
      if (G.scene !== 'fight') continue;
      const btn = touch.buttons.find((b) => Math.hypot(q.x - b.x, q.y - b.y) < b.r + 8);
      if (btn?.id === 'pause') pressed.add('Escape');
      else if (btn?.id === 'dodge') pressed.add('ShiftLeft');
      else if (btn?.id === 'jump') { touch.jumpId = t.identifier; jumpKey(); }
      else if (btn?.id === 'block') { touch.blockId = t.identifier; keys.add('KeyK'); }
      else if (q.x < W / 2) { if (!touch.joy) touch.joy = { id: t.identifier, ox: q.x, oy: q.y, dx: 0, up: false }; }
      else if (!touch.aim) { touch.aim = { id: t.identifier, x: q.x, y: q.y }; pressed.add('KeyJ'); } // Angriff
    }
  }, { passive: false });

  cv.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      const q = toGame(t.clientX, t.clientY), joy = touch.joy;
      if (joy && t.identifier === joy.id) {
        joy.dx = clamp((q.x - joy.ox) / 26, -1, 1);
        const dy = (q.y - joy.oy) / 26;
        if (!joy.up && dy < -0.7) joy.up = true;
        else if (joy.up && dy > -0.35) joy.up = false;
        jumpKey();
      }
      if (touch.aim && t.identifier === touch.aim.id) { touch.aim.x = q.x; touch.aim.y = q.y; }
    }
  }, { passive: false });

  let fsTried = false;
  const tend = (e: TouchEvent) => {
    if (!fsTried) { fsTried = true; void goFull(); } // Vollbild braucht eine echte Nutzergeste
    for (const t of Array.from(e.changedTouches)) {
      if (touch.joy && t.identifier === touch.joy.id) touch.joy = null;
      if (touch.aim && t.identifier === touch.aim.id) touch.aim = null;
      if (t.identifier === touch.jumpId) touch.jumpId = null;
      if (t.identifier === touch.blockId) { touch.blockId = null; keys.delete('KeyK'); }
    }
    jumpKey();
  };
  cv.addEventListener('touchend', tend);
  cv.addEventListener('touchcancel', tend);
}
