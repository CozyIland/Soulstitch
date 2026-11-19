# Soulstitch – Roadmap

> **Stand:** 19.11.2026 · **2D**, Seitenansicht
> **Quellen:** die 7 Sprachnachrichten ([`sprachmemos/`](sprachmemos/README.md)), die Lore-Notiz ([`notizen/`](notizen/2026-11-19_lore-seelen-und-transzendenz-des-gottes.md)) und der spielbare Prototyp `soulstitch.html`.
> Die vorige, technikunabhängige Fassung steht in der Git-Historie (Commit `4161ca5`).

---

## 1. Worum es geht

**Die Welt.** Eine Seele braucht einen Körper. Ohne Körper verliert sie langsam ihre **Seelenessenz** und vergeht nach einigen Tagen endgültig. Geübte Wanderer halten das höchstens ein paar Stunden bis zwei Tage durch, danach geht zu viel verloren. In einem Körper kann sich eine Seele bis zu einem gewissen Grad erholen. Das gilt als Naturgesetz. Lebende Wesen können die Essenz nicht sehen, auch der Gott nicht.

**Der Gott.** Er war ein Mensch, der Sohn des alten Gott-Imperators. In Experimenten fand er zwei Dinge heraus:
- Kombinierte Seelen halten außerhalb eines Körpers länger durch, aber nicht ewig. Sie müssen dafür zeitweise in einen Körper zurück.
- Eine Seele kann eine andere vollständig beherrschen, wenn sie mit einer Seele verschmolzen ist, die ihren Charakter schon fast verloren hat.

Er manipulierte die Anführer der vier Königreiche, mit ihm seinen Vater zu stürzen. Danach nahm er alle Seelen des Reiches in sich auf, ähnlich wie in Fullmetal Alchemist. Die vier Anführer richtete er als **Conduits** ein, als Körper, durch die die Seelen zirkulieren. Seitdem existiert er körperlos und kann unbegrenzt viele Seelen aufnehmen und beherrschen. Alle Bewohner sind zusammengenähte Leichen mit einer Seele darin, die meisten ohne Erinnerung. Ein paar hält er bei Erinnerung, weil er an ihnen hängt. Das sind die Figuren, mit denen man reden kann.

**Du.** Der Spieler ist die erste **künstliche Seele**. Schon im allerersten Run sagt der Vater: *„He actually did it.“* Der Gott will sie durch Kämpfe zum perfekten Gefäß ohne eigenen Charakter erziehen, das ohne Körper existieren und trotzdem Körper steuern kann. Weil sie nicht menschlich ist, sieht sie die Essenz, die aus jedem genähten Körper tropft, und kann sie einsammeln. Das hat der Gott nicht einkalkuliert. Die Essenz ist:
- Währung,
- Bezahlung für Verbündete: Je mehr Essenz ein Untoter bekommt, desto unabhängiger wird er vom Gott,
- am Ende die einzige Waffe gegen den Gott.

---

## 2. Kernregeln

| Bereich | Regel |
|---|---|
| **Kampf** | Nur Nahkampf, bis die Magie freigeschaltet ist (Akt II). Erst dann gibt es Projektile. |
| **Archetypen** | Blocken, Springen, Ausweichen. Am Anfang Angriff plus genau eine davon. Durch Fortschritt werden mehrere gleichzeitig möglich. |
| **Körper** | Die Körperteile bestimmen die Fähigkeiten. Größe und Gewicht bestimmen Lebenspunkte und Tempo. |
| **Mentoren** | Bringen später Grundfähigkeiten bei, die nicht vom Körper abhängen. |
| **Währung** | 10 Shards = 1 Seelenessenz. Jeder Gegner lässt Essenz fallen, die nur du siehst. |
| **Run** | Kampf 1 ist immer der Vater, danach Gladiatoren, am Schluss ein Endgegner. |
| **Hub** | Der Abgrund unter dem Kolosseum. Mit Essenz steigst du Stufe für Stufe nach oben und triffst neue Figuren. |
| **Figuren** | Jede Story-Figur hat auch eine spielerische Funktion. |

### Figuren im Abgrund

| Figur | Funktion | Ab |
|---|---|---|
| **Mulchi** (Leichensammelwurm) | Sucht gegen Essenz Teile für einen Archetyp, später ganze Körper. Wächst sichtbar mit jeder Fütterung. | Start |
| **Leichengräber** | Holt schon benutzte Teile zurück, später ganze Körper. | 1. Aufstieg |
| **Leichenhaus** | Teile einlagern, jeweils nur einmal verwendbar. | danach |
| **Einbalsamierer** | Macht Teile oder ganze Körper mehrfach verwendbar. | später |
| **Gefangene** | Kämpfen im Run gegen dich, reden im Abgrund mit dir. Essenz ist der Preis für ihre Hilfe. | laufend |
| **Der Vater** | Immer der erste Kampf, Comic Relief, sagt jedes Mal etwas. | jeder Run |
| **Der Magier** | Erster Endgegner, danach Quest-Geber, schaltet die Magie frei. | Ende Akt I |
| **Die vier Könige** | Endgegner in Akt II, Hauptziele in Akt III. | Akt II |

