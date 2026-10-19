# Tasks

Der Nutzer hat den Werkstatt-Sanitaeter fuer Spiel und Lobby ausgewaehlt. Diese Aufgaben ersetzen die urspruenglichen Vergleichsblatt-Aufgaben.

## 1. Gemeinsame Healer-Zeichnung

- [x] 1.1 Gemeinsame Zeichenfunktion fuer runden Teamrumpf, Ketten, Werkzeugdeckel, Schraubenschluessel und Duese erstellen; Tests pruefen beide Teamfarben und die vereinfachte 20-Einheiten-Variante.
- [x] 1.2 Unabhaengige Heilungs- und Speed-Dekoration zeichnen; Tests pruefen Ruhe, einzelne und gleichzeitige Aktivierung sowie Ablauf und Todeszustand.

## 2. Integration und Lebenszyklus

- [x] 2.1 Healer-Container in Spiel und Lobby integrieren und Auswahlrand erhalten; Frontend-Build sowie Renderer-Integrationstests pruefen Positionierung, Skalierung und unveraenderte andere Rollen.
- [x] 2.2 Effekte an aktive replizierte Faehigkeiten binden und bei Tod ausblenden; Integrationstests pruefen Kamerafolge, Tod/Respawn, Entfernen und rekursives Aufraeumen der Container.
- [x] 2.3 Die neue Healer-Optik und rein dekorative Effekte im Readme dokumentieren; Dokumentation mit der implementierten Darstellung abgleichen.

## 3. Integration pruefen

- [x] 3.1 Frontend-Tests, Frontend-Build und `openspec validate healer-visual-concepts --strict` ausfuehren; im Diff unveraenderte Backend-Regeln und Spielwerte bestaetigen.
