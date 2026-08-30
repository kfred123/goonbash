## Context

Der Frontend-Client verwendet Phaser für die Darstellung und `colyseus.js` für die Verbindung zu einem Colyseus-Server. Aktuell verbindet sich die Spielszene beim Start direkt mit `game_room`; der Server kennt zwar Räume, stellt aber noch keine für den Client sichtbare Lobby-Übersicht bereit.

## Goals / Non-Goals

**Goals:**

- Einen sichtbaren Multiplayer-Einstieg mit Lobby-Liste und Aktion zum Erstellen eines Spiels anbieten.
- Lobbys erstellen, anzeigen, auswählen und betreten können.
- Den Ersteller in einer Lobby warten lassen, bis weitere Spieler beitreten.
- Menü, Warteraum und Spielszene klar voneinander trennen.

**Non-Goals:**

- Authentifizierung, persistente Accounts oder Matchmaking nach Skill-Level.
- Persistente Lobby-Daten über einen Serverneustart hinaus.
- Änderungen am eigentlichen Kampf- und Bewegungsmodell.

## Decisions

- **Colyseus als Lobby- und Spieltransport:** Der bestehende `game_room` bleibt der autoritative Spielraum. Eine Lobby-ID bzw. Raum-ID wird vom Backend erzeugt und beim Beitritt an `joinById` oder eine gleichwertige Colyseus-API übergeben.
- **Serverseitige Lobby-Übersicht:** Das Backend verwaltet aktive Lobbys im Speicher und liefert eine Liste mit stabiler ID, Anzeigename, aktueller Spielerzahl und maximaler Spielerzahl. Beim Erstellen wird ein Raum als Lobby registriert; beim Verlassen oder Leeren wird er entfernt.
- **HTTP für Übersicht, WebSocket für Raum:** Ein kleiner HTTP-Endpunkt für `GET` und `POST` der Lobbys ist für die Liste und Erstellung einfacher zu testen und passt zum vorhandenen Express-Server. Der eigentliche Lobby- und Spielzustand bleibt über Colyseus/WebSocket synchronisiert.
- **Client-Zustandsmaschine:** Der Client verwendet die Zustände `menu`, `waiting` und `game`. Das Menü lädt die Liste und aktualisiert sie nach einer Aktion; der Warteraum zeigt die Spielerzahl und ermöglicht den Übergang in die Spielszene, sobald der Raum bereit ist.
- **Kompatibler Fehlerzustand:** Netzwerkfehler, volle oder nicht mehr vorhandene Lobbys werden im Menü bzw. Warteraum als sichtbarer Status angezeigt. Ein fehlender Server führt nicht zu einer leeren Phaser-Fläche ohne Erklärung.

## Risks / Trade-offs

- [Risiko] Eine In-Memory-Lobby-Liste geht bei einem Serverneustart verloren. → **Mitigation:** Für die erste Version bewusst dokumentieren; persistente Speicherung bleibt außerhalb des Scopes.
- [Risiko] Liste und Colyseus-Raum können zwischen Abruf und Beitritt veralten. → **Mitigation:** Beitritt serverseitig erneut validieren und volle bzw. geschlossene Räume mit einer verständlichen Fehlermeldung ablehnen.
- [Risiko] Zusätzliche UI-Zustände können die bisher direkt gestartete Szene regressieren. → **Mitigation:** Spielszene als bestehende, separat erreichbare Phase erhalten und den Übergang mit einem echten Create/Join-Test prüfen.

## Migration Plan

1. Gemeinsame Lobby-Daten und Backend-Verträge ergänzen.
2. Server-Lobbyverwaltung und Create/List/Join-Abläufe implementieren.
3. Client-Menü und Warteraum vor dem bestehenden Spiel-Rendering einführen.
4. Direkten automatischen Join entfernen und Create/Join aus der ausgewählten Lobby auslösen.
5. Build sowie mindestens Erstellen, Aktualisieren und Beitreten mit zwei Clients prüfen.

## Open Questions

- Soll der Ersteller einen frei wählbaren Lobby-Namen eingeben oder zunächst einen automatisch erzeugten Namen erhalten?
- Ab welcher Spielerzahl gilt eine Lobby als startbereit, oder darf der Ersteller das Spiel manuell starten?