### Story in drei Akten

1. **Akt I – Erwachen im Abgrund** (etwa 5–7 Runs): Mulchi und der Leichengräber kommen dazu, der Aufstieg im Abgrund beginnt, der Magier ist der Endgegner.
2. **Akt II – Magie:** Der Magier zeigt dir die Magie. Der Gott kontert, indem auch die Gegner Magie bekommen. Die Könige werden Endgegner. Der Ausbruch aus der Kontrolle des Gottes gelingt nur halb, bis Mulchi riesig aus dem Boden bricht, vom Gott getötet wird und dich mit der frei werdenden Energie befreit.
3. **Akt III – Endgame:** Vier Runs gegen die Conduits, der Gott macht alle Gegner härter. Jeder zerstörte Conduit gibt mehr Energie und befreit Figuren, deren Kämpfe dann wegfallen. Danach kommt der Vater in seinem künstlichen Körper, dann der Endkampf gegen den Gott. Am Ende finden alle Seelen Frieden, auch du.

---

## 3. Technik

**Empfehlung: im Browser bleiben, aber als richtiges Projekt statt als eine einzige Datei.**

- **Spielbar per Link:** Das Spiel läuft auf PC und Handy ohne Installation, und das funktioniert heute schon.
- **Testbar ohne dich:** Claude kann im Browser jede Änderung selbst automatisch testen und Bildschirmfotos machen.
- **Nichts geht verloren:** Grafik, Todessequenz, Leichenhaufen und Touch-Steuerung lassen sich direkt weiterverwenden.
- **Aufbau:** TypeScript und Vite, eigener 2D-Canvas-Renderer wie bisher. Inhalte wie Teile, Gegner, Dialoge und Belohnungen kommen in JSON-Dateien. So können auch Leute ohne Programmierkenntnisse Inhalte ändern.
- **Veröffentlichen:** über GitHub Pages, ein fester öffentlicher Link mit echtem Vollbild auf Android und Installation auf dem iPhone-Homebildschirm.

Die Alternative wäre Godot: ein guter visueller Editor, aber Claude kann dort nicht selbst testen, und der Prototyp müsste komplett neu gebaut werden. → **Entscheidung 1** bei den offenen Fragen.

---

## 4. Was wird aus dem Prototyp?

| Bleibt | Wird umgebaut | Fällt weg oder wird verschoben |
|---|---|---|
| Grafikstil, Arena, Gruft, Seelen-Geist | Schießen → **Nahkampf** (Projektil-Code wird in Akt II zur Magie) | 30 feste Bosse → Run aus Vater, Gladiatoren und Endgegner |
| Todessequenz: Seele steigt auf, YOU DIED, Abstieg, Körper wählen, Inbesitznahme | 15 Teile mit Boni → **Archetypen und Größe/Gewicht** | Knochen als Währung → **Shards und Essenz** |
| Leichenhaufen als Ort, an dem man einen Körper wählt | Leichenhaufen → **Abgrund-Hub** mit Figuren und Stufen | |
| Touch-Steuerung, Vollbild, Testmodus | Boss-Angriffsmuster → Nahkampf-Gegner mit Telegraphen | |

---

## 5. Roadmap

Jede Phase endet mit etwas Spielbarem. Die Story-Arbeit läuft parallel dazu (Abschnitt 6).

### Phase 0 – Fundament
- [x] Projekt umziehen: Module statt einer Datei, TypeScript, Vite, automatische Tests im Browser
- [x] Inhalte als Daten: Körperteile, Gegner, Belohnungen, Balance-Werte, Texte (`src/data/`). Run-Aufbau und Dialoge kommen mit Phase 3 und 5 dazu.
- [x] Spielzustände: `Abgrund` → `Run` → `Kampf` → `Run-Ende` → `Abgrund`
- [x] Speicherstand mit Versionsnummer, damit alte Spielstände nach Updates weiter funktionieren
- [x] Debug-Werkzeuge aus dem Testmodus ausbauen: Knochen geben, Kampf gewinnen, unverwundbar, sterben, zum Abgrund. „Akt wählen“ folgt, sobald es Akte gibt.
- [ ] Öffentlicher Link über GitHub Pages: Workflow ist fertig, Pages muss einmal in den Repo-Einstellungen eingeschaltet werden

