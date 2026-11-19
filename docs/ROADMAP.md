# Soulstich – Roadmap

> Quelle: 7 Sprachnachrichten vom 19.11.2026 (Transkripte: `Soulstich_Transkripte.txt`).
> Die Engine ist noch nicht festgelegt, deshalb ist die Roadmap engine-neutral.

## Kurzfassung

Ein Gott, der einmal ein Mensch war, hat alle Seelen seines Reiches in sich aufgenommen. Die Bewohner sind jetzt zusammengenähte Leichen, in denen eine Seele steckt. Der Spieler ist seine erste **künstliche Seele**: Der Gott will sie durch Kämpfe zum perfekten, willenlosen Gefäß erziehen.

Die künstliche Seele sieht die **Seelenessenz**, die aus jedem genähten Körper tropft, und kann sie einsammeln. Sie ist Währung, Zahlungsmittel für Verbündete und am Ende die einzige Waffe gegen den Gott.

Gekämpft wird nur im Nahkampf, mit Körpern aus Leichenteilen. Am Anfang kann jeder Körper nur Angriff plus eine Bewegungsfähigkeit.

## Kernregeln (Gameplay)

- **Archetypen:** Blocken, Springen, Ausweichen. Am Anfang gibt es Angriff plus genau eine davon. Durch Progression werden mehrere gleichzeitig möglich.
- **Körperteile:** Größe und Gewicht bestimmen unter anderem die Lebenspunkte. Teile werden zusammengenäht.
- **Nur Nahkampf**, bis die Magie freigeschaltet ist (nach dem ersten kompletten Durchgang). Erst dann gibt es Projektile.
- **Währung:** 10 Shards = 1 Seelenessenz. Jeder Gegner lässt Währung fallen.
- **Run-Ablauf:** Kampf 1 ist immer der Vater (1 Essenz). Kampf 2–4 sind Gladiatoren (je 1 Shard). Kampf 5 gibt 2 (Einheit offen). Am Ende kommt ein Endgegner.
- **Mentoren** bringen später Grundfähigkeiten bei, die nicht vom Körper abhängen.
- **Ziel:** Jede Story-Figur soll auch eine spielerische Funktion haben.

### Figuren im Abgrund (Hub)

| Figur | Funktion | Kommt |
|---|---|---|
| Mulchi (Leichensammelwurm) | Sucht gegen Essenz Teile für einen Archetyp, später ganze Körper. Wächst mit jeder Fütterung. | Als Erstes |
| Leichengräber | Holt bereits benutzte Teile zurück, später ganze Körper | Erster Aufstieg |
| Leichenhaus | Teile einlagern, jeweils nur einmal verwendbar | Danach |
| Einbalsamierer (Idee) | Macht Teile und Körper mehrfach verwendbar | Später |
| Der Vater | Immer der erste Kampf, Comic Relief, erzählt jedes Mal etwas | Jeder Run |
| Der Magier | Erster Endgegner, danach Quest-Geber, schaltet Magie frei | Ende Akt I |
| Die vier Könige (Conduits) | Endgegner ab Akt II, Hauptziele in Akt III | Akt II |

### Story-Akte

1. **Akt I – Erwachen im Abgrund** (ca. 5–7 Durchgänge): Mulchi und der Leichengräber kommen, Aufstieg im Abgrund, der Magier ist der erste Endgegner.
2. **Akt II – Magie:** Der Magier schaltet Magie frei, die Gegner kontern mit Magie, die Könige werden Endgegner. Der Ausbruch gelingt nur halb, bis Mulchi stirbt und dich befreit.
3. **Akt III – Endgame:** Vier Conduit-Runs. Befreite Figuren verkürzen die Runs. Danach der Vater im künstlichen Körper, dann der Endkampf, und alle Seelen werden frei.

## Roadmap

Jede Phase endet mit etwas Spielbarem.

### Phase 0 – Grundgerüst
- [ ] Engine und Perspektive festlegen (2D oder 3D), Repository mit Versionsverwaltung anlegen
- [ ] Datengetrieben: Körperteile, Gegner, Figuren und Dialoge als Daten-Dateien
- [ ] Spielzustände: `Hub` → `Run` → `Kampf` → `Run-Ende` → `Hub`
- [ ] Debug-Werkzeuge: Essenz geben, Kampf überspringen, unverwundbar

**Fertig, wenn** man zwischen leeren Hub- und Arena-Szenen wechseln kann.

### Phase 1 – Kampf-Prototyp
- [ ] Spielersteuerung, Nahkampfangriff mit Trefferzonen, Schaden und Lebenspunkte
- [ ] Blocken, Springen und Ausweichen als einzelne, austauschbare **Fähigkeits-Module**
- [ ] Ein Gladiator mit einfacher KI in einer Arena
- [ ] Treffer-Feedback: Pause beim Treffer, Rückstoß, Sound-Platzhalter

