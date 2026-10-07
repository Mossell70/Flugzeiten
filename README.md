# Flugzeiten

Web-App zum Erfassen von **Start-, Touch-and-Go- und Landezeiten in UTC** per Knopfdruck – gemacht für die Nutzung auf dem Smartphone im Cockpit. Zum Abschluss entsteht eine Textdatei mit den Zeiten, die geöffnet und gespeichert werden kann.

**Online nutzen:** https://mossell70.github.io/Flugzeiten/

## Bedienung

| Taste | Wirkung |
|---|---|
| **Start** | schreibt die aktuelle UTC-Zeit als Startzeit und beginnt eine neue Zeile |
| **T&G** | schreibt die aktuelle UTC-Zeit in das T&G-Feld der aktuellen Zeile (mehrere T&G werden mit Komma angehängt) |
| **Landung** | schreibt die aktuelle UTC-Zeit als Landezeit, berechnet die Dauer und schließt die Zeile ab |
| **Beenden** | erstellt die Textdatei `Flugzeiten.txt` und zeigt ihren Inhalt an – mit **Datei öffnen** (neuer Tab) und **Datei speichern** (Download) |

Zeiten werden im Format `HH:MM` (UTC) geschrieben, **ohne Datum**. Jeder Flug ist eine Zeile, am Ende steht die Gesamtzeit in der Luft:

```
Start - T&G - Landung - Dauer (UTC)
09:12 - 09:20, 09:27 - 09:35 - 00:23
10:00 -  - 10:39 - 00:39

Zeit in der Luft: 01:02
```

**Dauer** = Start bis Landung (`HH:MM`), auch über Mitternacht UTC. **Zeit in der Luft** = Summe aller Dauern; Flüge ohne Start- oder Landezeit zählen nicht mit.

Wird kein T&G erfasst, bleibt das Feld leer. Fehlt eine Landung (z. B. vergessen) und wird erneut **Start** gedrückt, bleibt das Landefeld der vorigen Zeile leer; **T&G** oder **Landung** ohne vorherigen Start ergeben eine Zeile mit leerem Startfeld.

Weitere Hilfen:

- **Laufende Flugzeit** – während des Flugs zeigt die App unter der Uhr „In der Luft“ seit dem Start; Tabelle und Summe zählen live mit
- **Letzten Eintrag rückgängig** – entfernt die zuletzt erfasste Zeit (z. B. nach einem Fehltipp)
- **Doppeltipp-Schutz** – ein zweiter Tipp innerhalb von 2 Sekunden wird ignoriert
- Nach **Beenden** außerdem: „Weiter aufzeichnen“ oder „Neue Aufzeichnung“ (löscht die Zeiten nach Rückfrage). Die Zeiten bleiben im Browser erhalten, bis du „Neue Aufzeichnung“ wählst.
- Ist der letzte Flug noch ohne Landung, fragt **Beenden** vorher nach.

### Auf dem Handy installieren

Seite im Browser öffnen und „Zum Home-Bildschirm“ (iPhone: Teilen-Menü in Safari) bzw. „App installieren“ (Android/Chrome) wählen. Danach startet die App wie eine normale App und funktioniert **auch ohne Netz** – auch Öffnen und Speichern der Datei.

### Datei speichern

- **Android/Chrome und Desktop:** „Datei speichern“ legt `Flugzeiten.txt` im Download-Ordner ab.
- **iPhone/iPad (Safari):** „Datei speichern“ zeigt einen Download-Hinweis; die Datei landet in der App *Dateien* unter *Downloads*. Alternativ „Datei öffnen“ und über das Teilen-Menü sichern.

## Technik

- Reines HTML, CSS und JavaScript (ES-Module), keine Build-Schritte, keine Laufzeit-Abhängigkeiten, keine externen Dienste – es werden keine Daten verschickt
- Laufende Aufzeichnung wird im Browser gespeichert (localStorage) – Neuladen oder Schließen verliert nichts
- Service Worker und Web-App-Manifest für Offline-Betrieb und Installation
- Content-Security-Policy, Daten werden ausschließlich als Text ausgegeben (kein `innerHTML`), gespeicherte Daten werden beim Laden geprüft

```
index.html             Oberfläche und Symbole
css/style.css          Gestaltung (hell/dunkel nach Systemeinstellung)
img/                   Hintergrund-Illustration Flugplatz (Tag/Nacht)
js/log.js              Zeiten in Flüge/Zeilen übersetzen, Dauern berechnen (reine Logik)
js/storage.js          Speichern und Laden der Aufzeichnung
js/config.js           Dateiname, Doppeltipp-Schutz
js/app.js              Verbindung von Oberfläche und Logik
sw.js                  Offline-Cache
manifest.webmanifest   App-Installation
icons/                 App-Symbole
tests/                 Unit-Tests (node:test) und Browser-Test (Playwright)
```

Der Dateiname lässt sich in `js/config.js` ändern. Nach Änderungen an Dateien die `VERSION` in `sw.js` erhöhen, damit installierte Apps die neue Fassung laden.

## Lokal starten und testen

Voraussetzung: Node.js ab Version 20.

```bash
npm test          # Unit-Tests
npm run check     # Syntaxprüfung
npm start         # lokaler Server auf http://localhost:8080
```

Browser-Test (benötigt Python mit Playwright und Chromium):

```bash
python3 tests/e2e.py http://localhost:8080/
```

## Deployment

Jeder Push auf `main` führt die Tests aus und veröffentlicht die App über GitHub Actions auf GitHub Pages (`.github/workflows/pages.yml`).