**Fertig, wenn** der heutige Prototyp im neuen Projekt läuft und per Link spielbar ist.

### Phase 1 – Nahkampf
- [x] Angriff mit Trefferzonen, Combo aus 3 Schlägen (dritter schwer, mit Rückstoß), Luftangriff, Eingabepuffer
- [x] **Blocken, Springen, Ausweichen** als einzelne, austauschbare Fähigkeits-Module (`src/game/abilities.ts`), dazu eine Parade: Block kurz vor dem Treffer lässt den Gegner taumeln
- [x] Treffer-Feedback: Hitstop, Rückstoß, Aufblitzen, Funken, Bildschirmwackeln, Sound-Platzhalter
- [x] Gladiator mit KI und klar angekündigten Angriffen: Hieb (blockbar), Fegeschlag (nicht blockbar), Sturmangriff. Drei Stufen als Daten: Rekrut, Veteran, Champion (`src/data/gladiators.json`)
- [x] Touch-Steuerung: rechts tippen = schlagen, Knöpfe für die aktiven Fähigkeiten

**Fertig, wenn** ein Kampf gegen einen Gladiator mit jeder der drei Fähigkeiten Spaß macht.
Die Tests zeigen: jede Fähigkeit allein reicht gegen zwei der drei Angriffe, der dritte lässt sich mit Abstand umgehen.
Ob es Spaß macht, entscheidet das Spielen: Im Testmodus lassen sich die Fähigkeiten im Debug-Panel einzeln einschalten.

Die alten 30 Schuss-Bosse bleiben im Testmodus als Vorschau auf die Magie (Akt II) spielbar.

### Phase 2 – Körper und Archetypen
- [ ] Körperteil-Daten: Platz, Archetyp-Fähigkeit, Größe, Gewicht
- [ ] Ein Körper berechnet aus seinen Teilen Werte und Fähigkeiten: Gewicht → Lebenspunkte und Tempo
- [ ] **Fähigkeits-Limit:** Angriff plus N Fähigkeiten, am Anfang N = 1
- [ ] Körperwahl im Leichenhaufen auf Archetypen umbauen, die bestehende Szene wird weiterverwendet

**Fertig, wenn** sich ein Block-Körper und ein Sprung-Körper spürbar anders spielen.

### Phase 3 – Run und Währung
- [ ] Run-Ablauf: **Vater** → Gladiatoren → Endgegner
- [ ] Der Vater als Comic-Relief-Kampf, im allerersten Run mit *„He actually did it“*
- [ ] Belohnungstabelle pro Kampf: Shards und Essenz im Verhältnis 10 : 1, leicht anpassbar
- [ ] **Essenz-Tropfen**, die nur die Seele sieht und einsammelt
- [ ] **Der Magier** als erster Endgegner, nur Nahkampf
- [ ] Run-Ende mit Auswertung, Todessequenz, zurück in den Abgrund

**Fertig, wenn** ein kompletter Run spielbar ist und die Essenz danach gutgeschrieben wird.

### Phase 4 – Abgrund und Fortschritt
- [ ] Der Abgrund als begehbarer Hub mit Höhenstufen, die mit Essenz freigeschaltet werden
- [ ] **Mulchi:** füttern, Teile für einen Archetyp suchen lassen, sichtbares Wachstum
- [ ] **Leichengräber:** benutzte Teile zurückholen, später ganze Körper
- [ ] **Leichenhaus:** Teile einlagern, einmal verwendbar; später **Einbalsamierer** für mehrfach verwendbare Teile
- [ ] Fähigkeits-Limit erhöhen, **Mentoren** für körperunabhängige Fähigkeiten

**Fertig, wenn** es nach jedem Run etwas Sinnvolles zu kaufen gibt.

### Phase 5 – Dialoge und Story-Zustand
- [ ] Dialogsystem aus Daten, mit Bedingungen wie Run-Anzahl, Abgrund-Höhe und Story-Flags
- [ ] Wechselnde Sprüche des Vaters zu Beginn jedes Runs
- [ ] Gefangene im Abgrund, die gegen Essenz helfen
- [ ] Zentrale Story-Flags: Run-Anzahl, Abgrund-Höhe, Akt

**Fertig, wenn** Akt I bis zum Gespräch mit dem Magier erzählt wird.

> ### ★ Meilenstein: Akt I als spielbare Demo
> Komplett spielbar vom ersten Erwachen bis zum Magier. Damit lässt sich das Spiel Mitstreitern, Musikern und Testspielern zeigen.

