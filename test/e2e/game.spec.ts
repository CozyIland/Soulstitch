// Browser-Tests: das Spiel startet, alle Szenen sind erreichbar, der Nahkampf funktioniert,
// und es gibt keine Fehler. Spielkoordinaten (640×360) werden bei 1280×720 mit 2 multipliziert.
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

interface DbgState {
  scene: string; phase: string; n: number; name: string; hp: number; php: number; pb: number;
  glad: { state: string; atk: string | null; x: number } | null;
  run: { i: number } | null; last: { result: string } | null;
}
type DbgApi = Record<string, (...a: unknown[]) => unknown> & { s: DbgState };
const dbg = (page: Page) => page.evaluate(() => (window as unknown as { __dbg: DbgApi }).__dbg.s);
const call = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => { (window as unknown as { __dbg: DbgApi }).__dbg[f as string](...(a as unknown[])); }, [fn, args] as const);

/** Ein Klick in Spielkoordinaten; danach ein paar Frames warten, damit das Spiel ihn verarbeitet. */
async function tap(page: Page, x: number, y: number) {
  await page.mouse.click(x * 2, y * 2);
  await page.waitForTimeout(80);
}
const waitScene = (page: Page, scene: string, timeout = 10_000) =>
  expect.poll(async () => (await dbg(page)).scene, { timeout }).toBe(scene);
const waitPhase = (page: Page, phase: string) =>
  expect.poll(async () => (await dbg(page)).phase, { timeout: 10_000 }).toBe(phase);
const save = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('soulstitch-save') ?? 'null'));

/**
 * Nahkampf-Szene: Gladiator greift sofort an, Tasten werden im Browser zeitgenau gedrückt.
 * keys: [ms nach Angriffsbeginn, 'down' | 'up', Taste]
 */
async function duel(page: Page, o: { glad?: string; abilities: string[]; attack: string; keys?: [number, 'down' | 'up', string][] }) {
  await call(page, 'fight', o.glad ?? 'veteran');
  await waitPhase(page, 'play');
  await page.evaluate(({ abilities, attack, keys }) => {
    const d = (window as unknown as { __dbg: DbgApi }).__dbg;
    d.abilities(abilities);
    d.place(260, 1);
    d.gladAt(320);
    d.attack(attack);
    for (const [ms, type, code] of keys) setTimeout(() => window.dispatchEvent(new KeyboardEvent(type === 'down' ? 'keydown' : 'keyup', { code })), ms);
  }, { abilities: o.abilities, attack: o.attack, keys: o.keys ?? [] });
}

let errors: string[];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await waitScene(page, 'title');
});
test.afterEach(() => expect(errors).toEqual([]));

test.describe('Ablauf', () => {
  test('Titel → Intro → Abgrund', async ({ page }) => {
    await tap(page, 200, 258); // „Spielen“
    await waitScene(page, 'intro');
    for (let i = 0; i < 4; i++) await tap(page, 320, 200);
    await waitScene(page, 'abyss');
  });

  test('Teil kaufen und anlegen wird gespeichert', async ({ page }) => {
    await tap(page, 200, 258);
    for (let i = 0; i < 4; i++) await tap(page, 320, 200);
    await waitScene(page, 'abyss');
    await call(page, 'bones', 100);
    await tap(page, 300, 62 + 4 * 31 + 10);  // Platz „Rechter Arm“
    await tap(page, 500, 62 + 4 * 44 + 20);  // Kanonenarm (5. Karte): auswählen
    await tap(page, 500, 62 + 4 * 44 + 20);  // … und kaufen
    const s = await save(page);
    expect(s.v).toBe(4);
    expect(s.bones).toBe(75);
    expect(s.own.a3).toBe(1);
    expect(s.eq.armR).toBe('a3');
  });

  test('Run: Sieg führt zum nächsten Gladiator, Tod zurück in den Abgrund', async ({ page }) => {
    await call(page, 'fight', 'rekrut');
    await waitPhase(page, 'play');
    await call(page, 'kill');
    await expect.poll(async () => (await dbg(page)).name, { timeout: 10_000 }).toBe('Veteran');
    expect((await dbg(page)).run?.i).toBe(1);
    await waitPhase(page, 'play');
    await call(page, 'die');
    await waitScene(page, 'descent');
    expect((await dbg(page)).last?.result).toBe('death');
    await waitScene(page, 'abyss');
    const s = await save(page);
    expect(s.best).toBe(1);
    expect(s.bones).toBe(5 + 2); // Rekrut: 5 Knochen + 2 ohne Treffer
  });

  test('Sieg über den letzten Gladiator beendet den Run', async ({ page }) => {
    await call(page, 'fight', 'champion');
    await waitPhase(page, 'play');
    await call(page, 'kill');
    await waitScene(page, 'victory');
    expect((await dbg(page)).last?.result).toBe('victory');
  });

  test('Testmodus speichert nichts und zeigt Debug-Werkzeuge', async ({ page }) => {
    await tap(page, 320, 258); // „Testmodus“
    await waitScene(page, 'abyss');
    await expect(page.locator('#dbg')).toBeVisible();
    await tap(page, 300, 62 + 10);           // Kopf
    await tap(page, 500, 62 + 3 * 44 + 20);  // Doppelschädel sofort anlegen
    expect(await page.evaluate(() => localStorage.getItem('soulstitch-save'))).toBeNull();
  });

  test('alter Spielstand (v2) wird übernommen', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('soulstitch2', JSON.stringify({ best: 4, bones: 33, own: { k2: 1 }, eq: { kopf: 'k2' } }));
    });
    await page.reload();
    await waitScene(page, 'title');
    await call(page, 'fight', 'rekrut');
    await waitPhase(page, 'play');
    await call(page, 'kill');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('soulstitch-save'))).not.toBeNull();
    const s = await save(page);
    expect(s.best).toBe(4);
    expect(s.bones).toBe(33 + 7);
    expect(s.eq.kopf).toBe('k2');
  });
});