**Fertig, wenn** ein Kampf gegen einen Gladiator mit jeder der drei Fähigkeiten Spaß macht.

### Phase 2 – Körper und Nähen
- [ ] Datentyp Körperteil: Platz (Kopf, Torso, Arme, Beine), Archetyp, Größe, Gewicht
- [ ] Ein Körper berechnet aus seinen Teilen Werte und Fähigkeiten
- [ ] Fähigkeits-Limit: Angriff plus N aktive Fähigkeiten, Startwert N = 1
- [ ] Einfacher Näh-Bildschirm vor dem Run

**Fertig, wenn** sich zwei verschiedene Körper spürbar anders spielen.

### Phase 3 – Run-Schleife und Währung
- [ ] Run-Ablauf: der Vater zuerst, Endgegner am Schluss
- [ ] Belohnungstabelle pro Kampf (Shards / Essenz, 10 : 1), leicht anpassbar
- [ ] Essenz-Partikel, die nur die Spielfigur sieht und einsammelt
- [ ] Tod oder Sieg → Auswertung → zurück in den Hub
- [ ] Der Magier als erster Endgegner, nur Nahkampf

**Fertig, wenn** ein kompletter Run spielbar ist und die Essenz danach gutgeschrieben wird.

### Phase 4 – Abgrund und Meta-Progression
- [ ] Speichersystem: Essenz, Freischaltungen, Story-Flags, eingelagerte Teile, Verlauf benutzter Teile
- [ ] Abgrund mit Höhenstufen, die über gesammelte Essenz freigeschaltet werden
- [ ] Mulchi, Leichengräber, Leichenhaus, Einbalsamierer
- [ ] Fähigkeits-Limit erhöhen, Mentoren für körperunabhängige Grundfähigkeiten

**Fertig, wenn** es nach jedem Run etwas Sinnvolles auszugeben gibt.

### Phase 5 – Dialoge und Story-Zustand
- [ ] Dialogsystem aus Daten, mit Bedingungen (Run-Anzahl, Abgrund-Höhe, Flags)
- [ ] Wechselnde Sprüche des Vaters zu Beginn jedes Runs
- [ ] Gefangene Figuren im Abgrund, Essenz als Bezahlung für Hilfe
- [ ] Zentrales Ereignis-System für Story-Flags

**Fertig, wenn** Akt I bis zum Gespräch mit dem Magier erzählt werden kann.

### Phase 6 – Magie (Akt II)
- [ ] Magie in Körperteile einfließen lassen, als neue Fähigkeits-Module
- [ ] Projektil-System
- [ ] Magie-Varianten der Gegner
- [ ] Die vier Könige als Endgegner
- [ ] Quest des Magiers, Wachstumsstufen von Mulchi, Zwischensequenz zum Ausbruch

**Fertig, wenn** der Ausbruch aus der Kontrolle des Gottes spielbar ist.

### Phase 7 – Endgame und Finale (Akt III)
- [ ] Höhere Schwierigkeit als globaler Modifikator
- [ ] Vier Conduit-Runs. Jeder Sieg befreit Figuren und streicht ihre Kämpfe.
- [ ] Der Vater im künstlichen Körper, der Endkampf gegen den Gott, Abspann

**Fertig, wenn** das Spiel von Anfang bis Ende durchspielbar ist.

### Phase 8 – Feinschliff
- [ ] Audio-System mit eigenem Musikplatz pro Boss
- [ ] Balancing der Essenz-Ökonomie (Einnahmen pro Run gegen Kosten)
- [ ] Benutzeroberfläche, Menüs, Einstellungen, Performance, Playtests

## Von Anfang an mitdenken

- **Fähigkeiten als Module:** Blocken, Springen, Ausweichen, Magie und Mentor-Fähigkeiten nutzen dieselbe Schnittstelle.
- **Inhalte als Daten:** Neue Teile, Gegner und Dialoge sollen ohne Code-Änderung hinzukommen.
- **Story-Flags zentral:** Run-Anzahl, Abgrund-Höhe und Akt sind die Bedingungen für fast alles.

## Offene Fragen

1. Welche Engine, und 2D oder 3D? Welche Kameraperspektive?
2. Wie viele Kämpfe hat ein Run? Ist Kampf 5 der letzte vor dem Endgegner?
3. Belohnungen: Nachricht 2 sagt „normale Gegner geben einen Shard, Hauptgegner eine ganze Essenz“. Nachricht 5 nennt eine Reihe pro Kampf. Gibt Kampf 5 zwei Shards oder zwei ganze?
4. Was bekommt man von den gefangenen Figuren?
5. Wie hoch muss man im Abgrund kommen, bevor der Magier redet? Wie viel Essenz braucht sein Plan?
6. Wo trifft man die Mentoren, und was bringen sie bei?
7. Wie ist der künstliche Körper des Vaters entstanden?
8. Musik: eigenes Thema pro Boss? Wer komponiert?
