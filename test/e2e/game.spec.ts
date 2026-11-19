// Browser-Tests: das Spiel startet, alle Szenen sind erreichbar, es gibt keine Fehler.
// Spielkoordinaten (640×360) werden bei 1280×720 mit 2 multipliziert.
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

interface DbgState { scene: string; phase: string; bossN: number; hp: number; run: { boss: number } | null; last: { result: string } | null }
type Dbg = { fight(n: number): void; bones(n: number): void; kill(): void; die(): void; god(on: boolean): void; s: DbgState };
const dbg = (page: Page) => page.evaluate(() => (window as unknown as { __dbg: Dbg }).__dbg.s);
const call = (page: Page, fn: string, arg?: number | boolean) =>
  page.evaluate(([f, a]) => { const d = (window as unknown as { __dbg: Record<string, (x?: unknown) => void> }).__dbg; d[f as string](a); }, [fn, arg] as const);
/** Ein Klick in Spielkoordinaten; danach ein paar Frames warten, damit das Spiel ihn verarbeitet. */
async function tap(page: Page, x: number, y: number) {
  await page.mouse.click(x * 2, y * 2);
  await page.waitForTimeout(80);
}
const waitScene = (page: Page, scene: string, timeout = 10_000) =>
  expect.poll(async () => (await dbg(page)).scene, { timeout }).toBe(scene);
const waitPhase = (page: Page, phase: string) =>
  expect.poll(async () => (await dbg(page)).phase, { timeout: 10_000 }).toBe(phase);

let errors: string[];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await waitScene(page, 'title');
});
test.afterEach(() => expect(errors).toEqual([]));

test('Titel → Intro → Abgrund', async ({ page }) => {
  await tap(page, 260, 258); // „Spielen“
  await waitScene(page, 'intro');
  for (let i = 0; i < 4; i++) await tap(page, 320, 200);
  await waitScene(page, 'abyss');
});

test('Teil kaufen und anlegen wird gespeichert', async ({ page }) => {
  await tap(page, 260, 258);
  for (let i = 0; i < 4; i++) await tap(page, 320, 200);
  await waitScene(page, 'abyss');
  await call(page, 'bones', 100);
  await tap(page, 300, 62 + 4 * 31 + 10);  // Platz „Rechter Arm“
  await tap(page, 500, 62 + 3 * 50 + 20);  // Kanonenarm: auswählen
  await tap(page, 500, 62 + 3 * 50 + 20);  // … und kaufen
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('soulstitch-save') ?? 'null'));
  expect(save.v).toBe(3);
  expect(save.bones).toBe(75);
  expect(save.own.a3).toBe(1);
  expect(save.eq.armR).toBe('a3');
});

test('Run: Sieg führt zum nächsten Boss, Tod zurück in den Abgrund', async ({ page }) => {
  await call(page, 'fight', 1);
  await waitPhase(page, 'play');
  await call(page, 'kill');
  await expect.poll(async () => (await dbg(page)).bossN, { timeout: 10_000 }).toBe(2);
  expect((await dbg(page)).run?.boss).toBe(2);
  await waitPhase(page, 'play');
  await call(page, 'die');
  await waitScene(page, 'descent');
  expect((await dbg(page)).last?.result).toBe('death');
  await waitScene(page, 'abyss');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('soulstitch-save') ?? 'null'));
  expect(save.best).toBe(1);
  expect(save.bones).toBe(6); // Boss 1: 3 + 1 + 2 (ohne Treffer)
});

test('Sieg über den letzten Boss beendet den Run', async ({ page }) => {
  await call(page, 'fight', 30);
  await waitPhase(page, 'play');
  await call(page, 'kill');
  await waitScene(page, 'victory');
  expect((await dbg(page)).last?.result).toBe('victory');
});

test('alle Bosse laufen ohne Fehler', async ({ page }) => {
  test.setTimeout(120_000);
  await call(page, 'god', true);
  for (let n = 1; n <= 30; n++) {
    await call(page, 'fight', n);
    await page.waitForTimeout(3000); // Intro-Banner (1,7 s) + erste Angriffe
    expect((await dbg(page)).bossN).toBe(n);
  }
});

test('Testmodus speichert nichts und zeigt Debug-Werkzeuge', async ({ page }) => {
  await tap(page, 380, 258); // „Testmodus“
  await waitScene(page, 'abyss');
  await expect(page.locator('#dbg')).toBeVisible();
  await tap(page, 300, 62 + 10);           // Kopf
  await tap(page, 500, 62 + 3 * 50 + 20);  // Doppelschädel sofort anlegen
  expect(await page.evaluate(() => localStorage.getItem('soulstitch-save'))).toBeNull();
});

test('alter Spielstand (v2) wird übernommen', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('soulstitch2', JSON.stringify({ best: 4, bones: 33, own: { k2: 1 }, eq: { kopf: 'k2' } }));
  });
  await page.reload();
  await waitScene(page, 'title');
  await call(page, 'fight', 1);
  await waitPhase(page, 'play');
  await call(page, 'kill');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('soulstitch-save'))).not.toBeNull();
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('soulstitch-save')!));
  expect(save.best).toBe(4);
  expect(save.bones).toBe(33 + 6);
  expect(save.eq.kopf).toBe('k2');
});

test.describe('Handy', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('Touch: Antippen startet, rechts halten schießt', async ({ page }) => {
    const box = (await page.locator('canvas').boundingBox())!;
    const pt = (x: number, y: number) => ({ x: box.x + (x / 640) * box.width, y: box.y + (y / 360) * box.height });
    await page.touchscreen.tap(pt(260, 258).x, pt(260, 258).y);
    await waitScene(page, 'intro');
    await call(page, 'fight', 1);
    await waitPhase(page, 'play');
    // Finger rechts auflegen und halten
    const cdp = await page.context().newCDPSession(page);
    const p = pt(500, 200);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] });
    await expect.poll(async () => (await dbg(page) as DbgState & { pb: number }).pb, { timeout: 3000 }).toBeGreaterThan(0);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  });
});