test.describe('Steuerung', () => {
  test('Übersicht aus dem Startmenü und dem Abgrund, zurück an dieselbe Stelle', async ({ page }) => {
    await tap(page, 440, 258); // „Steuerung“
    await waitScene(page, 'help');
    await tap(page, 320, 200);
    await waitScene(page, 'title');
    await call(page, 'pile');
    await waitScene(page, 'abyss');
    await tap(page, 320, 331); // „? Steuerung“
    await waitScene(page, 'help');
    await page.keyboard.press('Escape');
    await waitScene(page, 'abyss');
  });
});

test.describe('Menüs', () => {
  test('Pause im Kampf: Weiter und Hauptmenü', async ({ page }) => {
    await call(page, 'fight', 'rekrut');
    await waitPhase(page, 'play');
    await call(page, 'place', 120, 1); // Abstand zum Gladiator
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const hp = (await dbg(page)).php;
    await page.waitForTimeout(1500); // pausiert: der Gladiator greift nicht an
    expect((await dbg(page)).php).toBe(hp);
    await tap(page, 320, 120 + 16);          // Weiter
    await call(page, 'god', true);           // zwischen Weiter und erneuter Pause darf er nicht sterben
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    await tap(page, 320, 120 + 3 * 40 + 16); // Hauptmenü
    await waitScene(page, 'title');
    expect((await dbg(page)).run).toBeNull();
  });

  test('Pause → Steuerung → zurück in den pausierten Kampf', async ({ page }) => {
    await call(page, 'fight', 'rekrut');
    await waitPhase(page, 'play');
    await tap(page, 616, 66);                // Pause-Knopf
    await tap(page, 320, 120 + 40 + 16);     // Steuerung
    await waitScene(page, 'help');
    await page.keyboard.press('Escape');
    await waitScene(page, 'fight');
    expect((await dbg(page)).name).toBe('Rekrut'); // derselbe Kampf läuft weiter
  });

  test('Abgrund: zurück zum Hauptmenü, Testmodus wird verlassen', async ({ page }) => {
    await tap(page, 320, 258);  // Testmodus
    await waitScene(page, 'abyss');
    await tap(page, 369, 331);  // „‹ Menü“
    await waitScene(page, 'title');
    await expect(page.locator('#dbg')).toBeHidden();
  });
});