### Phase 6 – Akt II: Magie
- [ ] Magie in Körperteile einfließen lassen, als neue Fähigkeits-Module
- [ ] Projektile, aufbauend auf dem Schuss-Code aus dem Prototyp
- [ ] Magie-Varianten aller Gegner
- [ ] Die vier Könige als Endgegner
- [ ] Quest des Magiers, Wachstumsstufen von Mulchi, Zwischensequenz zum Ausbruch und zu Mulchis Tod

**Fertig, wenn** der Ausbruch aus der Kontrolle des Gottes spielbar ist.

### Phase 7 – Akt III: Endgame und Finale
- [ ] Höhere Schwierigkeit als Modifikator für alle Gegner
- [ ] Vier Conduit-Runs; jeder Sieg befreit Figuren und streicht ihre Kämpfe
- [ ] Der Vater im künstlichen Körper
- [ ] Endkampf gegen den körperlosen Gott, Abspann

**Fertig, wenn** das Spiel von Anfang bis Ende durchspielbar ist.

### Phase 8 – Musik und Klang
- [ ] Audio-System mit Musik-Platz pro Kampf, Überblendungen, Lautstärke-Einstellungen
- [ ] Ein eigenes Thema pro Boss, eine eigene Stimmung für den Abgrund
- [ ] Soundeffekte statt Platzhalter-Pieptönen

**Zur Frage aus Nachricht 7:** Claude kann das Audio-System bauen und Platzhalter-Klänge im Code erzeugen, aber keine fertigen Musikstücke komponieren. Für die Musik lohnt sich ein Musiker. Sinnvoll ist es, ihn spätestens zum Akt-I-Meilenstein dazuzuholen.

### Phase 9 – Feinschliff
- [ ] Balancing der Essenz-Wirtschaft: Einnahmen pro Run gegen Kosten
- [ ] Menüs, Einstellungen, Tastenbelegung, Barrierefreiheit
- [ ] Leistung auf älteren Handys
- [ ] Playtests

---

## 6. Parallel: Story und Inhalte

Diese Arbeit kann laufen, während programmiert wird. Sie liefert die Daten für die Phasen.

| Was | Gebraucht ab |
|---|---|
| Gladiatoren für Akt I: Namen, Aussehen, Angriffe | Phase 1 und 3 |
| Sprüche des Vaters, mindestens ein paar pro Run | Phase 3 |
| Der Magier: Kampf und Gespräche | Phase 3 und 5 |
| Gefangene im Abgrund: wer, was sie wollen, was sie geben | Phase 5 |
| Mentoren: wer und was sie beibringen | Phase 4 |
| Die vier Könige: Persönlichkeit, Reich, Kampf | Phase 6 |
| Der künstliche Körper des Vaters | Phase 7 |
| Musikalische Richtung | ab dem Meilenstein |

---

## 7. Von Anfang an mitdenken

- **Fähigkeiten als Module:** Blocken, Springen, Ausweichen, Magie und Mentor-Fähigkeiten haben dieselbe Schnittstelle.
- **Inhalte als Daten:** Neue Teile, Gegner und Dialoge kommen ohne Code-Änderung dazu.
- **Story-Flags zentral:** Run-Anzahl, Abgrund-Höhe und Akt sind die Bedingungen für fast alles.
- **Lore als Regel nutzen:** Dass eine Seele ohne Körper Essenz verliert, kann eine Spielregel werden, siehe Frage 10.

---

## 8. Offene Fragen

1. **Technik:** Im Browser bleiben (empfohlen) oder Godot?
2. Wie viele Kämpfe hat ein Run? Ist Kampf 5 der letzte vor dem Endgegner?
3. **Belohnungen:** Nachricht 2 sagt „normale Gegner geben einen Shard, Hauptgegner eine ganze Essenz“. Nachricht 5 nennt eine Reihe pro Kampf. Gibt Kampf 5 zwei Shards oder zwei ganze Essenzen?
4. Was bekommt man von den Gefangenen?
5. Wie hoch muss man im Abgrund kommen, bevor der Magier redet? Wie viel Essenz braucht sein Plan?
6. Wo trifft man die Mentoren, und was bringen sie bei?
7. Wie ist der künstliche Körper des Vaters entstanden?
8. **Musik:** eigenes Thema pro Boss? Wer komponiert?
9. **Endkampf:** Wie sieht ein Kampf gegen einen körperlosen Gott aus? Gegen die verschmolzenen Seelen, gegen einen letzten Körper, den er besetzt?
10. **Essenz-Verlust als Regel:** Soll die Seele im Abgrund ohne Körper eine Zeitgrenze haben, die sich mit Fortschritt verlängert, wie bei geübten Wanderern?
11. **Name:** Soulstitch oder Soulstich?
