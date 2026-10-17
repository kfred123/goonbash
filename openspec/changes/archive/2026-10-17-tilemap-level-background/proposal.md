# Proposal

## Why

Die Spielarena hat aktuell keinen visuellen Hintergrund — Spieler, Minions und Basen schweben über einem schwarzen Nichts. Im Ordner `assets/textures/` liegen bereits kachelbare Texturen (Gras, Kopfsteinpflaster), die nie eingebunden wurden. Durch eine Tilemap-basierte Leveldarstellung bekommt die Arena einen visuell ansprechenden Boden und Struktur, die das Spielerlebnis deutlich aufwertet.

## What Changes

- Einführung eines Tilemap-Systems im Phaser-Frontend, das die Arena (2400×1800) mit den vorhandenen kachelbaren Texturen (Gras, Kopfsteinpflaster) als Bodenfläche rendert
- Definition einer Tilemap-Datenstruktur (JSON), die festlegt, welche Tile-Typen an welchen Positionen liegen
- Laden der vorhandenen Textur-Assets (`grass_texture.jpg`, `cobblestone_texture.jpg`) in der `preload()`-Phase der GameScene
- Rendering der Tilemap als unterste Ebene (depth 0) in der Arena, unter allen Spielobjekten
- Die Tilemap wird rein clientseitig gerendert — der Backend-Gameloop bleibt unverändert

## Capabilities

### New Capabilities
- `tilemap-rendering`: Tilemap-basierte Darstellung des Arena-Hintergrunds mit kachelbaren Texturen

### Modified Capabilities
- `game-frontend`: Das Frontend erhält eine visuelle Bodenebene über das Tilemap-System, die das bestehende Requirement "Render Game World" um eine Map-Darstellung erweitert

## Impact

- **Frontend**: `GameScene.ts` — `preload()` muss Assets laden, `create()` bzw. Arena-Start muss die Tilemap rendern
- **Assets**: Die vorhandenen Dateien `assets/textures/grass_texture.jpg` und `assets/textures/cobblestone_texture.jpg` müssen ins Frontend-Build eingebunden werden (Kopie nach `frontend/public/` oder Import-Pfad)
- **Neue Datei**: Eine Tilemap-JSON-Definition für das Arena-Layout
- **Backend**: Keine Änderungen — die Tilemap ist rein visuell/clientseitig
- **Performance**: Tilemap-Rendering in Phaser ist hochoptimiert (GPU-beschleunigt), sollte keine merkliche Auswirkung haben