test.describe('Körper und Archetypen', () => {
  /** Kampf mit einem bestimmten Körper; die Fähigkeiten bestimmt der Körper selbst (kein Debug-Zwang). */
  async function bodyDuel(page: Page, eq: Record<string, string>, attack: string, keys: [number, 'down' | 'up', string][]) {
    await call(page, 'abilities', null);
    await call(page, 'equip', eq);
    await call(page, 'sel', []);
    await call(page, 'fight', 'veteran');
    await waitPhase(page, 'play');
    await page.evaluate(({ attack, keys }) => {
      const d = (window as unknown as { __dbg: DbgApi }).__dbg;
      d.place(260, 1); d.gladAt(320); d.attack(attack);
      for (const [ms, type, code] of keys) setTimeout(() => window.dispatchEvent(new KeyboardEvent(type === 'down' ? 'keydown' : 'keyup', { code })), ms);
    }, { attack, keys });
  }
  const BLOCK = { armL: 'a4', armR: 'a4', beinL: 'l0', beinR: 'l0' }; // Schildarme (+ Läuferbeine, aber Block ist stärker gewählt)
  const JUMP = { armL: 'a0', armR: 'a0', beinL: 'l3', beinR: 'l3' };   // Froschbeine

  test('Block-Körper blockt den Hieb', async ({ page }) => {
    await call(page, 'sel', ['block']);
    await bodyDuel(page, BLOCK, 'hieb', [[0, 'down', 'KeyK'], [1100, 'up', 'KeyK']]);
    await page.waitForTimeout(1300);
    expect((await dbg(page)).phase).toBe('play');
  });

  test('Block-Körper kann nicht springen: der Fegeschlag trifft', async ({ page }) => {
    await bodyDuel(page, BLOCK, 'feger', [[460, 'down', 'Space'], [900, 'up', 'Space']]);
    await waitPhase(page, 'dead');
  });

  test('Sprung-Körper springt über den Fegeschlag', async ({ page }) => {
    await bodyDuel(page, JUMP, 'feger', [[460, 'down', 'Space'], [900, 'up', 'Space']]);
    await page.waitForTimeout(1500);
    expect((await dbg(page)).phase).toBe('play');
  });

  test('Sprung-Körper kann nicht blocken: der Hieb trifft', async ({ page }) => {
    await bodyDuel(page, JUMP, 'hieb', [[0, 'down', 'KeyK']]);
    await waitPhase(page, 'dead');
  });

  test('Fähigkeit im Abgrund wählen (Limit 1)', async ({ page }) => {
    await tap(page, 200, 258);
    for (let i = 0; i < 4; i++) await tap(page, 320, 200);
    await waitScene(page, 'abyss');
    await call(page, 'equip', { armL: 'a4', armR: 'a4' }); // Block + Ausweichen verfügbar
    await tap(page, 14 + 32, 292);  // Chip „Block“
    expect((await save(page)).sel[0]).toBe('block');
    await tap(page, 154 + 32, 292); // Chip „Dash“
    expect((await save(page)).sel[0]).toBe('dodge');
  });
});

test.describe('Nahkampf und Fähigkeiten', () => {
  test('Combo aus drei Schlägen trifft den Gladiator', async ({ page }) => {
    await call(page, 'fight', 'rekrut');
    await waitPhase(page, 'play');
    await call(page, 'god', true);
    await page.evaluate(() => {
      const d = (window as unknown as { __dbg: DbgApi }).__dbg;
      d.place(300, 1); d.gladAt(330);
      for (const ms of [0, 260, 520]) setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ' }));
        setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyJ' })), 40);
      }, ms);
    });
    await page.waitForTimeout(1300);
    expect((await dbg(page)).hp).toBe(14 - 4); // 1 + 1 + 2 Schaden
  });

  test('ohne Fähigkeit trifft der Hieb', async ({ page }) => {
    await duel(page, { abilities: [], attack: 'hieb' });
    await waitPhase(page, 'dead');
  });

  test('Blocken hält den Hieb', async ({ page }) => {
    await duel(page, { abilities: ['block'], attack: 'hieb', keys: [[0, 'down', 'KeyK'], [1100, 'up', 'KeyK']] });
    await page.waitForTimeout(1300);
    const s = await dbg(page);
    expect(s.phase).toBe('play');
    expect(s.php).toBe(1);
  });

  test('Parade kurz vor dem Treffer lässt den Gladiator taumeln', async ({ page }) => {
    await duel(page, { abilities: ['block'], attack: 'hieb', keys: [[470, 'down', 'KeyK'], [1000, 'up', 'KeyK']] });
    await expect.poll(async () => (await dbg(page)).glad?.state, { timeout: 2000 }).toBe('stagger');
    expect((await dbg(page)).php).toBe(1);
  });

  test('der Fegeschlag geht durch den Block', async ({ page }) => {
    await duel(page, { abilities: ['block'], attack: 'feger', keys: [[0, 'down', 'KeyK']] });
    await waitPhase(page, 'dead');
  });

  test('Springen über den Fegeschlag', async ({ page }) => {
    await duel(page, { abilities: ['jump'], attack: 'feger', keys: [[460, 'down', 'Space'], [900, 'up', 'Space']] });
    await page.waitForTimeout(1500);
    const s = await dbg(page);
    expect(s.phase).toBe('play');
    expect(s.php).toBe(1);
  });

  test('Ausweichen durch den Hieb', async ({ page }) => {
    await duel(page, { abilities: ['dodge'], attack: 'hieb', keys: [[480, 'down', 'ShiftLeft'], [560, 'up', 'ShiftLeft']] });
    await page.waitForTimeout(1300);
    const s = await dbg(page);
    expect(s.phase).toBe('play');
    expect(s.php).toBe(1);
  });

  test('Springen über den Sturmangriff', async ({ page }) => {
    // Sturmangriff aus der Ferne: Gladiator steht weit weg
    await call(page, 'fight', 'veteran');
    await waitPhase(page, 'play');
    await page.evaluate(() => {
      const d = (window as unknown as { __dbg: DbgApi }).__dbg;
      d.abilities(['jump']); d.place(200, 1); d.gladAt(440); d.attack('sturm');
      // Ankündigung 0,65 s, dann ~240 Einheiten bei 330/s: Sprung kurz vor dem Zusammenstoß
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })), 1020);
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })), 1500);
    });
    await page.waitForTimeout(2200);
    const s = await dbg(page);
    expect(s.phase).toBe('play');
    expect(s.php).toBe(1);
  });
});

