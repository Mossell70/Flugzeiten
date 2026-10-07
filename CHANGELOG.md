# Changelog

## 1.2.0 – 2026-10-07

- Neu: Dauer Start bis Landung (HH:MM) pro Flug als eigene Spalte, auch über Mitternacht UTC
- Neu: „Zeit in der Luft“ als Summe aller Flüge, während des Flugs mit live mitlaufender Flugzeit
- Textdatei enthält Dauer-Spalte und Summenzeile
- Neu: Hintergrund mit Flugplatz-Illustration (Tag- und Nachtversion), Flächen leicht durchscheinend

## 1.1.0 – 2026-10-07

- Beenden erstellt jetzt eine Textdatei (`Flugzeiten.txt`) statt einer E-Mail: Inhalt wird angezeigt, Datei kann geöffnet und gespeichert werden
- E-Mail-Versand und alle E-Mail-Adressen entfernt

## 1.0.0 – 2026-10-07

- Erste Version: Tasten für Start, T&G, Landung und Beenden mit Symbolen
- UTC-Zeiten im Format HH:MM ohne Datum, eine Zeile pro Flug (`Start - T&G - Landung`), leeres Feld ohne T&G, mehrere T&G in derselben Zeile
- Beenden öffnete eine vorausgefüllte E-Mail
- Rückgängig, Doppeltipp-Schutz, Speicherung im Browser, Offline-Betrieb und Installation als App
- Unit-Tests, Browser-Test, CI und Deployment auf GitHub Pages
