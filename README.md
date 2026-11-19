# Soulstitch

2D-Roguelike im Knochenkolosseum: Eine künstliche Seele näht sich Körper aus Leichenteilen und kämpft sich durch die Arena.
Läuft im Browser, auf PC und Handy.

- **Spielen:** https://cozyiland.github.io/Soulstitch/ (sobald GitHub Pages eingeschaltet ist, siehe unten)
- **Roadmap:** [`docs/ROADMAP.md`](docs/ROADMAP.md)
- **Story-Quellen:** [`docs/sprachmemos/`](docs/sprachmemos/README.md), [`docs/notizen/`](docs/notizen/)

## Steuerung

| | PC | Handy (quer halten) |
|---|---|---|
| Laufen | A / D | links ziehen |
| Schlagen (3er-Combo) | J oder linke Maustaste | rechts antippen |
| Blocken (halten) | K, S oder rechte Maustaste | BLOCK halten |
| Springen | W oder Leertaste | links nach oben ziehen oder SPRUNG |
| Ausweichen | Shift oder L | DASH |

Welche Fähigkeiten du hast, bestimmt dein **Körper**: Schildarme machen einen Block-Körper, Froschbeine einen Sprung-Körper,
Läuferbeine einen Ausweich-Körper. Am Anfang ist nur **eine** Fähigkeit gleichzeitig aktiv – im Leichenhaufen wählst du sie
über die Chips links unten (oder Taste 1–3). Große Teile geben Herzen, schwere machen langsamer.

Gelb angekündigte Angriffe („!“) lassen sich blocken, rot angekündigte („!!“) nicht – dann springen oder ausweichen.
Wer den Block kurz vor dem Treffer hebt, pariert: Der Gegner taumelt.

Im Startmenü gibt es den **Testmodus**: alle Teile frei, Start-Kampf frei wählbar (auch die alten Schuss-Bosse als
Magie-Vorschau), Debug-Werkzeuge (🛠 unten links) mit Fähigkeiten-Umschalter, nichts wird gespeichert.
Die Debug-Werkzeuge lassen sich auch im normalen Spiel mit `?debug` hinter der Adresse einblenden.

## Entwickeln

Voraussetzung: Node.js 22.18 oder neuer.

```bash
npm install          # einmalig
npm run dev          # Entwicklungsserver mit automatischem Neuladen
npm run check        # alles prüfen: Typen, Unit-Tests, Build, Browser-Tests
```

Einzeln: `npm run typecheck`, `npm test` (Logik, ohne Browser), `npm run build` (nach `dist/`), `npm run test:e2e` (Playwright).
Vor dem ersten Browser-Test einmal `npx playwright install chromium` ausführen.

### Aufbau

```
src/
  data/       Inhalte als JSON: Körperteile, Gladiatoren, Kampf-Reihenfolge, alte Bosse, Balance-Werte, Texte
  core/       Canvas, Eingabe, Ton, Vollbild, gemeinsamer Zustand
  render/     Zeichnen: Figur, Boss-Formen, Hintergründe, Seele
  game/       Spiellogik: Szenen, Run, Kampf, Spielfigur, Fähigkeiten, Gladiator, alte Bosse, Werte, Speicherstand
  scenes/     Titel, Intro, Abgrund (Körper wählen), Sieg
  debug.ts    Debug-Panel und window.__dbg für Tests
test/unit/    Tests der Logik (node --test)
test/e2e/     Tests im Browser (Playwright)
```

**Szenen:** `title → intro → abyss → possess → fight → … → descent → abyss` (bzw. `victory → abyss` nach dem letzten Boss).
Jeder Szenenwechsel läuft über `go()` in `src/game/scenes.ts`, ein Run wird in `src/game/run.ts` verwaltet.

**Inhalte ändern:** Neue Teile, Bosse oder Texte kommen in die JSON-Dateien in `src/data/`. Die Unit-Tests prüfen,
ob Formen, Bewegungen und Angriffe der Bosse gültig sind.

**Speicherstand:** liegt im Browser unter `soulstitch-save` mit Versionsnummer. Ältere Stände der Prototypen werden
beim Laden automatisch übernommen (`src/game/save.ts`).

## Veröffentlichen

Jeder Push auf `main` baut das Spiel und stellt es auf GitHub Pages bereit (`.github/workflows/pages.yml`).
Einmalig nötig: im Repository unter **Settings → Pages → Build and deployment → Source** „**GitHub Actions**“ wählen.

Bei jedem Push laufen außerdem alle Tests (`.github/workflows/ci.yml`).