test.describe('alte Bosse (Magie-Vorschau)', () => {
  test('alle alten Bosse laufen ohne Fehler', async ({ page }) => {
    test.setTimeout(120_000);
    await call(page, 'god', true);
    for (let n = 1; n <= 30; n++) {
      await call(page, 'fight', n);
      await page.waitForTimeout(3000); // Intro-Banner (1,7 s) + erste Angriffe
      expect((await dbg(page)).n).toBe(1);
      expect((await dbg(page)).name).not.toBe('');
    }
  });

  test('Sieg über den letzten alten Boss beendet den Run', async ({ page }) => {
    await call(page, 'fight', 30);
    await waitPhase(page, 'play');
    await call(page, 'kill');
    await waitScene(page, 'victory');
  });
});

test.describe('Handy', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  const point = async (page: Page, x: number, y: number) => {
    const box = (await page.locator('canvas').boundingBox())!;
    return { x: box.x + (x / 640) * box.width, y: box.y + (y / 360) * box.height };
  };

  test('Touch: rechts tippen schlägt zu', async ({ page }) => {
    const t = await point(page, 200, 258);
    await page.touchscreen.tap(t.x, t.y);
    await waitScene(page, 'intro');
    await call(page, 'fight', 'rekrut');
    await waitPhase(page, 'play');
    await call(page, 'god', true);
    await call(page, 'place', 300, 1);
    await call(page, 'gladAt', 330);
    const cdp = await page.context().newCDPSession(page);
    const p = await point(page, 500, 150);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] });
    await page.waitForTimeout(120);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => (await dbg(page)).hp, { timeout: 2000 }).toBeLessThan(14);
  });

  test('Touch: BLOCK-Knopf halten blockt', async ({ page }) => {
    await call(page, 'fight', 'veteran');
    await waitPhase(page, 'play');
    await call(page, 'abilities', ['block']);
    await page.waitForTimeout(100); // Knöpfe werden im nächsten Frame angelegt
    await call(page, 'place', 260, 1);
    await call(page, 'gladAt', 320);
    const cdp = await page.context().newCDPSession(page);
    const b = await point(page, 600, 250);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y, id: 2 }] });
    await call(page, 'attack', 'hieb');
    await page.waitForTimeout(1200);
    const s = await dbg(page);
    expect(s.php).toBe(1);
    expect(s.phase).toBe('play');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  });

  test('Touch: Magie-Schüsse gegen alte Bosse', async ({ page }) => {
    await call(page, 'fight', 1);
    await waitPhase(page, 'play');
    const cdp = await page.context().newCDPSession(page);
    const p = await point(page, 500, 200);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] });
    await expect.poll(async () => (await dbg(page)).pb, { timeout: 3000 }).toBeGreaterThan(0);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  });
});
