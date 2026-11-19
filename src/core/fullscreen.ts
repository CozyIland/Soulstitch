// Vollbild-Knopf oben rechts; beim ersten Antippen versucht das Spiel selbst ins Vollbild zu gehen.
import { cv } from './canvas.ts';

type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: (o?: FullscreenOptions) => Promise<void> };
type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

const doc = document as FsDoc;
const root = document.documentElement as FsEl;

export const fsOn = (): boolean => !!(doc.fullscreenElement || doc.webkitFullscreenElement);

export async function goFull(): Promise<boolean> {
  if (fsOn()) return true;
  const req = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!req) return false;
  try { await req.call(root, { navigationUI: 'hide' }); } catch { return false; }
  try { await (screen.orientation as LockableOrientation).lock?.('landscape'); } catch { /* nicht überall erlaubt */ }
  return true;
}

export function initFullscreen(): void {
  const btn = document.getElementById('fs') as HTMLButtonElement;
  const hint = document.getElementById('fsHint') as HTMLElement;
  btn.addEventListener('click', async () => {
    if (fsOn()) (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
    else if (!(await goFull())) hint.style.display = 'flex';
    cv.focus();
  });
  hint.addEventListener('click', () => (hint.style.display = 'none'));
  const upd = () => {
    const on = fsOn();
    btn.textContent = on ? '✕' : '⛶';
    btn.setAttribute('aria-label', on ? 'Vollbild beenden' : 'Vollbild');
  };
  document.addEventListener('fullscreenchange', upd);
  document.addEventListener('webkitfullscreenchange', upd);
}
