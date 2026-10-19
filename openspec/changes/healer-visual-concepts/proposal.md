# Proposal

## Why

Der Healer erscheint bisher als einfacher Kreis. Nach dem Vergleich dreier Entwuerfe hat der Nutzer den Werkstatt-Sanitaeter fuer die direkte Integration in Spiel und Lobby ausgewaehlt.

## What Changes

- Den Healer in Spiel und Lobby als runden Comic-Reparaturpanzer mit kurzen Ketten, Werkzeugdeckel, Werkzeugboxen und Reparaturduese rendern.
- Teamfarben und die bisherige Auswahlmarkierung beibehalten; kleine Lobbydarstellungen vereinfachen.
- Rein dekorative, unabhaengige Heal-Aura- und Speed-Effekte anhand der vorhandenen aktiven Faehigkeiten anzeigen.
- Kamerafolge, Positionsinterpolation, Tod/Respawn und Aufraeumen der Figur erhalten.
- Keine Spielwerte, Trefferbereiche, Faehigkeitsregeln oder anderen Klassen aendern.

## Capabilities

### New Capabilities

Keine.

### Modified Capabilities

- `role-visual-distinction`: Teamfarbe von der formbasierten Rollenidentitaet trennen; Werkstatt-Sanitaeter und seine dekorativen Faehigkeitseffekte in Spiel und Lobby festlegen.

## Impact

- Frontend-Rendering, zugehoerige Tests und diese Change-Artefakte. Keine neuen Abhaengigkeiten, Netzwerkfelder oder Backend-Aenderungen.
- Die bisher widerspruechliche Rollenfarben-Anforderung wird fuer die betroffene Darstellung an die bereits verwendeten Teamfarben angepasst; Rollen werden durch Form und Details unterschieden.
