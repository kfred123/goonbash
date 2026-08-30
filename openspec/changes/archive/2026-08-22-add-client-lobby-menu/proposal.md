## Why

Der aktuelle Client zeigt direkt die Spielszene und bietet keine Möglichkeit, gezielt eine Partie zu erstellen oder einer vorhandenen Partie beizutreten. Ein Lobby-Menü schafft einen verständlichen Einstieg in den Multiplayer-Modus und macht bestehende Spiele für Spieler sichtbar.

## What Changes

- Ein Hauptmenü mit einer Liste verfügbarer Lobbys und einem Button zum Erstellen eines Spiels ergänzen.
- Eine neue Lobby beim Erstellen eines Spiels anlegen und den Ersteller dort auf weitere Spieler warten lassen.
- Das Beitreten zu einer ausgewählten bestehenden Lobby ermöglichen.
- Backend-Endpunkte bzw. Room-Metadaten bereitstellen, damit verfügbare Lobbys aufgelistet, erstellt und betreten werden können.
- Den Übergang vom Menü zur Lobby und anschließend zur Spielszene im Client abbilden.

## Capabilities

### New Capabilities
- `client-lobby-menu`: Bietet dem Spieler eine Lobby-Übersicht sowie Aktionen zum Erstellen und Beitreten eines Spiels.

### Modified Capabilities
- `online-lobby-system`: Erweitert die Multiplayer-Infrastruktur um die vom Client benötigte Lobby-Auflistung sowie Erstellungs- und Beitrittsabläufe.

## Impact

- `frontend/src/GameScene.ts` und der Client-Einstieg benötigen Menü-, Lobby- und Navigationszustände.
- `backend/src/rooms/GameRoom.ts` sowie die Server-Registrierung müssen Lobby-Informationen und Beitrittsabläufe unterstützen.
- `shared/src/state/` kann um gemeinsame Lobby-Datenmodelle oder Statuswerte erweitert werden.
- Der bisher direkte Client-Join wird durch einen vom Spieler ausgelösten Erstellen- oder Beitreten-Ablauf ergänzt.